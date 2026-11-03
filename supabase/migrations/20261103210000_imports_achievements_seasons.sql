-- Phase B: server-side ratings, 1-click arena imports, resync, standings, seasons, achievements, admin stats.
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Inside SECURITY DEFINER functions current_user is the owner, but the `role` setting still
-- holds the API caller's role (anon/authenticated). Service role, cron and the SQL editor pass.
create or replace function public.require_staff()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if coalesce(current_setting('role', true), 'none') in ('anon', 'authenticated') and not public.is_staff() then
    raise exception 'Only arbiters and admins can do this.' using errcode = '42501';
  end if;
end $$;

create or replace function public.require_admin()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if coalesce(current_setting('role', true), 'none') in ('anon', 'authenticated') and not public.is_admin() then
    raise exception 'Only admins can do this.' using errcode = '42501';
  end if;
end $$;

create or replace function public.title_for_rating(p_rating int)
returns public.fca_title language sql immutable as $$
  select (case
    when p_rating >= 2200 then 'FGM'
    when p_rating >= 2000 then 'FIM'
    when p_rating >= 1800 then 'FM'
    when p_rating >= 1600 then 'FCM'
    else 'NONE'
  end)::public.fca_title;
$$;

create or replace function public.title_rank(p_title public.fca_title)
returns int language sql immutable as $$
  select case p_title when 'FCM' then 1 when 'FM' then 2 when 'FIM' then 3 when 'FGM' then 4 when 'FET' then 5 else 0 end;
$$;

-- ---------------------------------------------------------------------------
-- Columns & indexes
-- ---------------------------------------------------------------------------

alter table public.games add column if not exists played_at_exact boolean not null default false;

-- Handles were stored with stray spaces (e.g. 'bona-8 '), which breaks matching against Lichess.
create or replace function public.normalize_profile_handles()
returns trigger language plpgsql set search_path = public as $$
begin
  new.lichess_username := nullif(btrim(new.lichess_username), '');
  new.chesscom_username := nullif(btrim(new.chesscom_username), '');
  new.full_name := btrim(new.full_name);
  return new;
end $$;

drop trigger if exists normalize_profile_handles_trg on public.profiles;
create trigger normalize_profile_handles_trg
  before insert or update on public.profiles
  for each row execute function public.normalize_profile_handles();

update public.profiles
   set lichess_username = nullif(btrim(lichess_username), '')
 where lichess_username is distinct from nullif(btrim(lichess_username), '');
update public.profiles
   set chesscom_username = nullif(btrim(chesscom_username), '')
 where chesscom_username is distinct from nullif(btrim(chesscom_username), '');

create unique index if not exists profiles_lichess_lower_key on public.profiles (lower(lichess_username)) where lichess_username is not null;
create unique index if not exists profiles_chesscom_lower_key on public.profiles (lower(chesscom_username)) where chesscom_username is not null;
create index if not exists profiles_invited_by_idx on public.profiles (invited_by);
create index if not exists tournaments_start_date_idx on public.tournaments (start_date);
alter table public.tournaments add column if not exists results_synced_at timestamptz;

-- ---------------------------------------------------------------------------
-- Settings (public read, admin write) and internal sync state (service only)
-- ---------------------------------------------------------------------------

create table if not exists public.app_settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists "Settings are public" on public.app_settings;
create policy "Settings are public" on public.app_settings for select using (true);
drop policy if exists "Admins manage settings" on public.app_settings;
create policy "Admins manage settings" on public.app_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- lichess_creators: accounts whose arenas are FCA events. discovery_since: older arenas are never auto-staged.
insert into public.app_settings (key, value) values
  ('lichess_creators', '["bona-8"]'::jsonb),
  ('arena_name_filter', '"FCA"'::jsonb),
  ('discovery_since', '"2026-10-28"'::jsonb),
  ('whatsapp_group_url', 'null'::jsonb)
on conflict (key) do nothing;

create table if not exists public.sync_state (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);
alter table public.sync_state enable row level security;

-- ---------------------------------------------------------------------------
-- Seasons
-- ---------------------------------------------------------------------------

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at date not null,
  ends_at date not null,
  points_scheme int[] not null default '{25,18,15,12,10,8,6,4,2,1}',
  participation_points int not null default 1,
  created_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);
alter table public.seasons enable row level security;
drop policy if exists "Seasons are public" on public.seasons;
create policy "Seasons are public" on public.seasons for select using (true);
drop policy if exists "Admins manage seasons" on public.seasons;
create policy "Admins manage seasons" on public.seasons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.seasons (name, starts_at, ends_at)
select 'Season 1 · 2026', date '2026-07-25', date '2026-12-31'
 where not exists (select 1 from public.seasons);

-- ---------------------------------------------------------------------------
-- Lichess arena standings (every participant, members or not)
-- ---------------------------------------------------------------------------

create table if not exists public.tournament_results (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  lichess_username text not null,
  rank int not null,
  score int not null default 0,
  rating int,
  performance int,
  games int not null default 0,
  wins int not null default 0,
  primary key (tournament_id, lichess_username)
);
create index if not exists tournament_results_user_idx on public.tournament_results (lower(lichess_username));
alter table public.tournament_results enable row level security;
drop policy if exists "Results are public" on public.tournament_results;
create policy "Results are public" on public.tournament_results for select using (true);

drop view if exists public.tournament_summary;
drop view if exists public.tournament_standings;
create view public.tournament_standings with (security_invoker = true) as
select r.tournament_id, t.title as tournament_title, t.start_date as tournament_date, t.mode as tournament_mode,
       r.rank, r.lichess_username, r.score, r.rating, r.performance, r.games, r.wins,
       p.id as player_id, p.full_name, p.avatar_url, p.earned_title, p.department,
       case when p.id is not null and r.games > 0
            then row_number() over (partition by r.tournament_id, (p.id is not null and r.games > 0) order by r.rank)
       end as fca_rank
  from public.tournament_results r
  join public.tournaments t on t.id = r.tournament_id
  left join public.profiles p on lower(p.lichess_username) = lower(r.lichess_username) and not p.is_immortal;

-- One row per event for lists: counts + winners without shipping every game to the browser.
create view public.tournament_summary with (security_invoker = true) as
select t.id, t.title, t.mode, t.time_control, t.start_date, t.ends_at, t.location, t.is_online, t.description,
       t.status, t.lichess_arena_id, t.lichess_status, t.nb_players, t.rating_cap,
       (select count(*) from public.games g where g.tournament_id = t.id and g.is_official is not false)::int as rated_games,
       (select count(*) from public.tournament_results r where r.tournament_id = t.id and r.games > 0)::int as participants,
       (select count(*) from public.tournament_standings s where s.tournament_id = t.id and s.fca_rank is not null)::int as fca_participants,
       (select jsonb_build_object('player_id', s.player_id, 'full_name', s.full_name, 'avatar_url', s.avatar_url,
                                  'lichess_username', s.lichess_username, 'score', s.score, 'earned_title', s.earned_title)
          from public.tournament_standings s where s.tournament_id = t.id and s.fca_rank = 1 limit 1) as fca_winner,
       (select jsonb_build_object('lichess_username', r.lichess_username, 'score', r.score)
          from public.tournament_results r where r.tournament_id = t.id order by r.rank limit 1) as overall_winner
  from public.tournaments t;

-- ---------------------------------------------------------------------------
-- 1-click import staging
-- ---------------------------------------------------------------------------

create table if not exists public.arena_imports (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'ARENA' check (kind in ('ARENA', 'RESYNC')),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'DISMISSED', 'EMPTY', 'FAILED')),
  lichess_arena_id text,
  tournament_id uuid references public.tournaments(id) on delete set null,
  title text not null,
  event_name text not null,
  starts_at timestamptz,
  games jsonb not null default '[]'::jsonb,
  total_games int not null default 0,
  rated_games int not null default 0,
  new_games int not null default 0,
  players int not null default 0,
  linked_players int not null default 0,
  unlinked_players text[] not null default '{}',
  reason text,
  detected_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  applied_games int,
  error text
);
create unique index if not exists arena_imports_one_pending_per_arena
  on public.arena_imports (lichess_arena_id) where status = 'PENDING' and kind = 'ARENA';
create index if not exists arena_imports_status_idx on public.arena_imports (status, detected_at desc);
alter table public.arena_imports enable row level security;
drop policy if exists "Staff can view imports" on public.arena_imports;
create policy "Staff can view imports" on public.arena_imports for select to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------------
-- Achievements (computed by the fca-api edge function)
-- ---------------------------------------------------------------------------

create table if not exists public.player_achievements (
  player_id uuid not null references public.profiles(id) on delete cascade,
  achievement_key text not null,
  earned_at timestamptz,
  progress int not null default 0,
  target int not null default 1,
  context jsonb,
  updated_at timestamptz not null default now(),
  primary key (player_id, achievement_key)
);
create index if not exists player_achievements_earned_idx on public.player_achievements (earned_at desc) where earned_at is not null;
alter table public.player_achievements enable row level security;
drop policy if exists "Achievements are public" on public.player_achievements;
create policy "Achievements are public" on public.player_achievements for select using (true);

-- Chess.com ownership codes (service only)
create table if not exists public.chesscom_verifications (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  username text not null,
  code text not null,
  created_at timestamptz not null default now()
);
alter table public.chesscom_verifications enable row level security;

-- ---------------------------------------------------------------------------
-- Ratings: full chronological replay. Games are the source of truth.
-- ---------------------------------------------------------------------------

create or replace function public.recalculate_ratings()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g record;
  r_w int; r_b int; n_w int; n_b int;
  k_w int; k_b int;
  e_w float8; e_b float8;
  new_w int; new_b int;
  v_games int := 0;
  v_players int := 0;
  v_changed int := 0;
begin
  perform public.require_staff();
  perform pg_advisory_xact_lock(hashtext('fca_recalculate_ratings'));

  drop table if exists _fca_rt;
  drop table if exists _fca_gt;
  create temp table _fca_rt (
    player_id uuid not null, mode public.game_mode not null,
    elo int not null, games int not null, peak int not null,
    primary key (player_id, mode)
  ) on commit drop;
  create temp table _fca_gt (id uuid primary key, wb int, wa int, bb int, ba int) on commit drop;

  insert into _fca_rt (player_id, mode, elo, games, peak)
  select p.id, m.mode, s.elo, 0, s.elo
    from public.profiles p
   cross join unnest(enum_range(null::public.game_mode)) as m(mode)
   cross join lateral (
     select case when p.is_immortal then coalesce(
              case m.mode when 'BLITZ' then p.blitz_elo when 'RAPID' then p.rapid_elo
                          when 'BULLET' then p.bullet_elo else p.classical_elo end, 2500)
            else 1200 end as elo
   ) s;

  for g in
    select gm.id, gm.white_player_id, gm.black_player_id, gm.mode, gm.result::float8 as score
      from public.games gm
     where gm.is_official is not false
       and gm.white_player_id <> gm.black_player_id
     order by gm.played_at, gm.created_at, gm.id
  loop
    select t.elo, t.games into r_w, n_w from _fca_rt t where t.player_id = g.white_player_id and t.mode = g.mode;
    select t.elo, t.games into r_b, n_b from _fca_rt t where t.player_id = g.black_player_id and t.mode = g.mode;
    continue when r_w is null or r_b is null;

    -- Same maths as src/lib/elo.ts (double precision, Math.round = floor(x + 0.5)).
    k_w := case when n_w < 15 then 40 else 20 end;
    k_b := case when n_b < 15 then 40 else 20 end;
    e_w := 1::float8 / (1::float8 + power(10::float8, (r_b - r_w)::float8 / 400::float8));
    e_b := 1::float8 / (1::float8 + power(10::float8, (r_w - r_b)::float8 / 400::float8));
    new_w := greatest(100, floor(r_w::float8 + k_w::float8 * (g.score - e_w) + 0.5::float8)::int);
    new_b := greatest(100, floor(r_b::float8 + k_b::float8 * ((1::float8 - g.score) - e_b) + 0.5::float8)::int);

    update _fca_rt t set elo = new_w, games = t.games + 1, peak = greatest(t.peak, new_w)
     where t.player_id = g.white_player_id and t.mode = g.mode;
    update _fca_rt t set elo = new_b, games = t.games + 1, peak = greatest(t.peak, new_b)
     where t.player_id = g.black_player_id and t.mode = g.mode;
    insert into _fca_gt values (g.id, r_w, new_w, r_b, new_b);
    v_games := v_games + 1;
  end loop;

  update public.games gm
     set white_elo_before = t.wb, white_elo_after = t.wa, black_elo_before = t.bb, black_elo_after = t.ba
    from _fca_gt t
   where gm.id = t.id
     and (gm.white_elo_before is distinct from t.wb or gm.white_elo_after is distinct from t.wa
       or gm.black_elo_before is distinct from t.bb or gm.black_elo_after is distinct from t.ba);

  update public.games
     set white_elo_before = null, white_elo_after = null, black_elo_before = null, black_elo_after = null
   where is_official is false
     and (white_elo_before is not null or white_elo_after is not null or black_elo_before is not null or black_elo_after is not null);

  with piv as (
    select t.player_id,
           max(t.elo) filter (where t.mode = 'BLITZ') as blitz_elo,
           max(t.games) filter (where t.mode = 'BLITZ') as blitz_games,
           max(t.peak) filter (where t.mode = 'BLITZ') as peak_blitz,
           max(t.elo) filter (where t.mode = 'RAPID') as rapid_elo,
           max(t.games) filter (where t.mode = 'RAPID') as rapid_games,
           max(t.peak) filter (where t.mode = 'RAPID') as peak_rapid,
           max(t.elo) filter (where t.mode = 'BULLET') as bullet_elo,
           max(t.games) filter (where t.mode = 'BULLET') as bullet_games,
           max(t.peak) filter (where t.mode = 'BULLET') as peak_bullet,
           max(t.elo) filter (where t.mode = 'CLASSICAL') as classical_elo,
           max(t.games) filter (where t.mode = 'CLASSICAL') as classical_games,
           max(t.peak) filter (where t.mode = 'CLASSICAL') as peak_classical
      from _fca_rt t
     group by t.player_id
  ), calc as (
    select piv.*,
           public.title_for_rating(greatest(piv.peak_blitz, piv.peak_rapid, piv.peak_bullet, piv.peak_classical)) as replay_title
      from piv
  ), upd as (
    update public.profiles p
       set blitz_elo = c.blitz_elo, blitz_games = c.blitz_games, peak_blitz_elo = c.peak_blitz,
           rapid_elo = c.rapid_elo, rapid_games = c.rapid_games, peak_rapid_elo = c.peak_rapid,
           bullet_elo = c.bullet_elo, bullet_games = c.bullet_games, peak_bullet_elo = c.peak_bullet,
           classical_elo = c.classical_elo, classical_games = c.classical_games, peak_classical_elo = c.peak_classical,
           -- Titles are earned for life: never downgraded by a replay.
           earned_title = case when public.title_rank(c.replay_title) > public.title_rank(p.earned_title)
                               then c.replay_title else p.earned_title end
      from calc c
     where p.id = c.player_id
       and not p.is_immortal
       and (
         (p.blitz_elo, p.blitz_games, p.peak_blitz_elo, p.rapid_elo, p.rapid_games, p.peak_rapid_elo,
          p.bullet_elo, p.bullet_games, p.peak_bullet_elo, p.classical_elo, p.classical_games, p.peak_classical_elo)
         is distinct from
         (c.blitz_elo, c.blitz_games, c.peak_blitz, c.rapid_elo, c.rapid_games, c.peak_rapid,
          c.bullet_elo, c.bullet_games, c.peak_bullet, c.classical_elo, c.classical_games, c.peak_classical)
         or public.title_rank(c.replay_title) > public.title_rank(p.earned_title)
       )
    returning 1
  )
  select count(*) into v_changed from upd;

  select count(distinct t.player_id) into v_players from _fca_rt t where t.games > 0;

  return jsonb_build_object('games_rated', v_games, 'active_players', v_players, 'profiles_changed', v_changed);
end $$;

-- ---------------------------------------------------------------------------
-- Import approval / dismissal
-- ---------------------------------------------------------------------------

create or replace function public.apply_arena_import(p_import_id uuid, p_event_name text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  imp public.arena_imports%rowtype;
  v_event text;
  v_inserted int := 0;
  v_ids text[];
  v_recalc jsonb;
begin
  perform public.require_staff();

  select * into imp from public.arena_imports where id = p_import_id for update;
  if not found then raise exception 'Import not found.'; end if;
  if imp.status <> 'PENDING' then raise exception 'This import is already %.', lower(imp.status); end if;

  v_event := coalesce(nullif(btrim(p_event_name), ''), imp.event_name);

  select array_agg(x->>'id') into v_ids from jsonb_array_elements(imp.games) x;

  with staged as (
    select x->>'id' as gid,
           lower(x->>'white') as wname,
           lower(x->>'black') as bname,
           x->>'winner' as winner,
           lower(coalesce(x->>'speed', 'blitz')) as speed,
           to_timestamp((x->>'createdAt')::bigint / 1000.0) as played_at,
           x->>'arenaId' as arena_id,
           x->>'event' as event
      from jsonb_array_elements(imp.games) x
  ), resolved as (
    select s.*, w.id as wid, b.id as bid, t.id as tid, t.title as ttitle
      from staged s
      join public.profiles w on lower(w.lichess_username) = s.wname and not w.is_immortal
      join public.profiles b on lower(b.lichess_username) = s.bname and not b.is_immortal
      left join public.tournaments t on t.lichess_arena_id = s.arena_id
     where w.id <> b.id
  ), ins as (
    insert into public.games (
      white_player_id, black_player_id, mode, result, is_official, source, event_name,
      lichess_game_id, external_url, played_at, played_at_exact, tournament_id, created_by
    )
    select r.wid, r.bid,
           (case when r.speed in ('bullet', 'ultrabullet') then 'BULLET'
                 when r.speed = 'rapid' then 'RAPID'
                 when r.speed in ('classical', 'correspondence') then 'CLASSICAL'
                 else 'BLITZ' end)::public.game_mode,
           case r.winner when 'white' then 1.0 when 'black' then 0.0 else 0.5 end,
           true, 'LICHESS_ARENA',
           case when imp.kind = 'ARENA' then v_event else coalesce(r.ttitle, r.event, v_event) end,
           r.gid, 'https://lichess.org/' || r.gid, r.played_at, true,
           coalesce(r.tid, imp.tournament_id), auth.uid()
      from resolved r
    on conflict (lichess_game_id) do nothing
    returning 1
  )
  select count(*) into v_inserted from ins;

  if imp.kind = 'ARENA' and imp.tournament_id is not null then
    update public.tournaments set title = v_event, status = 'COMPLETED' where id = imp.tournament_id;
    update public.games
       set tournament_id = imp.tournament_id, event_name = v_event
     where lichess_game_id = any(v_ids)
       and (tournament_id is distinct from imp.tournament_id or event_name is distinct from v_event);
  end if;

  update public.arena_imports
     set status = 'APPROVED', decided_at = now(), decided_by = auth.uid(),
         applied_games = v_inserted, event_name = v_event, error = null
   where id = p_import_id;

  v_recalc := public.recalculate_ratings();
  return jsonb_build_object('inserted', v_inserted) || v_recalc;
end $$;

-- Exact Lichess start times + event links for games imported by the old client. Used by the sync job.
create or replace function public.bulk_set_game_meta(p_rows jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  perform public.require_staff();
  with x as (
    select r->>'id' as gid,
           nullif(r->>'played_at', '')::timestamptz as played_at,
           nullif(r->>'tournament_id', '')::uuid as tournament_id
      from jsonb_array_elements(p_rows) r
  ), upd as (
    update public.games g
       set played_at = coalesce(x.played_at, g.played_at),
           played_at_exact = true,
           tournament_id = coalesce(g.tournament_id, x.tournament_id)
      from x
     where g.lichess_game_id = x.gid
    returning 1
  )
  select count(*) into v_count from upd;
  return v_count;
end $$;

create or replace function public.dismiss_arena_import(p_import_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_staff();
  update public.arena_imports
     set status = 'DISMISSED', decided_at = now(), decided_by = auth.uid()
   where id = p_import_id and status = 'PENDING';
  if not found then raise exception 'Only pending imports can be dismissed.'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- Arbiter game tools (all re-rate everyone afterwards)
-- ---------------------------------------------------------------------------

create or replace function public.log_otb_game(
  p_white uuid, p_black uuid, p_mode public.game_mode, p_result numeric, p_event_name text,
  p_played_at timestamptz default null, p_tournament_id uuid default null, p_notes text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_row record;
  v_recalc jsonb;
begin
  perform public.require_staff();
  if p_white is null or p_black is null then raise exception 'Pick both players.'; end if;
  if p_white = p_black then raise exception 'White and Black must be different players.'; end if;
  if p_result not in (0, 0.5, 1) then raise exception 'Result must be 1 (White won), 0.5 (draw) or 0 (Black won).'; end if;
  if exists (select 1 from public.profiles where id in (p_white, p_black) and is_immortal) then
    raise exception 'Immortal profiles cannot play rated games.';
  end if;

  insert into public.games (white_player_id, black_player_id, mode, result, is_official, source, event_name,
                            played_at, played_at_exact, tournament_id, notes, created_by)
  values (p_white, p_black, p_mode, p_result, true, 'OTB_MANUAL',
          coalesce(nullif(btrim(p_event_name), ''), 'Challenge'),
          coalesce(p_played_at, now()), true, p_tournament_id, nullif(btrim(p_notes), ''), auth.uid())
  returning id into v_id;

  v_recalc := public.recalculate_ratings();
  select white_elo_before, white_elo_after, black_elo_before, black_elo_after into v_row from public.games where id = v_id;
  return jsonb_build_object(
    'game_id', v_id,
    'white_before', v_row.white_elo_before, 'white_after', v_row.white_elo_after,
    'black_before', v_row.black_elo_before, 'black_after', v_row.black_elo_after
  ) || v_recalc;
end $$;

create or replace function public.set_game_official(p_game_id uuid, p_official boolean, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.require_staff();
  update public.games
     set is_official = p_official,
         notes = coalesce(nullif(btrim(p_note), ''), notes)
   where id = p_game_id;
  if not found then raise exception 'Game not found.'; end if;
  return public.recalculate_ratings();
end $$;

create or replace function public.update_game_result(p_game_id uuid, p_result numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.require_staff();
  if p_result not in (0, 0.5, 1) then raise exception 'Result must be 1, 0.5 or 0.'; end if;
  update public.games set result = p_result where id = p_game_id;
  if not found then raise exception 'Game not found.'; end if;
  return public.recalculate_ratings();
end $$;

create or replace function public.delete_game(p_game_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  delete from public.games where id = p_game_id;
  if not found then raise exception 'Game not found.'; end if;
  return public.recalculate_ratings();
end $$;

-- ---------------------------------------------------------------------------
-- Seasons standings (points by finishing position among FCA members)
-- ---------------------------------------------------------------------------

create or replace function public.season_standings(p_season uuid default null)
returns table (
  player_id uuid, full_name text, avatar_url text, earned_title public.fca_title, department text,
  points int, events int, wins int, podiums int, best_rank int, arena_points int
) language sql stable security definer set search_path = public as $$
  with s as (
    select * from public.seasons
     where id = coalesce(p_season, (
       select id from public.seasons
        order by (current_date between starts_at and ends_at) desc, starts_at desc
        limit 1))
  ), ev as (
    select t.id from public.tournaments t, s
     where t.lichess_arena_id is not null
       and t.start_date >= s.starts_at and t.start_date < s.ends_at + 1
  ), ranked as (
    select r.tournament_id, p.id as pid, r.score,
           row_number() over (partition by r.tournament_id order by r.rank) as fca_rank
      from public.tournament_results r
      join public.profiles p on lower(p.lichess_username) = lower(r.lichess_username) and not p.is_immortal
     where r.tournament_id in (select id from ev) and r.games > 0
  )
  select p.id, p.full_name, p.avatar_url, p.earned_title, p.department,
         sum(coalesce(s.points_scheme[x.fca_rank::int], 0) + s.participation_points)::int,
         count(*)::int,
         (count(*) filter (where x.fca_rank = 1))::int,
         (count(*) filter (where x.fca_rank <= 3))::int,
         min(x.fca_rank)::int,
         sum(x.score)::int
    from ranked x
    join public.profiles p on p.id = x.pid
   cross join s
   group by p.id, p.full_name, p.avatar_url, p.earned_title, p.department
   order by 6 desc, 8 desc, 11 desc;
$$;

-- ---------------------------------------------------------------------------
-- Admin dashboard numbers
-- ---------------------------------------------------------------------------

create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform public.require_staff();
  select jsonb_build_object(
    'members', (
      select jsonb_build_object(
        'total', count(*) filter (where not is_immortal),
        'approved', count(*) filter (where status = 'APPROVED' and not is_immortal),
        'pending', count(*) filter (where status = 'PENDING'),
        'rejected', count(*) filter (where status = 'REJECTED'),
        'new_7d', count(*) filter (where created_at > now() - interval '7 days' and not is_immortal),
        'new_30d', count(*) filter (where created_at > now() - interval '30 days' and not is_immortal),
        'lichess_linked', count(*) filter (where lichess_username is not null and not is_immortal),
        'chesscom_linked', count(*) filter (where chesscom_username is not null and not is_immortal),
        'female', count(*) filter (where gender = 'FEMALE'),
        'alumni', count(*) filter (where is_alumni),
        'staff', count(*) filter (where is_admin or is_arbiter),
        'never_played', count(*) filter (where not is_immortal and blitz_games + rapid_games + bullet_games + classical_games = 0),
        'whatsapp', count(*) filter (where whatsapp_joined),
        'referred', count(*) filter (where invited_by is not null)
      ) from public.profiles),
    'games', (
      select jsonb_build_object(
        'total', count(*),
        'official', count(*) filter (where is_official is not false),
        'last_30d', count(*) filter (where played_at > now() - interval '30 days'),
        'otb', count(*) filter (where source = 'OTB_MANUAL'),
        'unlinked_to_event', count(*) filter (where tournament_id is null and source <> 'OTB_MANUAL')
      ) from public.games),
    'active_players_30d', (
      select count(distinct pid) from (
        select white_player_id as pid from public.games where played_at > now() - interval '30 days'
        union all
        select black_player_id from public.games where played_at > now() - interval '30 days') x),
    'events', (
      select coalesce(jsonb_agg(e order by e.start_date), '[]'::jsonb) from (
        select t.id, t.title, t.start_date, t.nb_players,
               (select count(*) from public.games g where g.tournament_id = t.id) as rated_games,
               (select count(*) from public.tournament_standings s where s.tournament_id = t.id and s.player_id is not null and s.games > 0) as fca_players,
               (select count(*) from public.tournament_standings s where s.tournament_id = t.id and s.player_id is null and s.games > 0) as guest_players
          from public.tournaments t
         where t.start_date < now()
           and (t.lichess_arena_id is not null or exists (select 1 from public.games g where g.tournament_id = t.id))
         order by t.start_date desc
         limit 16) e),
    'signups_by_week', (
      select coalesce(jsonb_agg(w order by w.week), '[]'::jsonb) from (
        select date_trunc('week', created_at)::date as week, count(*) as n
          from public.profiles
         where created_at > now() - interval '16 weeks' and not is_immortal
         group by 1) w),
    'departments', (
      select coalesce(jsonb_agg(d), '[]'::jsonb) from (
        select department, count(*) as n
          from public.profiles
         where not is_immortal and status = 'APPROVED'
         group by 1 order by 2 desc limit 12) d),
    'unlinked_regulars', (
      select coalesce(jsonb_agg(u), '[]'::jsonb) from (
        select r.lichess_username, count(*) as events, max(t.start_date) as last_seen,
               min(r.rank) as best_rank, sum(r.games) as games
          from public.tournament_results r
          join public.tournaments t on t.id = r.tournament_id
         where r.games > 0
           and not exists (select 1 from public.profiles p where lower(p.lichess_username) = lower(r.lichess_username))
         group by r.lichess_username
         order by count(*) desc, max(t.start_date) desc
         limit 25) u),
    'pending_imports', (select count(*) from public.arena_imports where status = 'PENDING'),
    'last_sync', (select updated_at from public.sync_state where key = 'last_tick')
  ) into v;
  return v;
end $$;

-- Recruiters leaderboard (members who joined with someone's invite link)
create or replace function public.top_recruiters(p_limit int default 20)
returns table (player_id uuid, full_name text, avatar_url text, earned_title public.fca_title, recruits int, active_recruits int)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.avatar_url, p.earned_title,
         count(r.id)::int,
         (count(r.id) filter (where r.blitz_games + r.rapid_games + r.bullet_games + r.classical_games > 0))::int
    from public.profiles p
    join public.profiles r on r.invited_by = p.id and r.status = 'APPROVED'
   group by p.id
   order by 5 desc, 6 desc
   limit p_limit;
$$;

-- ---------------------------------------------------------------------------
-- Read helpers for the web app
-- ---------------------------------------------------------------------------

-- Badge rarity: share of active players (1+ rated game) who earned each badge.
create or replace view public.achievement_stats with (security_invoker = true) as
select a.achievement_key,
       count(*) filter (where a.earned_at is not null)::int as earned,
       (select count(*) from public.profiles p
         where not p.is_immortal and p.blitz_games + p.rapid_games + p.bullet_games + p.classical_games > 0)::int as active_players
  from public.player_achievements a
 group by a.achievement_key;

-- Contact details for admins (email lives in auth.users; phone/reg number will stop being public).
create or replace function public.admin_members()
returns table (id uuid, email text, phone text, reg_number text, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_admin();
  return query
    select p.id, u.email::text, p.phone, p.reg_number, u.last_sign_in_at
      from public.profiles p
      left join auth.users u on u.id = p.id;
end $$;

-- A member's own private fields, for the edit-profile form.
create or replace function public.my_private_profile()
returns table (phone text, reg_number text, email text)
language sql stable security definer set search_path = public as $$
  select p.phone, p.reg_number, u.email::text
    from public.profiles p
    left join auth.users u on u.id = p.id
   where p.id = auth.uid();
$$;

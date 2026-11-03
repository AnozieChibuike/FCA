-- ===========================================================================
-- Automatic titles
-- - The title rules live in one place: title_for_stats()
-- - refresh_titles() awards titles and their badges; it runs automatically after every re-rate,
--   whenever tournament standings change and whenever a member links or unlinks Lichess
-- - Title badges follow the earned title only (no more badges from rating alone)
-- Safe to run more than once.
-- ===========================================================================

-- 25+ rated games (all modes), then peak Elo in any mode, plus FCA finishes for FIM / FGM.
create or replace function public.title_for_stats(p_peak int, p_games int, p_podiums int, p_wins int)
returns public.fca_title language sql immutable as $$
  select (case
    when coalesce(p_games, 0) < 25 then 'NONE'
    when coalesce(p_peak, 0) >= 1800 and coalesce(p_wins, 0) >= 3 then 'FGM'
    when coalesce(p_peak, 0) >= 1700 and coalesce(p_podiums, 0) >= 5 then 'FIM'
    when coalesce(p_peak, 0) >= 1550 then 'FM'
    when coalesce(p_peak, 0) >= 1400 then 'FCM'
    else 'NONE'
  end)::public.fca_title;
$$;

-- Upgrades titles that are now earned (never downgrades) and unlocks the matching badges.
-- Returns the number of members who got a new title.
create or replace function public.refresh_titles()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_awarded int;
begin
  with finishes as (
    select s.player_id,
           (count(*) filter (where s.fca_rank <= 3))::int as podiums,
           (count(*) filter (where s.fca_rank = 1))::int as wins
      from public.tournament_standings s
     where s.fca_rank is not null
     group by s.player_id
  ),
  calc as (
    select p.id,
           public.title_for_stats(
             greatest(coalesce(p.peak_blitz_elo, 0), coalesce(p.peak_rapid_elo, 0),
                      coalesce(p.peak_bullet_elo, 0), coalesce(p.peak_classical_elo, 0)),
             coalesce(p.blitz_games, 0) + coalesce(p.rapid_games, 0) + coalesce(p.bullet_games, 0) + coalesce(p.classical_games, 0),
             coalesce(f.podiums, 0),
             coalesce(f.wins, 0)
           ) as title
      from public.profiles p
      left join finishes f on f.player_id = p.id
     where not p.is_immortal
  ),
  upd as (
    update public.profiles p
       set earned_title = c.title
      from calc c
     where p.id = c.id
       and public.title_rank(c.title) > public.title_rank(p.earned_title)
    returning 1
  )
  select count(*) into v_awarded from upd;

  -- Every title badge up to the member's title. A badge keeps the date it was first unlocked.
  insert into public.player_achievements (player_id, achievement_key, earned_at, progress, target, updated_at)
  select p.id, t.key, now(), t.target, t.target, now()
    from public.profiles p
   cross join (values ('title_fcm', 1, 1400), ('title_fm', 2, 1550), ('title_fim', 3, 1700), ('title_fgm', 4, 1800))
         as t(key, rank, target)
   where not p.is_immortal
     and public.title_rank(p.earned_title) >= t.rank
  on conflict (player_id, achievement_key) do update
     set earned_at = coalesce(player_achievements.earned_at, excluded.earned_at),
         progress = excluded.progress,
         target = excluded.target,
         updated_at = now()
   where player_achievements.earned_at is null
      or player_achievements.progress is distinct from excluded.progress
      or player_achievements.target is distinct from excluded.target;

  return v_awarded;
end $$;

revoke execute on function public.refresh_titles() from public, anon, authenticated;

-- Re-rate: same Elo replay as before; titles are handed to refresh_titles().
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
  v_titles int := 0;
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
  ),
  upd as (
    update public.profiles p
       set blitz_elo = c.blitz_elo, blitz_games = c.blitz_games, peak_blitz_elo = c.peak_blitz,
           rapid_elo = c.rapid_elo, rapid_games = c.rapid_games, peak_rapid_elo = c.peak_rapid,
           bullet_elo = c.bullet_elo, bullet_games = c.bullet_games, peak_bullet_elo = c.peak_bullet,
           classical_elo = c.classical_elo, classical_games = c.classical_games, peak_classical_elo = c.peak_classical
      from piv c
     where p.id = c.player_id
       and not p.is_immortal
       and (p.blitz_elo, p.blitz_games, p.peak_blitz_elo, p.rapid_elo, p.rapid_games, p.peak_rapid_elo,
            p.bullet_elo, p.bullet_games, p.peak_bullet_elo, p.classical_elo, p.classical_games, p.peak_classical_elo)
           is distinct from
           (c.blitz_elo, c.blitz_games, c.peak_blitz, c.rapid_elo, c.rapid_games, c.peak_rapid,
            c.bullet_elo, c.bullet_games, c.peak_bullet, c.classical_elo, c.classical_games, c.peak_classical)
    returning 1
  )
  select count(*) into v_changed from upd;

  v_titles := public.refresh_titles();

  select count(distinct t.player_id) into v_players from _fca_rt t where t.games > 0;

  return jsonb_build_object('games_rated', v_games, 'active_players', v_players,
                            'profiles_changed', v_changed, 'titles_awarded', v_titles);
end $$;

-- Podiums and wins come from tournament standings, matched to members by Lichess handle,
-- so titles are re-checked when standings land and when a member links or unlinks Lichess.
create or replace function public.refresh_titles_trg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.refresh_titles();
  return null;
end $$;

drop trigger if exists tournament_results_titles_trg on public.tournament_results;
create trigger tournament_results_titles_trg
  after insert or update or delete on public.tournament_results
  for each statement execute function public.refresh_titles_trg();

-- refresh_titles() itself only sets earned_title, so this cannot loop.
drop trigger if exists profiles_titles_trg on public.profiles;
create trigger profiles_titles_trg
  after update of lichess_username, is_immortal on public.profiles
  for each statement execute function public.refresh_titles_trg();

-- Superseded by title_for_stats().
drop function if exists public.title_for_rating(int);

-- Lock title badges that were unlocked by rating alone, without the title.
update public.player_achievements pa
   set earned_at = null, updated_at = now()
  from public.profiles p
 where p.id = pa.player_id
   and not p.is_immortal
   and pa.earned_at is not null
   and public.title_rank(p.earned_title) < case pa.achievement_key
         when 'title_fcm' then 1 when 'title_fm' then 2 when 'title_fim' then 3 when 'title_fgm' then 4 end;

select public.refresh_titles();

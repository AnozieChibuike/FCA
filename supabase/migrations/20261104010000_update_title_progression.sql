-- ===========================================================================
-- Title Progression Update
-- - Realistic rating thresholds: FCM 1400, FM 1550, FIM 1700, FGM 1800
-- - Experience requirement: 25+ official rated games before any title can be earned
-- - Tournament proof: 5 FCA Podiums (fca_rank <= 3) for FIM, 3 FCA Wins (fca_rank = 1) for FGM
-- - Complete grandfathering: existing titles are kept for life
-- - Rating math untouched: preserves all members' current ratings
-- ===========================================================================

create or replace function public.title_for_rating(p_rating int)
returns public.fca_title language sql immutable as $$
  select (case
    when p_rating >= 1800 then 'FGM'
    when p_rating >= 1700 then 'FIM'
    when p_rating >= 1550 then 'FM'
    when p_rating >= 1400 then 'FCM'
    else 'NONE'
  end)::public.fca_title;
$$;

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

    -- Exact same rating calculation: preserves all current Elo ratings
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
           max(t.peak) filter (where t.mode = 'CLASSICAL') as peak_classical,
           sum(t.games) as total_games,
           greatest(
             max(t.peak) filter (where t.mode = 'BLITZ'),
             max(t.peak) filter (where t.mode = 'RAPID'),
             max(t.peak) filter (where t.mode = 'BULLET'),
             max(t.peak) filter (where t.mode = 'CLASSICAL')
           ) as max_peak
      from _fca_rt t
     group by t.player_id
  ),
  fca_finishes as (
    select r.tournament_id, p.id as player_id,
           row_number() over (partition by r.tournament_id order by r.rank) as fca_rank
      from public.tournament_results r
      join public.profiles p on lower(p.lichess_username) = lower(r.lichess_username) and not p.is_immortal
     where r.games > 0
  ),
  fca_counts as (
    select f.player_id,
           count(*) filter (where f.fca_rank <= 3) as fca_podiums,
           count(*) filter (where f.fca_rank = 1) as fca_wins
      from fca_finishes f
     group by f.player_id
  ),
  calc as (
    select piv.*,
           coalesce(fc.fca_podiums, 0) as fca_podiums,
           coalesce(fc.fca_wins, 0) as fca_wins,
           case
             -- Under 25 established games: no new title
             when coalesce(piv.total_games, 0) < 25 then 'NONE'::public.fca_title
             -- FGM: Peak Elo >= 1800 AND at least 3 FCA tournament wins
             when coalesce(piv.max_peak, 0) >= 1800 and coalesce(fc.fca_wins, 0) >= 3 then 'FGM'::public.fca_title
             -- FIM: Peak Elo >= 1700 AND at least 5 FCA tournament podiums
             when coalesce(piv.max_peak, 0) >= 1700 and coalesce(fc.fca_podiums, 0) >= 5 then 'FIM'::public.fca_title
             -- FM: Peak Elo >= 1550
             when coalesce(piv.max_peak, 0) >= 1550 then 'FM'::public.fca_title
             -- FCM: Peak Elo >= 1400
             when coalesce(piv.max_peak, 0) >= 1400 then 'FCM'::public.fca_title
             else 'NONE'::public.fca_title
           end as replay_title
      from piv
      left join fca_counts fc on fc.player_id = piv.player_id
  ),
  upd as (
    update public.profiles p
       set blitz_elo = c.blitz_elo, blitz_games = c.blitz_games, peak_blitz_elo = c.peak_blitz,
           rapid_elo = c.rapid_elo, rapid_games = c.rapid_games, peak_rapid_elo = c.peak_rapid,
           bullet_elo = c.bullet_elo, bullet_games = c.bullet_games, peak_bullet_elo = c.peak_bullet,
           classical_elo = c.classical_elo, classical_games = c.classical_games, peak_classical_elo = c.peak_classical,
           -- Titles are earned for life: never downgraded by a replay (grandfathering)
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

-- Align target thresholds in player_achievements table
update public.player_achievements set target = 1400 where achievement_key = 'title_fcm' and target <> 1400;
update public.player_achievements set target = 1550 where achievement_key = 'title_fm' and target <> 1550;
update public.player_achievements set target = 1700 where achievement_key = 'title_fim' and target <> 1700;
update public.player_achievements set target = 1800 where achievement_key = 'title_fgm' and target <> 1800;



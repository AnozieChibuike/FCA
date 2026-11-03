import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type {
  Game, PlayerAchievement, Profile, Recruiter, Season, SeasonStanding, Standing, TitleStats, TournamentSummary,
} from '../types';

/** Every public profile column. Never select('*') on profiles: phone and reg number are private. */
export const PROFILE_COLUMNS = [
  'id', 'fca_id', 'full_name', 'department', 'faculty', 'gender', 'is_alumni', 'bio', 'avatar_url',
  'lichess_username', 'chesscom_username', 'whatsapp_joined',
  'blitz_elo', 'rapid_elo', 'bullet_elo', 'classical_elo',
  'peak_blitz_elo', 'peak_rapid_elo', 'peak_bullet_elo', 'peak_classical_elo',
  'blitz_games', 'rapid_games', 'bullet_games', 'classical_games',
  'earned_title', 'is_immortal', 'is_admin', 'is_arbiter', 'status', 'invited_by', 'created_at',
].join(', ');

export const PLAYER_REF = 'id, full_name, avatar_url, earned_title, lichess_username';

export const GAME_COLUMNS = `
  id, white_player_id, black_player_id, mode, result, is_official, source, event_name,
  white_elo_before, white_elo_after, black_elo_before, black_elo_after,
  lichess_game_id, external_url, played_at, tournament_id, notes, created_at,
  white_player:profiles!white_player_id(${PLAYER_REF}),
  black_player:profiles!black_player_id(${PLAYER_REF})
`;

/** Call the fca-api edge function and surface its error message instead of a generic one. */
export async function invokeFca<T = unknown>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('fca-api', { body: { action, ...body } });
  if (error) {
    let message = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = await error.context.json();
        if (payload?.error) message = payload.error;
      } catch {
        // keep the generic message
      }
    }
    throw new Error(message);
  }
  return data as T;
}

export function errorMessage(e: unknown, fallback = 'Something went wrong.') {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'object' && e && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return fallback;
}

/** PostgREST caps responses at 1000 rows; page through anything that can grow past that. */
export async function fetchAllRows<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export async function fetchProfiles(): Promise<Profile[]> {
  return fetchAllRows<Profile>((a, b) =>
    supabase.from('profiles').select(PROFILE_COLUMNS).order('created_at').range(a, b));
}

export async function fetchProfile(id: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', id).maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function fetchPlayerGames(playerId: string): Promise<Game[]> {
  return fetchAllRows<Game>((a, b) =>
    supabase
      .from('games')
      .select(GAME_COLUMNS)
      .or(`white_player_id.eq.${playerId},black_player_id.eq.${playerId}`)
      .order('played_at', { ascending: false })
      .order('id')
      .range(a, b));
}

export async function fetchEventGames(tournamentId: string): Promise<Game[]> {
  return fetchAllRows<Game>((a, b) =>
    supabase
      .from('games')
      .select(GAME_COLUMNS)
      .eq('tournament_id', tournamentId)
      .order('played_at')
      .order('id')
      .range(a, b));
}

export async function fetchEvents(): Promise<TournamentSummary[]> {
  const { data, error } = await supabase.from('tournament_summary').select('*').order('start_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as TournamentSummary[];
}

export async function fetchEvent(id: string): Promise<TournamentSummary | null> {
  const { data } = await supabase.from('tournament_summary').select('*').eq('id', id).maybeSingle();
  return (data as TournamentSummary | null) ?? null;
}

/** Next scheduled or live event (includes one that started within the last 3 hours). */
export async function fetchNextEvent(): Promise<TournamentSummary | null> {
  const since = new Date(Date.now() - 3 * 3600_000).toISOString();
  const { data } = await supabase
    .from('tournament_summary')
    .select('*')
    .neq('status', 'COMPLETED')
    .gte('start_date', since)
    .order('start_date')
    .limit(1);
  return ((data ?? [])[0] as TournamentSummary | undefined) ?? null;
}

export async function fetchLatestCompletedEvent(): Promise<TournamentSummary | null> {
  const { data } = await supabase
    .from('tournament_summary')
    .select('*')
    .not('fca_winner', 'is', null)
    .order('start_date', { ascending: false })
    .limit(1);
  return ((data ?? [])[0] as TournamentSummary | undefined) ?? null;
}

export async function fetchStandings(tournamentId: string): Promise<Standing[]> {
  const { data, error } = await supabase.from('tournament_standings').select('*').eq('tournament_id', tournamentId).order('rank');
  if (error) throw error;
  return (data ?? []) as Standing[];
}

export async function fetchTitleStats(playerId: string): Promise<TitleStats | null> {
  const { data, error } = await supabase.rpc('title_progress', { p_player_id: playerId });
  if (error) throw error;
  return (data ?? null) as TitleStats | null;
}

export async function fetchPlayerStandings(playerId: string): Promise<Standing[]> {
  const { data } = await supabase
    .from('tournament_standings')
    .select('*')
    .eq('player_id', playerId)
    .order('tournament_date', { ascending: false });
  return (data ?? []) as Standing[];
}

export async function fetchPlayerAchievements(playerId: string): Promise<PlayerAchievement[]> {
  const { data } = await supabase.from('player_achievements').select('*').eq('player_id', playerId);
  return (data ?? []) as PlayerAchievement[];
}

export interface EarnedBadge extends PlayerAchievement {
  player: { id: string; full_name: string; avatar_url: string | null; earned_title: Profile['earned_title'] } | null;
}

export async function fetchRecentBadges(limit = 10): Promise<EarnedBadge[]> {
  const { data } = await supabase
    .from('player_achievements')
    .select(`*, player:profiles!player_id(id, full_name, avatar_url, earned_title)`)
    .not('earned_at', 'is', null)
    .order('earned_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as EarnedBadge[];
}

export async function fetchBadgeHolders(key: string): Promise<EarnedBadge[]> {
  const { data } = await supabase
    .from('player_achievements')
    .select(`*, player:profiles!player_id(id, full_name, avatar_url, earned_title)`)
    .eq('achievement_key', key)
    .not('earned_at', 'is', null)
    .order('earned_at');
  return (data ?? []) as EarnedBadge[];
}

export async function fetchAchievementStats(): Promise<Record<string, { earned: number; active: number }>> {
  const { data } = await supabase.from('achievement_stats').select('*');
  const out: Record<string, { earned: number; active: number }> = {};
  for (const r of (data ?? []) as Array<{ achievement_key: string; earned: number; active_players: number }>) {
    out[r.achievement_key] = { earned: r.earned, active: r.active_players };
  }
  return out;
}

export async function fetchSeasons(): Promise<Season[]> {
  const { data } = await supabase.from('seasons').select('*').order('starts_at', { ascending: false });
  return (data ?? []) as Season[];
}

export async function fetchSeasonStandings(seasonId?: string | null): Promise<SeasonStanding[]> {
  const { data, error } = await supabase.rpc('season_standings', { p_season: seasonId ?? null });
  if (error) throw error;
  return (data ?? []) as SeasonStanding[];
}

export async function fetchRecruiters(limit = 20): Promise<Recruiter[]> {
  const { data } = await supabase.rpc('top_recruiters', { p_limit: limit });
  return (data ?? []) as Recruiter[];
}

export async function fetchSettings(): Promise<Record<string, unknown>> {
  const { data } = await supabase.from('app_settings').select('key, value');
  return Object.fromEntries(((data ?? []) as Array<{ key: string; value: unknown }>).map((r) => [r.key, r.value]));
}

export async function fetchWhatsappUrl(): Promise<string | null> {
  const settings = await fetchSettings().catch(() => ({} as Record<string, unknown>));
  const fromDb = typeof settings.whatsapp_group_url === 'string' ? settings.whatsapp_group_url : null;
  return fromDb || import.meta.env.VITE_FCA_WHATSAPP_GROUP_URL || null;
}

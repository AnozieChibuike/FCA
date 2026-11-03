export type FcaTitle = 'NONE' | 'FCM' | 'FM' | 'FIM' | 'FGM' | 'FET';
export type GameMode = 'BLITZ' | 'RAPID' | 'BULLET' | 'CLASSICAL';
export type InviteRole = 'ADMIN' | 'ARBITER';
export type PlayerStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type UserRole = 'ADMIN' | 'ARBITER' | 'PLAYER';
export type Gender = 'MALE' | 'FEMALE';

/** Public profile columns (phone and registration number are private: see PrivateProfile). */
export interface Profile {
  id: string;
  fca_id: string;
  full_name: string;
  department: string;
  faculty: string;
  gender?: Gender | string | null;
  is_alumni?: boolean;
  bio: string | null;
  avatar_url: string | null;
  lichess_username: string | null;
  chesscom_username: string | null;
  whatsapp_joined: boolean | null;
  blitz_elo: number;
  rapid_elo: number;
  bullet_elo: number;
  classical_elo: number;
  peak_blitz_elo: number;
  peak_rapid_elo: number;
  peak_bullet_elo: number;
  peak_classical_elo: number;
  blitz_games: number;
  rapid_games: number;
  bullet_games: number;
  classical_games: number;
  earned_title: FcaTitle;
  is_immortal: boolean;
  is_admin: boolean;
  is_arbiter: boolean;
  status: PlayerStatus;
  invited_by: string | null;
  created_at: string;
}

export interface PrivateProfile {
  phone: string | null;
  reg_number: string | null;
  email: string | null;
}

export interface PlayerRef {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  earned_title?: FcaTitle;
  lichess_username?: string | null;
}

export interface Game {
  id: string;
  white_player_id: string;
  black_player_id: string;
  mode: GameMode;
  result: number;
  is_official: boolean | null;
  source: string;
  event_name: string;
  white_elo_before: number | null;
  white_elo_after: number | null;
  black_elo_before: number | null;
  black_elo_after: number | null;
  lichess_game_id: string | null;
  external_url: string | null;
  played_at: string;
  tournament_id: string | null;
  notes?: string | null;
  created_at: string;
  white_player?: PlayerRef;
  black_player?: PlayerRef;
}

export type TournamentStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED';

export interface Tournament {
  id: string;
  title: string;
  mode: GameMode;
  time_control: string | null;
  start_date: string;
  ends_at: string | null;
  location: string;
  is_online: boolean;
  description: string | null;
  status: TournamentStatus;
  lichess_arena_id: string | null;
  lichess_status: number | null;
  nb_players: number | null;
  rating_cap: number | null;
}

export interface TournamentSummary extends Tournament {
  rated_games: number;
  participants: number;
  fca_participants: number;
  fca_winner: {
    player_id: string;
    full_name: string;
    avatar_url: string | null;
    lichess_username: string;
    score: number;
    earned_title: FcaTitle;
  } | null;
  overall_winner: { lichess_username: string; score: number } | null;
}

export interface Standing {
  tournament_id: string;
  tournament_title: string;
  tournament_date: string;
  tournament_mode: GameMode;
  rank: number;
  lichess_username: string;
  score: number;
  rating: number | null;
  performance: number | null;
  games: number;
  wins: number;
  player_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  earned_title: FcaTitle | null;
  department: string | null;
  fca_rank: number | null;
}

export interface StagedGame {
  id: string;
  white: string;
  black: string;
  winner: 'white' | 'black' | null;
  speed: string;
  createdAt: number;
  arenaId: string | null;
  event: string | null;
}

export type ImportStatus = 'PENDING' | 'APPROVED' | 'DISMISSED' | 'EMPTY' | 'FAILED';

export interface ArenaImport {
  id: string;
  kind: 'ARENA' | 'RESYNC';
  status: ImportStatus;
  lichess_arena_id: string | null;
  tournament_id: string | null;
  title: string;
  event_name: string;
  starts_at: string | null;
  games: StagedGame[];
  total_games: number;
  rated_games: number;
  new_games: number;
  players: number;
  linked_players: number;
  unlinked_players: string[];
  reason: string | null;
  detected_at: string;
  decided_at: string | null;
  decided_by: string | null;
  applied_games: number | null;
  error: string | null;
}

export interface PlayerAchievement {
  player_id: string;
  achievement_key: string;
  earned_at: string | null;
  progress: number;
  target: number;
  context: Record<string, unknown> | null;
}

export interface Season {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  points_scheme: number[];
  participation_points: number;
}

export interface SeasonStanding {
  player_id: string;
  full_name: string;
  avatar_url: string | null;
  earned_title: FcaTitle;
  department: string | null;
  points: number;
  events: number;
  wins: number;
  podiums: number;
  best_rank: number;
  arena_points: number;
}

export interface Recruiter {
  player_id: string;
  full_name: string;
  avatar_url: string | null;
  earned_title: FcaTitle;
  recruits: number;
  active_recruits: number;
}

export interface AdminStats {
  members: {
    total: number; approved: number; pending: number; rejected: number;
    new_7d: number; new_30d: number; lichess_linked: number; chesscom_linked: number;
    female: number; alumni: number; staff: number; never_played: number; whatsapp: number; referred: number;
  };
  games: { total: number; official: number; last_30d: number; otb: number; unlinked_to_event: number };
  active_players_30d: number;
  events: Array<{ id: string; title: string; start_date: string; nb_players: number | null; rated_games: number; fca_players: number; guest_players: number }>;
  signups_by_week: Array<{ week: string; n: number }>;
  departments: Array<{ department: string; n: number }>;
  unlinked_regulars: Array<{ lichess_username: string; events: number; last_seen: string; best_rank: number; games: number }>;
  pending_imports: number;
  last_sync: string | null;
}

export interface InviteLink {
  id: string;
  token: string;
  role: InviteRole;
  created_by: string;
  expires_at: string;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

export function getUserRole(profile: Profile | null): UserRole {
  if (!profile) return 'PLAYER';
  if (profile.is_admin) return 'ADMIN';
  if (profile.is_arbiter) return 'ARBITER';
  return 'PLAYER';
}

export const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string }> = {
  ADMIN: { label: 'Admin', color: 'text-primary-light', bg: 'bg-primary/20' },
  ARBITER: { label: 'Arbiter', color: 'text-sky-300', bg: 'bg-sky-500/15' },
  PLAYER: { label: 'Player', color: 'text-text-muted', bg: 'bg-surface' },
};

export const TITLE_CONFIG: Record<FcaTitle, {
  label: string;
  tag: string;
  threshold: number | null;
  minGames?: number;
  podiumsNeeded?: number;
  winsNeeded?: number;
  reqText: string;
  color: string;
  bg: string;
}> = {
  NONE: { label: 'Unrated', tag: '', threshold: null, reqText: 'Default status', color: 'text-text-muted', bg: 'bg-transparent border-transparent' },
  FCM: { label: 'FCA Candidate Master', tag: 'FCM', threshold: 1400, minGames: 25, reqText: '1400+ peak Elo & 25+ rated games', color: 'text-sky-300', bg: 'bg-sky-950/90 text-sky-300 border border-sky-500/80 font-bold' },
  FM: { label: 'FCA Master', tag: 'FM', threshold: 1550, minGames: 25, reqText: '1550+ peak Elo & 25+ rated games', color: 'text-emerald-300', bg: 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/80 font-bold' },
  FIM: { label: 'FCA International Master', tag: 'FIM', threshold: 1700, minGames: 25, podiumsNeeded: 5, reqText: '1700+ peak Elo, 5 FCA Podiums & 25+ rated games', color: 'text-amber-300', bg: 'bg-amber-950/90 text-amber-300 border border-amber-500/80 font-bold shadow-[0_0_8px_rgba(245,158,11,0.2)]' },
  FGM: { label: 'FCA Grandmaster', tag: 'FGM', threshold: 1800, minGames: 25, winsNeeded: 3, reqText: '1800+ peak Elo, 3 FCA Wins & 25+ rated games', color: 'text-rose-300', bg: 'bg-rose-950/90 text-rose-300 border border-rose-500/80 font-bold shadow-[0_0_8px_rgba(244,63,94,0.3)]' },
  FET: { label: 'FCA Eternal', tag: 'FET', threshold: null, reqText: 'Honorary • In Memoriam', color: 'text-purple-300', bg: 'fet-shimmer-badge' },
};

export const MODES: GameMode[] = ['BLITZ', 'RAPID', 'BULLET', 'CLASSICAL'];

export const MODE_LABELS: Record<GameMode, string> = {
  BLITZ: 'Blitz',
  RAPID: 'Rapid',
  BULLET: 'Bullet',
  CLASSICAL: 'Classical',
};

export function modeRating(p: Profile, mode: GameMode) {
  const key = mode.toLowerCase() as 'blitz' | 'rapid' | 'bullet' | 'classical';
  return {
    elo: p[`${key}_elo`],
    peak: p[`peak_${key}_elo`] ?? p[`${key}_elo`],
    games: p[`${key}_games`] ?? 0,
  };
}

export function totalGames(p: Profile) {
  return (p.blitz_games || 0) + (p.rapid_games || 0) + (p.bullet_games || 0) + (p.classical_games || 0);
}

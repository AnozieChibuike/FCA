export type FcaTitle = 'NONE' | 'FCM' | 'FM' | 'FIM' | 'FGM' | 'FET';
export type GameMode = 'BLITZ' | 'RAPID' | 'BULLET' | 'CLASSICAL';
export type InviteRole = 'ADMIN' | 'ARBITER';
export type PlayerStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type UserRole = 'ADMIN' | 'ARBITER' | 'PLAYER';

export interface Profile {
  id: string;
  fca_id: string;
  full_name: string;
  reg_number: string;
  department: string;
  faculty: string;
  phone: string | null;
  bio: string;
  avatar_url: string | null;
  lichess_username: string | null;
  chesscom_username: string | null;
  whatsapp_joined: boolean;
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

export interface Game {
  id: string;
  white_player_id: string;
  black_player_id: string;
  mode: GameMode;
  result: number;
  is_official: boolean;
  source: string;
  event_name: string;
  lichess_game_id?: string | null;
  external_url?: string | null;
  created_at: string;
  white_player?: Profile;
  black_player?: Profile;
}

export interface LeaderboardEntry {
  rank: number;
  player: Profile;
  elo: number;
  games: number;
  peak_elo: number;
}

export interface ArenaImportReport {
  processedGames: number;
  skippedDuplicateGames: number;
  skippedUnlinkedGames: number;
  unlinkedUsernames: string[];
}

export interface PreviewGame {
  lichessGameId: string;
  externalUrl: string;
  mode: GameMode;
  whitePlayer: Profile;
  blackPlayer: Profile;
  result: number;
  resultLabel: string;
  whiteEloOld: number;
  whiteEloNew: number;
  blackEloOld: number;
  blackEloNew: number;
  isAlreadyImported?: boolean;
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
  ARBITER: { label: 'Arbiter', color: 'text-cta', bg: 'bg-cta/20' },
  PLAYER: { label: 'Player', color: 'text-text-muted', bg: 'bg-surface' },
};

export const TITLE_CONFIG: Record<FcaTitle, { label: string; tag: string; threshold: number | null; color: string; bg: string }> = {
  NONE: { label: 'Unrated', tag: '', threshold: null, color: 'text-text-muted', bg: 'bg-transparent border-transparent' },
  FCM: { label: 'FCA Candidate Master', tag: 'FCM', threshold: 1600, color: 'text-sky-300', bg: 'bg-sky-950/90 text-sky-300 border border-sky-500/80 font-bold' },
  FM: { label: 'FCA Master', tag: 'FM', threshold: 1800, color: 'text-emerald-300', bg: 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/80 font-bold' },
  FIM: { label: 'FCA International Master', tag: 'FIM', threshold: 2000, color: 'text-amber-300', bg: 'bg-amber-950/90 text-amber-300 border border-amber-500/80 font-bold shadow-[0_0_8px_rgba(245,158,11,0.2)]' },
  FGM: { label: 'FCA Grandmaster', tag: 'FGM', threshold: 2200, color: 'text-rose-300', bg: 'bg-rose-950/90 text-rose-300 border border-rose-500/80 font-bold shadow-[0_0_8px_rgba(244,63,94,0.3)]' },
  FET: { label: 'FCA Eternal', tag: 'FET', threshold: null, color: 'text-purple-300', bg: 'fet-shimmer-badge' },
};

export const MODE_LABELS: Record<GameMode, string> = {
  BLITZ: 'Blitz',
  RAPID: 'Rapid',
  BULLET: 'Bullet',
  CLASSICAL: 'Classical',
};

// FCA achievements: definitions + the engine that computes them from games, events and profiles.
// Shared by the fca-api edge function (computes and stores rows) and the web app (renders badges).
// Keep this file dependency-free so both Deno and Vite can import it.

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
export type AchievementCategory =
  | 'Milestones' | 'Victories' | 'Streaks' | 'Upsets' | 'Rating' | 'Events' | 'Formats' | 'Rivals' | 'Community';

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  icon: string;
  target: number;
  secret?: boolean;
}

export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  'Milestones', 'Victories', 'Streaks', 'Upsets', 'Rating', 'Events', 'Formats', 'Rivals', 'Community',
];

export const ACHIEVEMENTS: AchievementDef[] = [
  // Milestones — rated games played
  { key: 'games_1', name: 'First Move', description: 'Play your first rated FCA game.', category: 'Milestones', tier: 'bronze', icon: '♟️', target: 1 },
  { key: 'games_10', name: 'Regular', description: 'Play 10 rated games.', category: 'Milestones', tier: 'bronze', icon: '🎯', target: 10 },
  { key: 'games_25', name: 'Committed', description: 'Play 25 rated games.', category: 'Milestones', tier: 'silver', icon: '🧩', target: 25 },
  { key: 'games_50', name: 'Veteran', description: 'Play 50 rated games.', category: 'Milestones', tier: 'silver', icon: '🛡️', target: 50 },
  { key: 'games_100', name: 'Centurion', description: 'Play 100 rated games.', category: 'Milestones', tier: 'gold', icon: '💯', target: 100 },
  { key: 'games_250', name: 'Marathoner', description: 'Play 250 rated games.', category: 'Milestones', tier: 'platinum', icon: '🏃', target: 250 },
  { key: 'games_500', name: 'Living Legend', description: 'Play 500 rated games.', category: 'Milestones', tier: 'legendary', icon: '👑', target: 500 },

  // Victories
  { key: 'wins_1', name: 'First Blood', description: 'Win your first rated game.', category: 'Victories', tier: 'bronze', icon: '🗡️', target: 1 },
  { key: 'wins_10', name: 'Winner', description: 'Win 10 rated games.', category: 'Victories', tier: 'bronze', icon: '⚔️', target: 10 },
  { key: 'wins_25', name: 'Conqueror', description: 'Win 25 rated games.', category: 'Victories', tier: 'silver', icon: '🏹', target: 25 },
  { key: 'wins_50', name: 'Warlord', description: 'Win 50 rated games.', category: 'Victories', tier: 'gold', icon: '🪓', target: 50 },
  { key: 'wins_100', name: 'Unstoppable', description: 'Win 100 rated games.', category: 'Victories', tier: 'platinum', icon: '☄️', target: 100 },
  { key: 'white_wins_10', name: 'White Knight', description: 'Win 10 games with the white pieces.', category: 'Victories', tier: 'silver', icon: '🤍', target: 10 },
  { key: 'black_wins_10', name: 'Dark Knight', description: 'Win 10 games with the black pieces.', category: 'Victories', tier: 'silver', icon: '🖤', target: 10 },
  { key: 'draws_5', name: 'Peacemaker', description: 'Draw 5 rated games.', category: 'Victories', tier: 'bronze', icon: '🤝', target: 5 },

  // Streaks
  { key: 'streak_3', name: 'Hat-trick', description: 'Win 3 rated games in a row.', category: 'Streaks', tier: 'bronze', icon: '🔥', target: 3 },
  { key: 'streak_5', name: 'On Fire', description: 'Win 5 rated games in a row.', category: 'Streaks', tier: 'silver', icon: '🔥', target: 5 },
  { key: 'streak_8', name: 'Inferno', description: 'Win 8 rated games in a row.', category: 'Streaks', tier: 'gold', icon: '🌋', target: 8 },
  { key: 'streak_12', name: 'Untouchable', description: 'Win 12 rated games in a row.', category: 'Streaks', tier: 'platinum', icon: '💎', target: 12 },
  { key: 'unbeaten_10', name: 'Iron Wall', description: 'Go 10 rated games without a loss.', category: 'Streaks', tier: 'silver', icon: '🧱', target: 10 },
  { key: 'comeback', name: 'Comeback Kid', description: 'Win 3 in a row straight after losing 4 in a row.', category: 'Streaks', tier: 'gold', icon: '🔄', target: 1, secret: true },

  // Upsets
  { key: 'upset_100', name: 'Underdog', description: 'Beat a player rated 100+ points above you.', category: 'Upsets', tier: 'bronze', icon: '🐺', target: 1 },
  { key: 'upset_200', name: 'Giant Slayer', description: 'Beat a player rated 200+ points above you.', category: 'Upsets', tier: 'silver', icon: '🪨', target: 1 },
  { key: 'upset_300', name: 'David vs Goliath', description: 'Beat a player rated 300+ points above you.', category: 'Upsets', tier: 'gold', icon: '🎯', target: 1 },
  { key: 'upset_400', name: 'Miracle Worker', description: 'Beat a player rated 400+ points above you.', category: 'Upsets', tier: 'platinum', icon: '✨', target: 1 },
  { key: 'beat_1400', name: 'Big Game Hunter', description: 'Beat a player rated 1400 or higher.', category: 'Upsets', tier: 'silver', icon: '🎖️', target: 1 },
  { key: 'kingslayer', name: 'Kingslayer', description: "Beat the club's highest-rated player in that time control.", category: 'Upsets', tier: 'gold', icon: '♚', target: 1, secret: true },

  // Rating
  { key: 'rating_1300', name: 'Rising Star', description: 'Reach a 1300 rating in any time control.', category: 'Rating', tier: 'bronze', icon: '⭐', target: 1300 },
  { key: 'rating_1400', name: '1400 Club', description: 'Reach a 1400 rating in any time control.', category: 'Rating', tier: 'silver', icon: '🌟', target: 1400 },
  { key: 'rating_1500', name: '1500 Club', description: 'Reach a 1500 rating in any time control.', category: 'Rating', tier: 'gold', icon: '💫', target: 1500 },
  { key: 'title_fcm', name: 'Candidate Master', description: 'Earn the FCM title (peak 1600).', category: 'Rating', tier: 'gold', icon: '🎓', target: 1600 },
  { key: 'title_fm', name: 'FCA Master', description: 'Earn the FM title (peak 1800).', category: 'Rating', tier: 'platinum', icon: '🏅', target: 1800 },
  { key: 'title_fim', name: 'International Master', description: 'Earn the FIM title (peak 2000).', category: 'Rating', tier: 'legendary', icon: '🌍', target: 2000 },
  { key: 'title_fgm', name: 'Grandmaster', description: 'Earn the FGM title (peak 2200).', category: 'Rating', tier: 'legendary', icon: '👑', target: 2200 },
  { key: 'rocket_50', name: 'Rocket', description: 'Gain 50+ rating points in a single event.', category: 'Rating', tier: 'silver', icon: '🚀', target: 50 },
  { key: 'rocket_100', name: 'Comet', description: 'Gain 100+ rating points in a single event.', category: 'Rating', tier: 'gold', icon: '☄️', target: 100 },

  // Events
  { key: 'event_debut', name: 'Debut', description: 'Play in your first FCA event.', category: 'Events', tier: 'bronze', icon: '🎟️', target: 1 },
  { key: 'tt_5', name: 'Tuesday Regular', description: 'Play 5 Titled Tuesdays.', category: 'Events', tier: 'silver', icon: '📅', target: 5 },
  { key: 'tt_10', name: 'Tuesday Devotee', description: 'Play 10 Titled Tuesdays.', category: 'Events', tier: 'gold', icon: '🗓️', target: 10 },
  { key: 'tt_25', name: 'Tuesday Legend', description: 'Play 25 Titled Tuesdays.', category: 'Events', tier: 'platinum', icon: '🏛️', target: 25 },
  { key: 'tt_streak_4', name: 'Never Miss', description: 'Play 4 Titled Tuesdays in a row.', category: 'Events', tier: 'silver', icon: '🔁', target: 4 },
  { key: 'podium', name: 'Podium', description: 'Finish in the top 3 FCA members of an event.', category: 'Events', tier: 'silver', icon: '🥉', target: 1 },
  { key: 'champion', name: 'Champion', description: 'Finish as the top FCA member of an event.', category: 'Events', tier: 'gold', icon: '🏆', target: 1 },
  { key: 'back_to_back', name: 'Back-to-Back', description: 'Be the top FCA member in two events in a row.', category: 'Events', tier: 'platinum', icon: '🔱', target: 2 },
  { key: 'dynasty', name: 'Dynasty', description: 'Be the top FCA member in 5 events.', category: 'Events', tier: 'legendary', icon: '🏰', target: 5 },
  { key: 'perfect_night', name: 'Perfect Night', description: 'Win every rated game in an event (4+ games).', category: 'Events', tier: 'gold', icon: '🌕', target: 1 },
  { key: 'night_owl', name: 'Night Owl', description: 'Play 15+ rated games in one event.', category: 'Events', tier: 'silver', icon: '🦉', target: 15 },
  { key: 'inaugural', name: 'Founding Player', description: 'Played in the FCA Rated Inauguration.', category: 'Events', tier: 'gold', icon: '🎉', target: 1 },

  // Formats
  { key: 'blitz_25', name: 'Blitz Specialist', description: 'Play 25 rated blitz games.', category: 'Formats', tier: 'silver', icon: '⚡', target: 25 },
  { key: 'bullet_25', name: 'Bullet Brain', description: 'Play 25 rated bullet games.', category: 'Formats', tier: 'silver', icon: '💥', target: 25 },
  { key: 'rapid_10', name: 'Rapid Thinker', description: 'Play 10 rated rapid games.', category: 'Formats', tier: 'silver', icon: '⏱️', target: 10 },
  { key: 'classical_5', name: 'Classical Scholar', description: 'Play 5 rated classical games.', category: 'Formats', tier: 'silver', icon: '📜', target: 5 },
  { key: 'all_rounder', name: 'All-Rounder', description: 'Play rated games in all four time controls.', category: 'Formats', tier: 'gold', icon: '🎨', target: 4 },
  { key: 'otb_1', name: 'Over the Board', description: 'Play a rated over-the-board game.', category: 'Formats', tier: 'bronze', icon: '♜', target: 1 },

  // Rivals
  { key: 'rival_10', name: 'Arch Rival', description: 'Play the same opponent 10 times.', category: 'Rivals', tier: 'silver', icon: '🤺', target: 10 },
  { key: 'opponents_20', name: 'Social Butterfly', description: 'Face 20 different opponents.', category: 'Rivals', tier: 'silver', icon: '🦋', target: 20 },
  { key: 'opponents_40', name: 'Club Networker', description: 'Face 40 different opponents.', category: 'Rivals', tier: 'gold', icon: '🕸️', target: 40 },

  // Community
  { key: 'verified', name: 'Verified', description: 'Connect your Lichess account.', category: 'Community', tier: 'bronze', icon: '✅', target: 1 },
  { key: 'dual_platform', name: 'Dual Wielder', description: 'Connect both Lichess and Chess.com.', category: 'Community', tier: 'bronze', icon: '🔗', target: 1 },
  { key: 'profile_complete', name: 'Looking Sharp', description: 'Add a photo, a bio and your gender.', category: 'Community', tier: 'bronze', icon: '📸', target: 1 },
  { key: 'recruiter_1', name: 'Recruiter', description: 'Bring 1 new member with your invite link.', category: 'Community', tier: 'bronze', icon: '📣', target: 1 },
  { key: 'recruiter_5', name: 'Ambassador', description: 'Bring 5 new members with your invite link.', category: 'Community', tier: 'silver', icon: '📢', target: 5 },
  { key: 'recruiter_10', name: 'Club Builder', description: 'Bring 10 new members with your invite link.', category: 'Community', tier: 'gold', icon: '🏗️', target: 10 },
  { key: 'founding_member', name: 'Founding Member', description: 'Joined FCA Rated in its first month.', category: 'Community', tier: 'gold', icon: '🌱', target: 1 },
  { key: 'staff', name: 'Guardian', description: 'Serve FCA as an arbiter or admin.', category: 'Community', tier: 'gold', icon: '⚖️', target: 1 },
];

export const ACHIEVEMENT_MAP: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.key, a]));

export const TIER_ORDER: Record<AchievementTier, number> = { bronze: 1, silver: 2, gold: 3, platinum: 4, legendary: 5 };

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export interface AchProfile {
  id: string;
  lichess_username: string | null;
  chesscom_username: string | null;
  avatar_url: string | null;
  bio: string | null;
  gender: string | null;
  created_at: string;
  is_admin: boolean | null;
  is_arbiter: boolean | null;
  is_immortal: boolean | null;
  earned_title: string | null;
  invited_by: string | null;
  status: string | null;
}

export interface AchGame {
  id: string;
  white_player_id: string;
  black_player_id: string;
  mode: string;
  result: number | string;
  played_at: string;
  tournament_id: string | null;
  source: string | null;
  is_official: boolean | null;
  white_elo_before: number | null;
  white_elo_after: number | null;
  black_elo_before: number | null;
  black_elo_after: number | null;
}

export interface AchTournament {
  id: string;
  title: string;
  start_date: string;
  lichess_arena_id: string | null;
}

export interface AchResult {
  tournament_id: string;
  lichess_username: string;
  rank: number;
  games: number;
}

export interface AchievementRow {
  player_id: string;
  achievement_key: string;
  earned_at: string | null;
  progress: number;
  target: number;
  context: Record<string, unknown> | null;
}

// Founding month: everyone who joined before this date.
const FOUNDING_CUTOFF = Date.parse('2026-08-25T00:00:00Z');
const KINGSLAYER_MIN_GAMES = 10;

interface Earned { at: string; ctx: Record<string, unknown> | null }

interface PlayerState {
  games: number;
  wins: number;
  draws: number;
  whiteWins: number;
  blackWins: number;
  streak: number;
  bestStreak: number;
  unbeaten: number;
  bestUnbeaten: number;
  lossStreak: number;
  lossesBeforeRun: number;
  otb: number;
  maxRating: number;
  modes: Record<string, number>;
  opponents: Map<string, number>;
  maxRival: number;
  bestUpset: number;
  bestGain: number;
  earned: Map<string, Earned>;
  ttPlayed: number;
  ttRun: number;
  bestTtRun: number;
  championships: number;
  podiums: number;
  eventsPlayed: number;
  bestNight: number;
  recruits: number;
}

function newState(): PlayerState {
  return {
    games: 0, wins: 0, draws: 0, whiteWins: 0, blackWins: 0,
    streak: 0, bestStreak: 0, unbeaten: 0, bestUnbeaten: 0, lossStreak: 0, lossesBeforeRun: 0,
    otb: 0, maxRating: 0, modes: {}, opponents: new Map(), maxRival: 0, bestUpset: 0, bestGain: 0,
    earned: new Map(), ttPlayed: 0, ttRun: 0, bestTtRun: 0, championships: 0, podiums: 0,
    eventsPlayed: 0, bestNight: 0, recruits: 0,
  };
}

function award(s: PlayerState, key: string, at: string, ctx: Record<string, unknown> | null = null) {
  if (!s.earned.has(key)) s.earned.set(key, { at, ctx });
}

function awardThresholds(s: PlayerState, prefix: string, steps: number[], value: number, at: string, ctx: Record<string, unknown> | null = null) {
  for (const n of steps) if (value >= n) award(s, `${prefix}${n}`, at, ctx);
}

const TITLE_STEPS: Array<[number, string]> = [[1600, 'title_fcm'], [1800, 'title_fm'], [2000, 'title_fim'], [2200, 'title_fgm']];
const TITLE_MIN_RATING: Record<string, number> = { FCM: 1600, FM: 1800, FIM: 2000, FGM: 2200 };

export function computeAchievements(input: {
  profiles: AchProfile[];
  games: AchGame[];
  tournaments: AchTournament[];
  results: AchResult[];
}): AchievementRow[] {
  const players = input.profiles.filter((p) => !p.is_immortal);
  const state = new Map<string, PlayerState>();
  for (const p of players) state.set(p.id, newState());
  const get = (id: string) => state.get(id);

  const tournaments = new Map(input.tournaments.map((t) => [t.id, t]));
  const games = input.games
    .filter((g) => g.is_official !== false)
    .sort((a, b) => Date.parse(a.played_at) - Date.parse(b.played_at) || a.id.localeCompare(b.id));

  // Current rating per mode for every player, to find the club's #1 at the time of a game.
  const current = new Map<string, Map<string, { elo: number; games: number }>>();
  const ratingOf = (mode: string) => {
    let m = current.get(mode);
    if (!m) { m = new Map(); current.set(mode, m); }
    return m;
  };

  // Per player per event: rated games tally, rating swing.
  const nights = new Map<string, { games: number; wins: number; first: number | null; last: number | null; at: string }>();

  for (const g of games) {
    const score = Number(g.result);
    const modeRatings = ratingOf(g.mode);
    let topId: string | null = null;
    let topElo = -1;
    for (const [pid, r] of modeRatings) {
      if (r.games >= KINGSLAYER_MIN_GAMES && r.elo > topElo) { topElo = r.elo; topId = pid; }
    }

    const sides: Array<[string, string, number, number | null, number | null, number | null, boolean]> = [
      [g.white_player_id, g.black_player_id, score, g.white_elo_before, g.white_elo_after, g.black_elo_before, true],
      [g.black_player_id, g.white_player_id, 1 - score, g.black_elo_before, g.black_elo_after, g.white_elo_before, false],
    ];

    for (const [me, opp, myScore, myBefore, myAfter, oppBefore, isWhite] of sides) {
      const s = get(me);
      if (!s) continue;
      const at = g.played_at;
      const ctx = { game_id: g.id, opponent_id: opp };

      s.games++;
      s.modes[g.mode] = (s.modes[g.mode] || 0) + 1;
      if (g.source === 'OTB_MANUAL') s.otb++;
      const met = (s.opponents.get(opp) || 0) + 1;
      s.opponents.set(opp, met);
      s.maxRival = Math.max(s.maxRival, met);

      if (myScore === 1) {
        if (s.streak === 0) s.lossesBeforeRun = s.lossStreak;
        s.wins++;
        s.streak++;
        s.unbeaten++;
        s.lossStreak = 0;
        if (isWhite) s.whiteWins++; else s.blackWins++;
        if (s.streak === 3 && s.lossesBeforeRun >= 4) award(s, 'comeback', at, ctx);
        if (myBefore != null && oppBefore != null) {
          const gap = oppBefore - myBefore;
          s.bestUpset = Math.max(s.bestUpset, gap);
          awardThresholds(s, 'upset_', [100, 200, 300, 400], gap, at, { ...ctx, gap });
          if (oppBefore >= 1400) award(s, 'beat_1400', at, { ...ctx, opponent_rating: oppBefore });
        }
        if (topId && topId === opp) award(s, 'kingslayer', at, { ...ctx, mode: g.mode });
      } else if (myScore === 0.5) {
        s.draws++;
        s.streak = 0;
        s.unbeaten++;
        s.lossStreak = 0;
      } else {
        s.streak = 0;
        s.unbeaten = 0;
        s.lossStreak++;
      }
      s.bestStreak = Math.max(s.bestStreak, s.streak);
      s.bestUnbeaten = Math.max(s.bestUnbeaten, s.unbeaten);

      awardThresholds(s, 'games_', [1, 10, 25, 50, 100, 250, 500], s.games, at);
      awardThresholds(s, 'wins_', [1, 10, 25, 50, 100], s.wins, at);
      if (s.whiteWins >= 10) award(s, 'white_wins_10', at);
      if (s.blackWins >= 10) award(s, 'black_wins_10', at);
      if (s.draws >= 5) award(s, 'draws_5', at);
      awardThresholds(s, 'streak_', [3, 5, 8, 12], s.streak, at, ctx);
      if (s.unbeaten >= 10) award(s, 'unbeaten_10', at);

      if (myAfter != null) {
        s.maxRating = Math.max(s.maxRating, myAfter);
        awardThresholds(s, 'rating_', [1300, 1400, 1500], s.maxRating, at, { mode: g.mode, rating: myAfter });
        for (const [min, key] of TITLE_STEPS) if (s.maxRating >= min) award(s, key, at, { mode: g.mode, rating: myAfter });
      }

      if ((s.modes.BLITZ || 0) >= 25) award(s, 'blitz_25', at);
      if ((s.modes.BULLET || 0) >= 25) award(s, 'bullet_25', at);
      if ((s.modes.RAPID || 0) >= 10) award(s, 'rapid_10', at);
      if ((s.modes.CLASSICAL || 0) >= 5) award(s, 'classical_5', at);
      if (['BLITZ', 'RAPID', 'BULLET', 'CLASSICAL'].every((m) => (s.modes[m] || 0) > 0)) award(s, 'all_rounder', at);
      if (s.otb >= 1) award(s, 'otb_1', at, ctx);
      if (met >= 10) award(s, 'rival_10', at, { opponent_id: opp });
      if (s.opponents.size >= 20) award(s, 'opponents_20', at);
      if (s.opponents.size >= 40) award(s, 'opponents_40', at);

      if (g.tournament_id) {
        const k = `${me}|${g.tournament_id}`;
        const n = nights.get(k) || { games: 0, wins: 0, first: myBefore, last: null, at };
        n.games++;
        if (myScore === 1) n.wins++;
        if (n.first == null) n.first = myBefore;
        n.last = myAfter ?? n.last;
        n.at = at;
        nights.set(k, n);
      }
    }

    // Update live ratings after both sides have been evaluated (kingslayer uses pre-game ratings).
    for (const [pid, after] of [[g.white_player_id, g.white_elo_after], [g.black_player_id, g.black_elo_after]] as const) {
      if (after == null) continue;
      const prev = modeRatings.get(pid);
      modeRatings.set(pid, { elo: after, games: (prev?.games || 0) + 1 });
    }
  }

  // Event nights: perfect score, marathon, rating rocket.
  for (const [k, n] of nights) {
    const [pid, tid] = k.split('|');
    const s = get(pid);
    if (!s) continue;
    const ctx = { tournament_id: tid };
    s.bestNight = Math.max(s.bestNight, n.games);
    if (n.games >= 4 && n.wins === n.games) award(s, 'perfect_night', n.at, ctx);
    if (n.games >= 15) award(s, 'night_owl', n.at, ctx);
    if (n.first != null && n.last != null) {
      const gain = n.last - n.first;
      s.bestGain = Math.max(s.bestGain, gain);
      if (gain >= 50) award(s, 'rocket_50', n.at, { ...ctx, gain });
      if (gain >= 100) award(s, 'rocket_100', n.at, { ...ctx, gain });
    }
  }

  // Event participation and finishing positions among FCA members (from Lichess standings).
  const byHandle = new Map<string, string>();
  for (const p of players) if (p.lichess_username) byHandle.set(p.lichess_username.trim().toLowerCase(), p.id);

  const participants = new Map<string, Set<string>>(); // tournament -> player ids
  for (const [k] of nights) {
    const [pid, tid] = k.split('|');
    if (!participants.has(tid)) participants.set(tid, new Set());
    participants.get(tid)!.add(pid);
  }
  const fcaRanks = new Map<string, Map<string, number>>(); // tournament -> player -> fca rank
  const resultsByEvent = new Map<string, AchResult[]>();
  for (const r of input.results) {
    if (!resultsByEvent.has(r.tournament_id)) resultsByEvent.set(r.tournament_id, []);
    resultsByEvent.get(r.tournament_id)!.push(r);
  }
  for (const [tid, rows] of resultsByEvent) {
    const ranks = new Map<string, number>();
    let place = 0;
    for (const r of [...rows].sort((a, b) => a.rank - b.rank)) {
      const pid = byHandle.get(r.lichess_username.trim().toLowerCase());
      if (!pid || r.games <= 0) continue;
      place++;
      ranks.set(pid, place);
      if (!participants.has(tid)) participants.set(tid, new Set());
      participants.get(tid)!.add(pid);
    }
    fcaRanks.set(tid, ranks);
  }

  const events = [...participants.keys()]
    .map((id) => tournaments.get(id))
    .filter((t): t is AchTournament => !!t)
    .sort((a, b) => Date.parse(a.start_date) - Date.parse(b.start_date));
  const isTitledTuesday = (t: AchTournament) => /titled\s*tuesday/i.test(t.title);
  const lastChampionEvent = new Map<string, number>(); // player -> index in rankedEvents of last title
  const rankedEvents = events.filter((t) => (fcaRanks.get(t.id)?.size || 0) > 0);

  for (const t of events) {
    const at = t.start_date;
    const ctx = { tournament_id: t.id };
    const who = participants.get(t.id)!;
    for (const pid of who) {
      const s = get(pid);
      if (!s) continue;
      s.eventsPlayed++;
      award(s, 'event_debut', at, ctx);
      if (/inaugur/i.test(t.title)) award(s, 'inaugural', at, ctx);
    }
    if (isTitledTuesday(t)) {
      for (const [pid, s] of state) {
        if (who.has(pid)) {
          s.ttPlayed++;
          s.ttRun++;
          s.bestTtRun = Math.max(s.bestTtRun, s.ttRun);
          if (s.ttPlayed >= 5) award(s, 'tt_5', at, ctx);
          if (s.ttPlayed >= 10) award(s, 'tt_10', at, ctx);
          if (s.ttPlayed >= 25) award(s, 'tt_25', at, ctx);
          if (s.ttRun >= 4) award(s, 'tt_streak_4', at, ctx);
        } else {
          s.ttRun = 0;
        }
      }
    }
  }

  rankedEvents.forEach((t, idx) => {
    const ranks = fcaRanks.get(t.id)!;
    for (const [pid, place] of ranks) {
      const s = get(pid);
      if (!s) continue;
      const ctx = { tournament_id: t.id, place };
      if (place <= 3) { s.podiums++; award(s, 'podium', t.start_date, ctx); }
      if (place === 1) {
        s.championships++;
        award(s, 'champion', t.start_date, ctx);
        if (lastChampionEvent.get(pid) === idx - 1) award(s, 'back_to_back', t.start_date, ctx);
        lastChampionEvent.set(pid, idx);
        if (s.championships >= 5) award(s, 'dynasty', t.start_date, ctx);
      }
    }
  });

  // Community
  const approvedRecruits = new Map<string, string[]>(); // recruiter -> recruit created_at (sorted)
  for (const p of input.profiles) {
    if (!p.invited_by || p.status !== 'APPROVED') continue;
    if (!approvedRecruits.has(p.invited_by)) approvedRecruits.set(p.invited_by, []);
    approvedRecruits.get(p.invited_by)!.push(p.created_at);
  }
  for (const p of players) {
    const s = get(p.id)!;
    if (p.lichess_username) award(s, 'verified', p.created_at);
    if (p.lichess_username && p.chesscom_username) award(s, 'dual_platform', p.created_at);
    if (p.avatar_url && p.bio && p.bio.trim() && p.gender) award(s, 'profile_complete', p.created_at);
    if (Date.parse(p.created_at) < FOUNDING_CUTOFF) award(s, 'founding_member', p.created_at);
    if (p.is_admin || p.is_arbiter) award(s, 'staff', p.created_at);
    const recruits = (approvedRecruits.get(p.id) || []).sort();
    s.recruits = recruits.length;
    for (const n of [1, 5, 10]) if (recruits.length >= n) award(s, `recruiter_${n}`, recruits[n - 1]);
    // Titles awarded before the replay data existed still count.
    const titleMin = TITLE_MIN_RATING[p.earned_title || ''];
    if (titleMin) for (const [min, key] of TITLE_STEPS) if (titleMin >= min) award(s, key, p.created_at);
  }

  // Progress values for locked badges.
  const progressFor = (key: string, s: PlayerState, p: AchProfile): number => {
    const def = ACHIEVEMENT_MAP[key];
    const m = /^(games|wins|streak|upset|rating|recruiter|rocket)_(\d+)$/.exec(key);
    if (m) {
      const kind = m[1];
      if (kind === 'games') return s.games;
      if (kind === 'wins') return s.wins;
      if (kind === 'streak') return s.bestStreak;
      if (kind === 'upset') return Math.max(0, s.bestUpset);
      if (kind === 'rating') return s.maxRating || 1200;
      if (kind === 'recruiter') return s.recruits;
      if (kind === 'rocket') return Math.max(0, s.bestGain);
    }
    switch (key) {
      case 'white_wins_10': return s.whiteWins;
      case 'black_wins_10': return s.blackWins;
      case 'draws_5': return s.draws;
      case 'unbeaten_10': return s.bestUnbeaten;
      case 'title_fcm': case 'title_fm': case 'title_fim': case 'title_fgm': return s.maxRating || 1200;
      case 'tt_5': case 'tt_10': case 'tt_25': return s.ttPlayed;
      case 'tt_streak_4': return s.bestTtRun;
      case 'dynasty': return s.championships;
      case 'back_to_back': return Math.min(s.championships, 1);
      case 'night_owl': return s.bestNight;
      case 'blitz_25': return s.modes.BLITZ || 0;
      case 'bullet_25': return s.modes.BULLET || 0;
      case 'rapid_10': return s.modes.RAPID || 0;
      case 'classical_5': return s.modes.CLASSICAL || 0;
      case 'all_rounder': return ['BLITZ', 'RAPID', 'BULLET', 'CLASSICAL'].filter((x) => (s.modes[x] || 0) > 0).length;
      case 'rival_10': return s.maxRival;
      case 'opponents_20': case 'opponents_40': return s.opponents.size;
      case 'event_debut': return Math.min(s.eventsPlayed, 1);
      case 'otb_1': return Math.min(s.otb, 1);
      case 'dual_platform': return (p.lichess_username ? 1 : 0) + (p.chesscom_username ? 1 : 0) >= 2 ? 1 : 0;
      default: return s.earned.has(key) ? def.target : 0;
    }
  };

  const rows: AchievementRow[] = [];
  for (const p of players) {
    const s = get(p.id)!;
    for (const def of ACHIEVEMENTS) {
      const earned = s.earned.get(def.key);
      const raw = earned ? def.target : progressFor(def.key, s, p);
      rows.push({
        player_id: p.id,
        achievement_key: def.key,
        earned_at: earned ? new Date(Date.parse(earned.at)).toISOString() : null,
        progress: Math.max(0, Math.min(def.target, Math.round(raw))),
        target: def.target,
        context: earned ? earned.ctx : null,
      });
    }
  }
  return rows;
}

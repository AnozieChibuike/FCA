import type { FcaTitle, Profile, Standing } from '../types';
import { TITLE_CONFIG } from '../types';

// Display only: titles are awarded by the database (title_for_stats / refresh_titles).
const TITLE_LADDER: FcaTitle[] = ['NONE', 'FCM', 'FM', 'FIM', 'FGM'];
const MIN_TITLE_GAMES = TITLE_CONFIG.FCM.minGames ?? 25;

export function calculateElo(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  kA: number = 20,
  kB: number = 20
): { newA: number; newB: number } {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));

  const scoreB = 1 - scoreA;

  const newA = Math.round(ratingA + kA * (scoreA - expectedA));
  const newB = Math.round(ratingB + kB * (scoreB - expectedB));

  return { newA: Math.max(100, newA), newB: Math.max(100, newB) };
}

export function getKFactor(gamesPlayed: number): number {
  return gamesPlayed < 15 ? 40 : 20;
}

export interface TitleProgress {
  currentTitle: FcaTitle;
  nextTitle: FcaTitle | null;
  peakElo: number;
  targetElo: number | null;
  totalGames: number;
  minGamesRequired: number;
  fcaPodiums: number;
  targetPodiums: number | null;
  fcaWins: number;
  targetWins: number | null;
  isMaxTitle: boolean;
  isImmortal: boolean;
}

export function getTitleProgress(player: Profile, events: Standing[] = []): TitleProgress {
  const isImmortal = player.is_immortal || player.fca_id === 'FCA-ETERNAL';
  const currentTitle = isImmortal ? 'FET' : player.earned_title || 'NONE';

  const totalGames = (player.blitz_games || 0) + (player.rapid_games || 0) + (player.bullet_games || 0) + (player.classical_games || 0);
  const peakElo = Math.max(
    player.peak_blitz_elo || player.blitz_elo || 1200,
    player.peak_rapid_elo || player.rapid_elo || 1200,
    player.peak_bullet_elo || player.bullet_elo || 1200,
    player.peak_classical_elo || player.classical_elo || 1200
  );

  const fcaPodiums = events.filter((e) => e.fca_rank && e.fca_rank <= 3).length;
  const fcaWins = events.filter((e) => e.fca_rank === 1).length;

  const step = TITLE_LADDER.indexOf(currentTitle);
  const nextTitle = isImmortal || step < 0 ? null : TITLE_LADDER[step + 1] ?? null;
  const next = nextTitle ? TITLE_CONFIG[nextTitle] : null;

  return {
    currentTitle,
    nextTitle,
    peakElo,
    targetElo: next?.threshold ?? null,
    totalGames,
    minGamesRequired: MIN_TITLE_GAMES,
    fcaPodiums,
    targetPodiums: next?.podiumsNeeded ?? null,
    fcaWins,
    targetWins: next?.winsNeeded ?? null,
    isMaxTitle: !nextTitle,
    isImmortal,
  };
}

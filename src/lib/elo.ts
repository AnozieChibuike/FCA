import type { FcaTitle, Profile, Standing } from '../types';

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

export function getTitleForRating(peakElo: number): FcaTitle {
  if (peakElo >= 1800) return 'FGM';
  if (peakElo >= 1700) return 'FIM';
  if (peakElo >= 1550) return 'FM';
  if (peakElo >= 1400) return 'FCM';
  return 'NONE';
}

export function getTitleForStats({
  peakElo,
  totalGames,
  fcaPodiums = 0,
  fcaWins = 0,
}: {
  peakElo: number;
  totalGames: number;
  fcaPodiums?: number;
  fcaWins?: number;
}): FcaTitle {
  if (totalGames < 25) return 'NONE';
  if (peakElo >= 1800 && fcaWins >= 3) return 'FGM';
  if (peakElo >= 1700 && fcaPodiums >= 5) return 'FIM';
  if (peakElo >= 1550) return 'FM';
  if (peakElo >= 1400) return 'FCM';
  return 'NONE';
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

  if (isImmortal || currentTitle === 'FET' || currentTitle === 'FGM') {
    return {
      currentTitle,
      nextTitle: null,
      peakElo,
      targetElo: null,
      totalGames,
      minGamesRequired: 25,
      fcaPodiums,
      targetPodiums: null,
      fcaWins,
      targetWins: null,
      isMaxTitle: true,
      isImmortal,
    };
  }

  let nextTitle: FcaTitle | null = null;
  let targetElo: number | null = null;
  let targetPodiums: number | null = null;
  let targetWins: number | null = null;

  if (currentTitle === 'NONE') {
    nextTitle = 'FCM';
    targetElo = 1400;
  } else if (currentTitle === 'FCM') {
    nextTitle = 'FM';
    targetElo = 1550;
  } else if (currentTitle === 'FM') {
    nextTitle = 'FIM';
    targetElo = 1700;
    targetPodiums = 5;
  } else if (currentTitle === 'FIM') {
    nextTitle = 'FGM';
    targetElo = 1800;
    targetWins = 3;
  }

  return {
    currentTitle,
    nextTitle,
    peakElo,
    targetElo,
    totalGames,
    minGamesRequired: 25,
    fcaPodiums,
    targetPodiums,
    fcaWins,
    targetWins,
    isMaxTitle: false,
    isImmortal: false,
  };
}

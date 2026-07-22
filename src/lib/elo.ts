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

export function getTitleForRating(peakElo: number): string {
  if (peakElo >= 2200) return 'FGM';
  if (peakElo >= 2000) return 'FIM';
  if (peakElo >= 1800) return 'FM';
  if (peakElo >= 1600) return 'FCM';
  return 'NONE';
}

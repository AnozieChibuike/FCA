// Read-only Lichess helpers used in the browser (live arena standings, links).
// Importing games happens server-side in the fca-api edge function.

export interface LiveArenaPlayer {
  name: string;
  rank: number;
  score: number;
  rating: number;
  sheet?: { scores: string; fire?: boolean };
  withdraw?: boolean;
}

export interface LiveArena {
  id: string;
  fullName: string;
  nbPlayers: number;
  isStarted?: boolean;
  isFinished?: boolean;
  secondsToStart?: number;
  secondsToFinish?: number;
  minutes: number;
  clock?: { limit: number; increment: number };
  standing?: { page: number; players: LiveArenaPlayer[] };
}

export function arenaUrl(arenaId: string) {
  return `https://lichess.org/tournament/${arenaId}`;
}

export function lichessProfileUrl(username: string) {
  return `https://lichess.org/@/${encodeURIComponent(username)}`;
}

export async function fetchLiveArena(arenaId: string): Promise<LiveArena | null> {
  try {
    const res = await fetch(`https://lichess.org/api/tournament/${arenaId}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return (await res.json()) as LiveArena;
  } catch {
    return null;
  }
}

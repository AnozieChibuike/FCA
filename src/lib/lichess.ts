import { supabase } from './supabase';
import { calculateElo, getKFactor, getTitleForRating } from './elo';
import type { ArenaImportReport, PreviewGame, GameMode } from '../types';
export type { ArenaImportReport } from '../types';

interface RawLichessGame {
  id: string;
  speed?: string;
  players: {
    white: { user?: { name?: string } };
    black: { user?: { name?: string } };
  };
  winner?: string;
}

interface ProfileRow {
  id: string;
  lichess_username: string | null;
  blitz_elo: number;
  blitz_games: number;
  rapid_elo: number;
  rapid_games: number;
  bullet_elo: number;
  bullet_games: number;
  classical_elo: number;
  classical_games: number;
  peak_blitz_elo: number;
  peak_rapid_elo: number;
  peak_bullet_elo: number;
  peak_classical_elo: number;
  is_immortal: boolean;
  full_name: string;
  fca_id: string;
  reg_number: string;
  department: string;
  faculty: string;
  chesscom_username: string | null;
  whatsapp_joined: boolean;
  earned_title: string;
  is_admin: boolean;
  is_arbiter: boolean;
  status: string;
  invited_by: string | null;
  created_at: string;
}

export interface ArenaPreviewResult {
  games: PreviewGame[];
  linkedUsernames: string[];
  unlinkedUsernames: string[];
  totalRawGames: number;
  alreadyImportedCount: number;
}

export function extractLichessGameId(game: { event_name?: string; lichess_game_id?: string | null; external_url?: string | null }): string | null {
  if (game.lichess_game_id) return game.lichess_game_id;
  if (game.external_url) {
    const match = game.external_url.match(/lichess\.org\/([a-zA-Z0-9]{8,12})/);
    if (match) return match[1];
  }
  if (game.event_name) {
    const match = game.event_name.match(/\[([a-zA-Z0-9]{8,12})\]/);
    if (match) return match[1];
  }
  return null;
}

function parseMode(speed?: string): GameMode {
  if (!speed) return 'BLITZ';
  const s = speed.toUpperCase();
  if (s === 'RAPID') return 'RAPID';
  if (s === 'BULLET') return 'BULLET';
  if (s === 'CLASSICAL') return 'CLASSICAL';
  return 'BLITZ';
}

function getModeEloAndGames(p: ProfileRow, mode: GameMode) {
  switch (mode) {
    case 'RAPID': return { elo: p.rapid_elo, games: p.rapid_games, peak: p.peak_rapid_elo };
    case 'BULLET': return { elo: p.bullet_elo, games: p.bullet_games, peak: p.peak_bullet_elo };
    case 'CLASSICAL': return { elo: p.classical_elo, games: p.classical_games, peak: p.peak_classical_elo };
    default: return { elo: p.blitz_elo, games: p.blitz_games, peak: p.peak_blitz_elo };
  }
}

export async function fetchAndPreviewArena(
  arenaId: string
): Promise<ArenaPreviewResult> {
  const res = await fetch(`https://lichess.org/api/tournament/${arenaId}/games`, {
    headers: { Accept: 'application/x-ndjson' },
  });

  if (!res.ok) throw new Error('Failed to retrieve Lichess Arena data.');

  const text = await res.text();
  // Lichess returns games most recent first; reverse to process chronologically (oldest first)
  const rawGames: RawLichessGame[] = text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .reverse();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_immortal', false);

  if (error || !profiles) throw new Error('Failed to load FCA member profiles.');

  // Fetch existing games to detect duplicates
  const { data: existingGames } = await supabase
    .from('games')
    .select('event_name, lichess_game_id, external_url');

  const existingGameIds = new Set<string>();
  if (existingGames) {
    existingGames.forEach(g => {
      const extractedId = extractLichessGameId(g);
      if (extractedId) existingGameIds.add(extractedId);
    });
  }

  const profileMap = new Map<string, ProfileRow>(
    profiles
      .filter((p: ProfileRow) => p.lichess_username && p.lichess_username.trim())
      .map((p: ProfileRow) => [p.lichess_username!.trim().toLowerCase(), p])
  );

  const previewGames: PreviewGame[] = [];
  const linkedSet = new Set<string>();
  const unlinkedSet = new Set<string>();
  let alreadyImportedCount = 0;

  // Track running Elo and games played state per profile ID across sequential games in this arena
  const runningStatsMap = new Map<string, { elo: number; games: number; peak: number }>();

  function getRunningStats(p: ProfileRow, mode: GameMode) {
    let stats = runningStatsMap.get(p.id);
    if (!stats) {
      stats = getModeEloAndGames(p, mode);
      runningStatsMap.set(p.id, { ...stats });
    }
    return stats;
  }

  for (const game of rawGames) {
    const rawWhiteName = game.players.white.user?.name;
    const rawBlackName = game.players.black.user?.name;

    const whiteHandle = rawWhiteName?.trim().toLowerCase();
    const blackHandle = rawBlackName?.trim().toLowerCase();

    if (!whiteHandle || !blackHandle) continue;

    const whiteProfile = profileMap.get(whiteHandle);
    const blackProfile = profileMap.get(blackHandle);

    if (!whiteProfile || !blackProfile) {
      if (!whiteProfile) unlinkedSet.add(rawWhiteName || whiteHandle);
      if (!blackProfile) unlinkedSet.add(rawBlackName || blackHandle);
      continue;
    }

    linkedSet.add(rawWhiteName || whiteProfile.lichess_username || whiteHandle);
    linkedSet.add(rawBlackName || blackProfile.lichess_username || blackHandle);

    const gameId = game.id;
    const externalUrl = `https://lichess.org/${gameId}`;
    const isAlreadyImported = existingGameIds.has(gameId);
    const mode = parseMode(game.speed);

    if (isAlreadyImported) {
      alreadyImportedCount++;
    }

    let scoreWhite = 0.5;
    if (game.winner === 'white') scoreWhite = 1.0;
    else if (game.winner === 'black') scoreWhite = 0.0;

    const whiteStats = getRunningStats(whiteProfile, mode);
    const blackStats = getRunningStats(blackProfile, mode);

    const kWhite = getKFactor(whiteStats.games);
    const kBlack = getKFactor(blackStats.games);

    const { newA, newB } = calculateElo(
      whiteStats.elo,
      blackStats.elo,
      scoreWhite,
      kWhite,
      kBlack
    );

    let resultLabel = 'Draw';
    if (scoreWhite === 1.0) resultLabel = 'White wins';
    else if (scoreWhite === 0.0) resultLabel = 'Black wins';

    previewGames.push({
      lichessGameId: gameId,
      externalUrl,
      mode,
      isAlreadyImported,
      whitePlayer: whiteProfile as unknown as PreviewGame['whitePlayer'],
      blackPlayer: blackProfile as unknown as PreviewGame['blackPlayer'],
      whiteLichessHandle: rawWhiteName || whiteProfile.lichess_username || undefined,
      blackLichessHandle: rawBlackName || blackProfile.lichess_username || undefined,
      result: scoreWhite,
      resultLabel,
      whiteEloOld: whiteStats.elo,
      whiteEloNew: newA,
      blackEloOld: blackStats.elo,
      blackEloNew: newB,
    });

    if (!isAlreadyImported) {
      runningStatsMap.set(whiteProfile.id, {
        elo: newA,
        games: whiteStats.games + 1,
        peak: Math.max(whiteStats.peak, newA),
      });
      runningStatsMap.set(blackProfile.id, {
        elo: newB,
        games: blackStats.games + 1,
        peak: Math.max(blackStats.peak, newB),
      });
    }
  }

  return {
    games: previewGames,
    linkedUsernames: Array.from(linkedSet).sort(),
    unlinkedUsernames: Array.from(unlinkedSet).sort(),
    totalRawGames: rawGames.length,
    alreadyImportedCount,
  };
}

export async function commitArenaImport(
  games: PreviewGame[],
  eventName: string,
  onProgress?: (processed: number, total: number) => void
): Promise<ArenaImportReport> {
  const report: ArenaImportReport = {
    processedGames: 0,
    skippedDuplicateGames: 0,
    skippedUnlinkedGames: 0,
    unlinkedUsernames: [],
  };

  const playableGames = games.filter(g => !g.isAlreadyImported);
  const totalToProcess = playableGames.length;

  if (onProgress) {
    onProgress(0, totalToProcess);
  }

  // Running profile state map for all profiles updated during this commit batch
  const runningProfilesMap = new Map<string, ProfileRow>();

  for (const game of games) {
    if (game.isAlreadyImported) {
      report.skippedDuplicateGames++;
      continue;
    }

    const payloadWithExtra = {
      white_player_id: game.whitePlayer.id,
      black_player_id: game.blackPlayer.id,
      mode: game.mode,
      result: game.result,
      source: 'LICHESS_ARENA',
      event_name: eventName,
      white_elo_before: game.whiteEloOld,
      white_elo_after: game.whiteEloNew,
      black_elo_before: game.blackEloOld,
      black_elo_after: game.blackEloNew,
      lichess_game_id: game.lichessGameId,
      external_url: game.externalUrl,
    };

    const { error: insertErr } = await supabase.from('games').insert(payloadWithExtra);

    if (insertErr) {
      // Fallback if extra columns failed
      await supabase.from('games').insert({
        white_player_id: game.whitePlayer.id,
        black_player_id: game.blackPlayer.id,
        mode: game.mode,
        result: game.result,
        source: 'LICHESS_ARENA',
        event_name: `${eventName} [${game.lichessGameId}]`,
        white_elo_before: game.whiteEloOld,
        white_elo_after: game.whiteEloNew,
        black_elo_before: game.blackEloOld,
        black_elo_after: game.blackEloNew,
      });
    }

    const mode = game.mode;

    // Track/Update White Player running state
    const w = game.whitePlayer;
    let wProfile = runningProfilesMap.get(w.id);
    if (!wProfile) {
      wProfile = { ...(w as unknown as ProfileRow) };
    }

    if (mode === 'RAPID') {
      wProfile.rapid_elo = game.whiteEloNew;
      wProfile.rapid_games += 1;
      wProfile.peak_rapid_elo = Math.max(wProfile.peak_rapid_elo, game.whiteEloNew);
    } else if (mode === 'BULLET') {
      wProfile.bullet_elo = game.whiteEloNew;
      wProfile.bullet_games += 1;
      wProfile.peak_bullet_elo = Math.max(wProfile.peak_bullet_elo, game.whiteEloNew);
    } else if (mode === 'CLASSICAL') {
      wProfile.classical_elo = game.whiteEloNew;
      wProfile.classical_games += 1;
      wProfile.peak_classical_elo = Math.max(wProfile.peak_classical_elo, game.whiteEloNew);
    } else {
      wProfile.blitz_elo = game.whiteEloNew;
      wProfile.blitz_games += 1;
      wProfile.peak_blitz_elo = Math.max(wProfile.peak_blitz_elo, game.whiteEloNew);
    }

    const maxPeakW = Math.max(
      wProfile.peak_blitz_elo,
      wProfile.peak_rapid_elo,
      wProfile.peak_bullet_elo,
      wProfile.peak_classical_elo
    );
    const titleW = getTitleForRating(maxPeakW);
    if (titleW !== 'NONE') wProfile.earned_title = titleW;

    runningProfilesMap.set(w.id, wProfile);

    // Track/Update Black Player running state
    const b = game.blackPlayer;
    let bProfile = runningProfilesMap.get(b.id);
    if (!bProfile) {
      bProfile = { ...(b as unknown as ProfileRow) };
    }

    if (mode === 'RAPID') {
      bProfile.rapid_elo = game.blackEloNew;
      bProfile.rapid_games += 1;
      bProfile.peak_rapid_elo = Math.max(bProfile.peak_rapid_elo, game.blackEloNew);
    } else if (mode === 'BULLET') {
      bProfile.bullet_elo = game.blackEloNew;
      bProfile.bullet_games += 1;
      bProfile.peak_bullet_elo = Math.max(bProfile.peak_bullet_elo, game.blackEloNew);
    } else if (mode === 'CLASSICAL') {
      bProfile.classical_elo = game.blackEloNew;
      bProfile.classical_games += 1;
      bProfile.peak_classical_elo = Math.max(bProfile.peak_classical_elo, game.blackEloNew);
    } else {
      bProfile.blitz_elo = game.blackEloNew;
      bProfile.blitz_games += 1;
      bProfile.peak_blitz_elo = Math.max(bProfile.peak_blitz_elo, game.blackEloNew);
    }

    const maxPeakB = Math.max(
      bProfile.peak_blitz_elo,
      bProfile.peak_rapid_elo,
      bProfile.peak_bullet_elo,
      bProfile.peak_classical_elo
    );
    const titleB = getTitleForRating(maxPeakB);
    if (titleB !== 'NONE') bProfile.earned_title = titleB;

    runningProfilesMap.set(b.id, bProfile);

    report.processedGames++;

    if (onProgress) {
      onProgress(report.processedGames, totalToProcess);
    }
  }

  // Commit all updated profile stats to DB
  for (const [profileId, p] of runningProfilesMap.entries()) {
    const updatePayload: Record<string, number | string> = {
      blitz_elo: p.blitz_elo,
      blitz_games: p.blitz_games,
      peak_blitz_elo: p.peak_blitz_elo,
      rapid_elo: p.rapid_elo,
      rapid_games: p.rapid_games,
      peak_rapid_elo: p.peak_rapid_elo,
      bullet_elo: p.bullet_elo,
      bullet_games: p.bullet_games,
      peak_bullet_elo: p.peak_bullet_elo,
      classical_elo: p.classical_elo,
      classical_games: p.classical_games,
      peak_classical_elo: p.peak_classical_elo,
      earned_title: p.earned_title,
    };
    await supabase.from('profiles').update(updatePayload).eq('id', profileId);
  }

  if (report.processedGames > 0 && eventName) {
    try {
      const clean = eventName.replace(/\s*\[[a-zA-Z0-9]{8,12}\]/, '').trim();
      await supabase
        .from('tournaments')
        .update({ status: 'COMPLETED' })
        .ilike('title', clean);
    } catch {
      // Ignore if matching scheduled tournament title does not exist
    }
  }

  return report;
}

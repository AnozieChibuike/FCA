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
  const rawGames: RawLichessGame[] = text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));

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

    const whiteStats = getModeEloAndGames(whiteProfile, mode);
    const blackStats = getModeEloAndGames(blackProfile, mode);

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
  eventName: string
): Promise<ArenaImportReport> {
  const report: ArenaImportReport = {
    processedGames: 0,
    skippedDuplicateGames: 0,
    skippedUnlinkedGames: 0,
    unlinkedUsernames: [],
  };

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
      lichess_game_id: game.lichessGameId,
      external_url: game.externalUrl,
    };

    const { error: insertErr } = await supabase.from('games').insert(payloadWithExtra);

    if (insertErr) {
      // Fallback if lichess_game_id or external_url columns do not exist in database table schema
      await supabase.from('games').insert({
        white_player_id: game.whitePlayer.id,
        black_player_id: game.blackPlayer.id,
        mode: game.mode,
        result: game.result,
        source: 'LICHESS_ARENA',
        event_name: `${eventName} [${game.lichessGameId}]`,
      });
    }

    // Update White Player stats based on mode
    const w = game.whitePlayer;
    const mode = game.mode;
    const updateW: Record<string, number | string> = {};

    if (mode === 'RAPID') {
      updateW.rapid_elo = game.whiteEloNew;
      updateW.rapid_games = w.rapid_games + 1;
      updateW.peak_rapid_elo = Math.max(w.peak_rapid_elo, game.whiteEloNew);
    } else if (mode === 'BULLET') {
      updateW.bullet_elo = game.whiteEloNew;
      updateW.bullet_games = w.bullet_games + 1;
      updateW.peak_bullet_elo = Math.max(w.peak_bullet_elo, game.whiteEloNew);
    } else if (mode === 'CLASSICAL') {
      updateW.classical_elo = game.whiteEloNew;
      updateW.classical_games = w.classical_games + 1;
      updateW.peak_classical_elo = Math.max(w.peak_classical_elo, game.whiteEloNew);
    } else {
      updateW.blitz_elo = game.whiteEloNew;
      updateW.blitz_games = w.blitz_games + 1;
      updateW.peak_blitz_elo = Math.max(w.peak_blitz_elo, game.whiteEloNew);
    }

    const maxPeakW = Math.max(
      mode === 'BLITZ' ? game.whiteEloNew : w.peak_blitz_elo,
      mode === 'RAPID' ? game.whiteEloNew : w.peak_rapid_elo,
      mode === 'BULLET' ? game.whiteEloNew : w.peak_bullet_elo,
      mode === 'CLASSICAL' ? game.whiteEloNew : w.peak_classical_elo
    );
    const titleW = getTitleForRating(maxPeakW);
    if (titleW !== 'NONE') updateW.earned_title = titleW;

    await supabase.from('profiles').update(updateW).eq('id', w.id);

    // Update Black Player stats based on mode
    const b = game.blackPlayer;
    const updateB: Record<string, number | string> = {};

    if (mode === 'RAPID') {
      updateB.rapid_elo = game.blackEloNew;
      updateB.rapid_games = b.rapid_games + 1;
      updateB.peak_rapid_elo = Math.max(b.peak_rapid_elo, game.blackEloNew);
    } else if (mode === 'BULLET') {
      updateB.bullet_elo = game.blackEloNew;
      updateB.bullet_games = b.bullet_games + 1;
      updateB.peak_bullet_elo = Math.max(b.peak_bullet_elo, game.blackEloNew);
    } else if (mode === 'CLASSICAL') {
      updateB.classical_elo = game.blackEloNew;
      updateB.classical_games = b.classical_games + 1;
      updateB.peak_classical_elo = Math.max(b.peak_classical_elo, game.blackEloNew);
    } else {
      updateB.blitz_elo = game.blackEloNew;
      updateB.blitz_games = b.blitz_games + 1;
      updateB.peak_blitz_elo = Math.max(b.peak_blitz_elo, game.blackEloNew);
    }

    const maxPeakB = Math.max(
      mode === 'BLITZ' ? game.blackEloNew : b.peak_blitz_elo,
      mode === 'RAPID' ? game.blackEloNew : b.peak_rapid_elo,
      mode === 'BULLET' ? game.blackEloNew : b.peak_bullet_elo,
      mode === 'CLASSICAL' ? game.blackEloNew : b.peak_classical_elo
    );
    const titleB = getTitleForRating(maxPeakB);
    if (titleB !== 'NONE') updateB.earned_title = titleB;

    await supabase.from('profiles').update(updateB).eq('id', b.id);

    report.processedGames++;
  }

  return report;
}

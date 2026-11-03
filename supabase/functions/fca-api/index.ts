// fca-api: Lichess arena sync, 1-click imports, resync, account linking and achievements.
//
// Actions (POST JSON { action, ... }):
//   tick                 anyone (cron)  discover finished/upcoming arenas, backfill, standings, achievements
//   stage_arena          staff          stage a specific arena by link or id for approval
//   approve_import       staff          apply a staged import, re-rate everyone, refresh achievements
//   dismiss_import       staff
//   resync               staff          find arena games that were never imported (optionally for one member)
//   recalculate          staff          full rating replay
//   refresh_achievements staff
//   link_lichess         member         verify a Lichess OAuth token server-side and link the account
//   unlink_account       member
//   chesscom_start       member         issue a code to put in the Chess.com Location field
//   chesscom_verify      member
//   reset_link           admin          password recovery link to send a member (no email provider needed)

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { ACHIEVEMENT_MAP, computeAchievements } from './achievements.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const LICHESS = 'https://lichess.org';
const USER_AGENT = 'FCA-Rated/1.0 (FUTO Chess Association rating platform)';
const TICK_COOLDOWN_MS = 60_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function mostCommon(values: Array<string | null | undefined>): string | null {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) || 0) + 1);
  let best: string | null = null;
  let bestN = 0;
  for (const [v, n] of counts) if (n > bestN) { best = v; bestN = n; }
  return best;
}

// deno-lint-ignore no-explicit-any
type Query = PromiseLike<{ data: any[] | null; error: { message: string } | null }>;

async function fetchAll<T>(build: (from: number, to: number) => Query): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new HttpError(500, error.message);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Lichess
// ---------------------------------------------------------------------------

interface LichessSide { user?: { name?: string; id?: string }; rating?: number }
interface LichessGame {
  id: string;
  speed?: string;
  createdAt: number;
  winner?: 'white' | 'black';
  players: { white: LichessSide; black: LichessSide };
  arenaTour?: { id: string; name?: string };
  tournament?: string;
}
interface LichessArena {
  id: string;
  fullName: string;
  createdBy?: string;
  startsAt: string | number;
  finishesAt?: string | number;
  nbPlayers?: number;
  isFinished?: boolean;
  isStarted?: boolean;
  secondsToStart?: number;
  status?: number;
  minutes?: number;
  clock?: { limit: number; increment: number };
  perf?: { key?: string } | string;
}
interface LichessResult { rank: number; score?: number; rating?: number; username: string; performance?: number }

interface StagedGame {
  id: string;
  white: string;
  black: string;
  winner: 'white' | 'black' | null;
  speed: string;
  createdAt: number;
  arenaId: string | null;
  event: string | null;
}

async function lichessFetch(path: string, init: RequestInit = {}, accept = 'application/json') {
  const res = await fetch(`${LICHESS}${path}`, {
    ...init,
    headers: { Accept: accept, 'User-Agent': USER_AGENT, ...(init.headers ?? {}) },
  });
  if (res.status === 429) throw new HttpError(503, 'Lichess is rate-limiting us. Try again in a minute.');
  if (res.status === 404) throw new HttpError(404, 'Not found on Lichess. Check the arena link.');
  if (!res.ok) throw new HttpError(502, `Lichess request failed (${res.status}).`);
  return res;
}

async function lichessJson<T>(path: string): Promise<T> {
  return (await lichessFetch(path)).json() as Promise<T>;
}

async function lichessNdjson<T>(path: string, init: RequestInit = {}): Promise<T[]> {
  const text = await (await lichessFetch(path, init, 'application/x-ndjson')).text();
  return text.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as T);
}

function arenaGames(arenaId: string) {
  return lichessNdjson<LichessGame>(`/api/tournament/${arenaId}/games?moves=false&opening=false&clocks=false&evals=false`);
}

interface Arena {
  id: string;
  name: string;
  createdBy: string | null;
  startsAt: Date;
  finishesAt: Date;
  status: number; // 10 created, 20 started, 30 finished
  nbPlayers: number;
  clock: { limit: number; increment: number } | null;
  perfKey: string;
}

function normalizeArena(a: LichessArena): Arena {
  const startsAt = new Date(a.startsAt);
  const finishesAt = a.finishesAt ? new Date(a.finishesAt) : new Date(startsAt.getTime() + (a.minutes ?? 60) * 60_000);
  const status = a.status ?? (a.isFinished ? 30 : a.isStarted || (a.secondsToStart === undefined && startsAt <= new Date()) ? 20 : 10);
  const perfKey = (typeof a.perf === 'string' ? a.perf : a.perf?.key) ?? 'blitz';
  return {
    id: a.id,
    name: a.fullName,
    createdBy: a.createdBy ?? null,
    startsAt,
    finishesAt,
    status,
    nbPlayers: a.nbPlayers ?? 0,
    clock: a.clock ?? null,
    perfKey,
  };
}

function speedToMode(speed: string | undefined) {
  const s = (speed ?? '').toLowerCase();
  if (s === 'bullet' || s === 'ultrabullet') return 'BULLET';
  if (s === 'rapid') return 'RAPID';
  if (s === 'classical' || s === 'correspondence') return 'CLASSICAL';
  return 'BLITZ';
}

function formatClock(clock: { limit: number; increment: number }) {
  const minutes = clock.limit / 60;
  return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)}+${clock.increment}`;
}

// "FCA Titled Tuesday Arena" on Nov 3 -> "FCA TITLED TUESDAY | #NOVEMBER3" (the club's naming convention).
function defaultEventName(name: string, startsAt: Date) {
  const base = name.replace(/\s+arena$/i, '').trim().toUpperCase();
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Lagos', month: 'long', day: 'numeric' }).formatToParts(startsAt);
  const month = parts.find((p) => p.type === 'month')?.value.toUpperCase() ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  return `${base} | #${month}${day}`;
}

function parseArenaId(input: unknown): string {
  const raw = String(input ?? '').trim();
  const fromUrl = raw.match(/tournament\/([A-Za-z0-9]{8})/);
  const id = fromUrl ? fromUrl[1] : raw;
  if (!/^[A-Za-z0-9]{8}$/.test(id)) throw new HttpError(400, 'Paste a Lichess arena link like lichess.org/tournament/AbCd1234.');
  return id;
}

function toStaged(g: LichessGame, arenaId: string | null, event: string | null): StagedGame {
  return {
    id: g.id,
    white: g.players.white.user?.name ?? '',
    black: g.players.black.user?.name ?? '',
    winner: g.winner ?? null,
    speed: g.speed ?? 'blitz',
    createdAt: g.createdAt,
    arenaId,
    event,
  };
}

// ---------------------------------------------------------------------------
// Database helpers
// ---------------------------------------------------------------------------

async function getSettings() {
  const { data } = await admin.from('app_settings').select('key, value');
  const map = new Map((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
  const creators = map.get('lichess_creators');
  return {
    creators: Array.isArray(creators) ? creators.map(String) : ['bona-8'],
    nameFilter: typeof map.get('arena_name_filter') === 'string' ? String(map.get('arena_name_filter')) : '',
    since: Date.parse(typeof map.get('discovery_since') === 'string' ? String(map.get('discovery_since')) : '2026-10-28'),
  };
}

async function linkedProfiles() {
  const rows = await fetchAll<{ id: string; lichess_username: string | null; is_immortal: boolean | null; full_name: string }>(
    (a, b) => admin.from('profiles').select('id, lichess_username, is_immortal, full_name').not('lichess_username', 'is', null).range(a, b),
  );
  const map = new Map<string, { id: string; name: string }>();
  for (const r of rows) {
    if (r.lichess_username && !r.is_immortal) map.set(r.lichess_username.trim().toLowerCase(), { id: r.id, name: r.full_name });
  }
  return map;
}

/** lichess id -> event_name for games already in the database */
async function existingGames(ids: string[]) {
  const found = new Map<string, string>();
  for (const chunk of chunks(ids, 150)) {
    const { data, error } = await admin.from('games').select('lichess_game_id, event_name').in('lichess_game_id', chunk);
    if (error) throw new HttpError(500, error.message);
    for (const r of data ?? []) if (r.lichess_game_id) found.set(r.lichess_game_id, r.event_name);
  }
  return found;
}

async function upsertTournament(a: Arena, eventNameHint: string | null = null): Promise<{ id: string; title: string }> {
  const base = {
    start_date: a.startsAt.toISOString(),
    ends_at: a.finishesAt.toISOString(),
    nb_players: a.nbPlayers,
    lichess_status: a.status,
    lichess_creator: a.createdBy,
    time_control: a.clock ? formatClock(a.clock) : null,
    mode: speedToMode(a.perfKey),
    is_online: true,
    location: 'Lichess',
    status: a.status >= 30 ? 'COMPLETED' : a.status >= 20 ? 'ONGOING' : 'SCHEDULED',
    synced_at: new Date().toISOString(),
  };

  const { data: byArena } = await admin.from('tournaments').select('id, title, status').eq('lichess_arena_id', a.id).maybeSingle();
  if (byArena) {
    const status = byArena.status === 'COMPLETED' ? 'COMPLETED' : base.status;
    const { data, error } = await admin.from('tournaments').update({ ...base, status }).eq('id', byArena.id).select('id, title').single();
    if (error) throw new HttpError(500, error.message);
    return data;
  }

  // A row an arbiter scheduled by hand for the same session gets linked instead of duplicated.
  const window = 3 * 3600_000;
  const { data: near } = await admin
    .from('tournaments')
    .select('id, title, start_date, mode')
    .is('lichess_arena_id', null)
    .gte('start_date', new Date(a.startsAt.getTime() - window).toISOString())
    .lte('start_date', new Date(a.startsAt.getTime() + window).toISOString());
  let candidate: { id: string; title: string } | undefined = (near ?? [])
    .filter((t: { mode: string }) => t.mode === base.mode)
    .sort((x: { start_date: string }, y: { start_date: string }) =>
      Math.abs(Date.parse(x.start_date) - a.startsAt.getTime()) - Math.abs(Date.parse(y.start_date) - a.startsAt.getTime()))[0];
  if (!candidate && eventNameHint) {
    const { data: byTitle } = await admin.from('tournaments').select('id, title').is('lichess_arena_id', null).eq('title', eventNameHint).limit(1);
    candidate = byTitle?.[0];
  }
  if (candidate) {
    const { data, error } = await admin.from('tournaments').update({ ...base, lichess_arena_id: a.id }).eq('id', candidate.id).select('id, title').single();
    if (error) throw new HttpError(500, error.message);
    return data;
  }

  const { data, error } = await admin
    .from('tournaments')
    .insert({ ...base, lichess_arena_id: a.id, title: eventNameHint || defaultEventName(a.name, a.startsAt), description: '' })
    .select('id, title')
    .single();
  if (error) throw new HttpError(500, error.message);
  return data;
}

async function saveResults(tournamentId: string, arenaId: string, games: LichessGame[]) {
  const results = await lichessNdjson<LichessResult>(`/api/tournament/${arenaId}/results?nb=1000`);
  const tally = new Map<string, { games: number; wins: number }>();
  for (const g of games) {
    for (const side of ['white', 'black'] as const) {
      const name = g.players[side].user?.name?.toLowerCase();
      if (!name) continue;
      const t = tally.get(name) ?? { games: 0, wins: 0 };
      t.games++;
      if (g.winner === side) t.wins++;
      tally.set(name, t);
    }
  }
  const rows = results.map((r) => {
    const t = tally.get(r.username.toLowerCase());
    return {
      tournament_id: tournamentId,
      lichess_username: r.username,
      rank: r.rank,
      score: r.score ?? 0,
      rating: r.rating ?? null,
      performance: r.performance ?? null,
      games: t?.games ?? 0,
      wins: t?.wins ?? 0,
    };
  });
  for (const chunk of chunks(rows, 500)) {
    const { error } = await admin.from('tournament_results').upsert(chunk, { onConflict: 'tournament_id,lichess_username' });
    if (error) throw new HttpError(500, error.message);
  }
  await admin.from('tournaments').update({ results_synced_at: new Date().toISOString(), nb_players: results.length }).eq('id', tournamentId);
  return rows.length;
}

async function recalc(client: SupabaseClient = admin) {
  const { data, error } = await client.rpc('recalculate_ratings');
  if (error) throw new HttpError(400, error.message);
  return data;
}

// ---------------------------------------------------------------------------
// Staging, discovery, backfill, resync
// ---------------------------------------------------------------------------

async function stageArena(arenaId: string, opts: { reason: string; manual: boolean }) {
  const arena = normalizeArena(await lichessJson<LichessArena>(`/api/tournament/${arenaId}`));
  if (arena.status < 30) {
    await upsertTournament(arena);
    if (opts.manual) {
      throw new HttpError(409, arena.status >= 20 ? 'This arena is still running. Import it once it finishes.' : 'This arena has not started yet.');
    }
    return null;
  }

  const games = await arenaGames(arenaId);
  const existing = await existingGames(games.map((g) => g.id));
  const tournament = await upsertTournament(arena, mostCommon([...existing.values()]));
  await saveResults(tournament.id, arenaId, games);

  // Games the old importer already saved: give them exact start times and the event link.
  if (existing.size) {
    const meta = games
      .filter((g) => existing.has(g.id))
      .map((g) => ({ id: g.id, played_at: new Date(g.createdAt).toISOString(), tournament_id: tournament.id }));
    await admin.rpc('bulk_set_game_meta', { p_rows: meta });
  }

  const linked = await linkedProfiles();
  const players = new Set<string>();
  const linkedPlayers = new Set<string>();
  const unlinked = new Set<string>();
  let rated = 0;
  let fresh = 0;
  const staged: StagedGame[] = [];
  for (const g of games) {
    const w = g.players.white.user?.name;
    const b = g.players.black.user?.name;
    if (!w || !b) continue;
    staged.push(toStaged(g, arenaId, tournament.title));
    for (const name of [w, b]) {
      players.add(name.toLowerCase());
      if (linked.has(name.toLowerCase())) linkedPlayers.add(name.toLowerCase());
      else unlinked.add(name);
    }
    const wl = linked.get(w.toLowerCase());
    const bl = linked.get(b.toLowerCase());
    if (wl && bl && wl.id !== bl.id) {
      rated++;
      if (!existing.has(g.id)) fresh++;
    }
  }

  const dateLabel = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short' }).format(arena.startsAt);
  const row = {
    kind: 'ARENA',
    lichess_arena_id: arenaId,
    tournament_id: tournament.id,
    title: `${arena.name} · ${dateLabel}`,
    event_name: tournament.title,
    starts_at: arena.startsAt.toISOString(),
    games: staged,
    total_games: games.length,
    rated_games: rated,
    new_games: fresh,
    players: players.size,
    linked_players: linkedPlayers.size,
    unlinked_players: [...unlinked].sort((x, y) => x.localeCompare(y)),
    reason: opts.reason,
    status: fresh > 0 ? 'PENDING' : 'EMPTY',
    detected_at: new Date().toISOString(),
  };

  const { data: pending } = await admin
    .from('arena_imports')
    .select('id')
    .eq('kind', 'ARENA')
    .eq('lichess_arena_id', arenaId)
    .eq('status', 'PENDING')
    .maybeSingle();
  const write = pending
    ? admin.from('arena_imports').update(row).eq('id', pending.id).select('id, status, new_games, rated_games, title').single()
    : admin.from('arena_imports').insert(row).select('id, status, new_games, rated_games, title').single();
  const { data, error } = await write;
  if (error) throw new HttpError(500, error.message);
  return data;
}

async function discover() {
  const settings = await getSettings();
  const staged: string[] = [];
  const upcoming: string[] = [];
  for (const creator of settings.creators) {
    const arenas = await lichessNdjson<LichessArena>(`/api/user/${encodeURIComponent(creator)}/tournament/created?nb=15`);
    for (const raw of arenas) {
      const arena = normalizeArena(raw);
      if (settings.nameFilter && !arena.name.toLowerCase().includes(settings.nameFilter.toLowerCase())) continue;
      if (arena.startsAt.getTime() < settings.since) continue;
      if (arena.status < 30) {
        await upsertTournament(arena);
        upcoming.push(arena.id);
        continue;
      }
      const { data: seen } = await admin.from('arena_imports').select('id').eq('kind', 'ARENA').eq('lichess_arena_id', arena.id).limit(1);
      if (seen?.length) continue;
      const row = await stageArena(arena.id, { reason: `Detected automatically (arena by ${creator})`, manual: false });
      if (row) staged.push(row.id);
      await sleep(500);
    }
    await sleep(500);
  }
  return { staged, upcoming };
}

/** Exact Lichess start times and event links for games saved by the old browser importer. */
async function backfillGames(limit = 900) {
  const { data: rows, error } = await admin
    .from('games')
    .select('lichess_game_id, event_name, tournament_id')
    .eq('played_at_exact', false)
    .not('lichess_game_id', 'is', null)
    .limit(limit);
  if (error) throw new HttpError(500, error.message);
  if (!rows?.length) return 0;

  const updates: Array<{ id: string; played_at: string | null; arenaId: string | null; eventName: string }> = [];
  for (const chunk of chunks(rows, 300)) {
    const found = await lichessNdjson<LichessGame>('/api/games/export/_ids?moves=false&opening=false&clocks=false&evals=false', {
      method: 'POST',
      body: chunk.map((r: { lichess_game_id: string }) => r.lichess_game_id).join(','),
      headers: { 'Content-Type': 'text/plain' },
    });
    const byId = new Map(found.map((g) => [g.id, g]));
    for (const r of chunk) {
      const g = byId.get(r.lichess_game_id);
      updates.push({
        id: r.lichess_game_id,
        played_at: g ? new Date(g.createdAt).toISOString() : null,
        arenaId: g?.tournament ?? g?.arenaTour?.id ?? null,
        eventName: r.event_name,
      });
    }
    await sleep(1000);
  }

  const arenaTournament = new Map<string, string>();
  for (const arenaId of new Set(updates.map((u) => u.arenaId).filter((x): x is string => !!x))) {
    const { data: t } = await admin.from('tournaments').select('id').eq('lichess_arena_id', arenaId).maybeSingle();
    if (t) {
      arenaTournament.set(arenaId, t.id);
      continue;
    }
    const arena = normalizeArena(await lichessJson<LichessArena>(`/api/tournament/${arenaId}`));
    const hint = mostCommon(updates.filter((u) => u.arenaId === arenaId).map((u) => u.eventName));
    arenaTournament.set(arenaId, (await upsertTournament(arena, hint)).id);
    await sleep(500);
  }

  const payload = updates.map((u) => ({
    id: u.id,
    played_at: u.played_at,
    tournament_id: u.arenaId ? arenaTournament.get(u.arenaId) ?? null : null,
  }));
  const { data: updated, error: rpcError } = await admin.rpc('bulk_set_game_meta', { p_rows: payload });
  if (rpcError) throw new HttpError(500, rpcError.message);
  return Number(updated ?? 0);
}

async function syncMissingResults(max = 4) {
  const { data } = await admin
    .from('tournaments')
    .select('id, lichess_arena_id')
    .not('lichess_arena_id', 'is', null)
    .is('results_synced_at', null)
    .eq('lichess_status', 30)
    .order('start_date')
    .limit(max);
  for (const t of data ?? []) {
    await saveResults(t.id, t.lichess_arena_id, await arenaGames(t.lichess_arena_id));
    await sleep(800);
  }
  return data?.length ?? 0;
}

async function resync(opts: { playerId: string | null; reason: string }) {
  const linked = await linkedProfiles();
  let player: { id: string; name: string; handle: string } | null = null;
  let events: Array<{ id: string; lichess_arena_id: string; title: string }> = [];

  if (opts.playerId) {
    const { data: p } = await admin.from('profiles').select('id, full_name, lichess_username').eq('id', opts.playerId).maybeSingle();
    if (!p?.lichess_username) throw new HttpError(400, 'That member has no Lichess account linked.');
    player = { id: p.id, name: p.full_name, handle: p.lichess_username.toLowerCase() };
    const results = await fetchAll<{ tournament_id: string; lichess_username: string }>(
      (a, b) => admin.from('tournament_results').select('tournament_id, lichess_username').range(a, b),
    );
    const ids = [...new Set(results.filter((r) => r.lichess_username.toLowerCase() === player!.handle).map((r) => r.tournament_id))];
    if (!ids.length) return { missing: 0, scanned: 0 };
    const { data } = await admin.from('tournaments').select('id, lichess_arena_id, title').in('id', ids).not('lichess_arena_id', 'is', null);
    events = data ?? [];
  } else {
    const { data } = await admin
      .from('tournaments')
      .select('id, lichess_arena_id, title')
      .not('lichess_arena_id', 'is', null)
      .eq('lichess_status', 30)
      .order('start_date');
    events = data ?? [];
  }

  const missing: StagedGame[] = [];
  const players = new Set<string>();
  for (const t of events) {
    const games = await arenaGames(t.lichess_arena_id);
    const candidates = games.filter((g) => {
      const w = g.players.white.user?.name?.toLowerCase();
      const b = g.players.black.user?.name?.toLowerCase();
      if (!w || !b || w === b || !linked.has(w) || !linked.has(b)) return false;
      return !player || w === player.handle || b === player.handle;
    });
    const existing = await existingGames(candidates.map((g) => g.id));
    for (const g of candidates) {
      if (existing.has(g.id)) continue;
      missing.push(toStaged(g, t.lichess_arena_id, t.title));
      players.add(g.players.white.user!.name!.toLowerCase());
      players.add(g.players.black.user!.name!.toLowerCase());
    }
    await sleep(600);
  }
  if (!missing.length) return { missing: 0, scanned: events.length };

  const title = player
    ? `Missing games for ${player.name}`
    : `Resync: ${missing.length} missing game${missing.length === 1 ? '' : 's'}`;
  const row = {
    kind: 'RESYNC',
    status: 'PENDING',
    title,
    event_name: 'Resync',
    games: missing,
    total_games: missing.length,
    rated_games: missing.length,
    new_games: missing.length,
    players: players.size,
    linked_players: players.size,
    reason: opts.reason,
    starts_at: new Date(Math.min(...missing.map((g) => g.createdAt))).toISOString(),
    detected_at: new Date().toISOString(),
  };

  // One open resync per scope: refresh it instead of stacking duplicates.
  const { data: open } = await admin.from('arena_imports').select('id').eq('kind', 'RESYNC').eq('status', 'PENDING').eq('title', title).maybeSingle();
  const write = open
    ? admin.from('arena_imports').update(row).eq('id', open.id).select('id').single()
    : admin.from('arena_imports').insert(row).select('id').single();
  const { data, error } = await write;
  if (error) throw new HttpError(500, error.message);
  return { missing: missing.length, scanned: events.length, import_id: data.id };
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

async function refreshAchievements() {
  const [profiles, games, tournaments, results, existing] = await Promise.all([
    fetchAll<any>((a, b) => admin.from('profiles')
      .select('id, lichess_username, chesscom_username, avatar_url, bio, gender, created_at, is_admin, is_arbiter, is_immortal, earned_title, invited_by, status')
      .order('id').range(a, b)),
    fetchAll<any>((a, b) => admin.from('games')
      .select('id, white_player_id, black_player_id, mode, result, played_at, tournament_id, source, is_official, white_elo_before, white_elo_after, black_elo_before, black_elo_after')
      .order('played_at').order('id').range(a, b)),
    fetchAll<any>((a, b) => admin.from('tournaments').select('id, title, start_date, lichess_arena_id').order('id').range(a, b)),
    fetchAll<any>((a, b) => admin.from('tournament_results').select('tournament_id, lichess_username, rank, games')
      .order('tournament_id').order('rank').range(a, b)),
    fetchAll<any>((a, b) => admin.from('player_achievements').select('player_id, achievement_key, earned_at, progress, target')
      .order('player_id').order('achievement_key').range(a, b)),
  ]);

  const rows = computeAchievements({ profiles, games, tournaments, results });
  const before = new Map(existing.map((e: any) => [`${e.player_id}|${e.achievement_key}`, e]));
  const now = new Date().toISOString();
  const changed: Array<Record<string, unknown>> = [];
  let newlyEarned = 0;
  for (const r of rows) {
    const e: any = before.get(`${r.player_id}|${r.achievement_key}`);
    // The database stamps title badges when the title is awarded; keep that date.
    if (r.achievement_key.startsWith('title_') && r.earned_at && e?.earned_at) r.earned_at = e.earned_at;
    const sameEarned = (!e?.earned_at && !r.earned_at) || (!!e?.earned_at && !!r.earned_at && Date.parse(e.earned_at) === Date.parse(r.earned_at));
    if (e && sameEarned && e.progress === r.progress && e.target === r.target) continue;
    changed.push({ ...r, updated_at: now });
    if (r.earned_at && !e?.earned_at) newlyEarned++;
  }
  for (const chunk of chunks(changed, 500)) {
    const { error } = await admin.from('player_achievements').upsert(chunk, { onConflict: 'player_id,achievement_key' });
    if (error) throw new HttpError(500, error.message);
  }
  const retired = [...new Set(existing.map((e: any) => e.achievement_key).filter((k: string) => !ACHIEVEMENT_MAP[k]))];
  if (retired.length) await admin.from('player_achievements').delete().in('achievement_key', retired);
  return { rows: rows.length, changed: changed.length, newlyEarned };
}

// ---------------------------------------------------------------------------
// Cron tick
// ---------------------------------------------------------------------------

async function tick() {
  const { data: last } = await admin.from('sync_state').select('updated_at').eq('key', 'last_tick').maybeSingle();
  if (last && Date.now() - Date.parse(last.updated_at) < TICK_COOLDOWN_MS) return { skipped: true };
  await admin.from('sync_state').upsert({ key: 'last_tick', value: { running: true }, updated_at: new Date().toISOString() });

  const summary: Record<string, unknown> = {};
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      summary[name] = await fn();
    } catch (e) {
      summary[name] = { error: e instanceof Error ? e.message : String(e) };
    }
  };
  await step('discover', discover);
  await step('backfill', async () => {
    const n = await backfillGames();
    if (n > 0) summary.recalc = await recalc();
    return n;
  });
  await step('results', () => syncMissingResults());
  await step('achievements', refreshAchievements);

  await admin.from('sync_state').upsert({ key: 'last_tick', value: summary, updated_at: new Date().toISOString() });
  return summary;
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

interface Caller {
  userId: string;
  jwt: string;
  email: string | null;
  name: string;
  isStaff: boolean;
  isAdmin: boolean;
}

async function getCaller(req: Request): Promise<Caller | null> {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt || jwt === ANON_KEY) return null;
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) return null;
  const { data: profile } = await admin.from('profiles').select('full_name, is_admin, is_arbiter').eq('id', data.user.id).maybeSingle();
  return {
    userId: data.user.id,
    jwt,
    email: data.user.email ?? null,
    name: profile?.full_name ?? 'A member',
    isStaff: !!(profile?.is_admin || profile?.is_arbiter),
    isAdmin: !!profile?.is_admin,
  };
}

function requireUser(caller: Caller | null): Caller {
  if (!caller) throw new HttpError(401, 'Please sign in first.');
  return caller;
}

function requireStaff(caller: Caller | null): Caller {
  const c = requireUser(caller);
  if (!c.isStaff) throw new HttpError(403, 'Only arbiters and admins can do this.');
  return c;
}

function requireAdmin(caller: Caller | null): Caller {
  const c = requireUser(caller);
  if (!c.isAdmin) throw new HttpError(403, 'Only admins can do this.');
  return c;
}

function asUser(caller: Caller) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${caller.jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function linkLichess(caller: Caller, token: unknown) {
  if (typeof token !== 'string' || !token) throw new HttpError(400, 'Missing Lichess login. Please connect again.');
  const res = await fetch(`${LICHESS}/api/account`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'User-Agent': USER_AGENT },
  });
  if (res.status === 401) throw new HttpError(401, 'Lichess did not accept this login. Please connect again.');
  if (!res.ok) throw new HttpError(502, 'Could not reach Lichess. Try again in a moment.');
  const account = await res.json();
  const username: string | undefined = account?.username;
  if (!username) throw new HttpError(502, 'Lichess did not return a username.');

  const owner = (await linkedProfiles()).get(username.toLowerCase());
  if (owner && owner.id !== caller.userId) {
    throw new HttpError(409, `@${username} is already linked to another FCA member (${owner.name}). Ask an admin if this is your account.`);
  }
  const { error } = await admin.from('profiles').update({ lichess_username: username }).eq('id', caller.userId);
  if (error) throw new HttpError(500, error.message);

  // We only needed the token to prove ownership.
  fetch(`${LICHESS}/api/token`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});

  let missingGames = 0;
  try {
    missingGames = (await resync({ playerId: caller.userId, reason: `${caller.name} linked Lichess @${username}` })).missing;
  } catch {
    // Non-fatal: arbiters can run a resync from the console.
  }
  try {
    await refreshAchievements();
  } catch {
    // Non-fatal: the next sync refreshes badges.
  }
  return { username, missingGames };
}

async function unlinkAccount(caller: Caller, platform: unknown) {
  const column = platform === 'chesscom' ? 'chesscom_username' : platform === 'lichess' ? 'lichess_username' : null;
  if (!column) throw new HttpError(400, 'Unknown platform.');
  const { error } = await admin.from('profiles').update({ [column]: null }).eq('id', caller.userId);
  if (error) throw new HttpError(500, error.message);
  return { ok: true };
}

async function chesscomPlayer(handle: string) {
  const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(handle)}`, { headers: { 'User-Agent': USER_AGENT } });
  if (res.status === 404) throw new HttpError(404, `Chess.com user "${handle}" was not found.`);
  if (!res.ok) throw new HttpError(502, `Chess.com is not responding (${res.status}). Try again shortly.`);
  return await res.json() as { username?: string; avatar?: string; location?: string; url?: string };
}

async function chesscomStart(caller: Caller, username: unknown) {
  const handle = String(username ?? '').trim().toLowerCase();
  if (!/^[a-z0-9_-]{2,40}$/.test(handle)) throw new HttpError(400, 'Enter a valid Chess.com username.');
  const player = await chesscomPlayer(handle);
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const code = `FCA-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')}`;
  const { error } = await admin.from('chesscom_verifications').upsert({
    profile_id: caller.userId,
    username: player.username ?? handle,
    code,
    created_at: new Date().toISOString(),
  });
  if (error) throw new HttpError(500, error.message);
  return { code, username: player.username ?? handle, avatar: player.avatar ?? null };
}

async function chesscomVerify(caller: Caller) {
  const { data: v } = await admin.from('chesscom_verifications').select('*').eq('profile_id', caller.userId).maybeSingle();
  if (!v) throw new HttpError(400, 'Start the Chess.com verification first.');
  if (Date.now() - Date.parse(v.created_at) > 6 * 3600_000) throw new HttpError(410, 'This code expired. Start again to get a new one.');
  const player = await chesscomPlayer(String(v.username).toLowerCase());
  if (!String(player.location ?? '').toUpperCase().includes(String(v.code).toUpperCase())) {
    throw new HttpError(422, `We couldn't find ${v.code} in your Chess.com Location yet. Save it on Chess.com, wait a minute, then tap Verify again.`);
  }
  const handle = player.username ?? v.username;
  const rows = await fetchAll<{ id: string; chesscom_username: string | null }>(
    (a, b) => admin.from('profiles').select('id, chesscom_username').not('chesscom_username', 'is', null).range(a, b),
  );
  if (rows.some((r) => r.id !== caller.userId && r.chesscom_username?.toLowerCase() === String(handle).toLowerCase())) {
    throw new HttpError(409, `@${handle} is already linked to another FCA member.`);
  }
  const { error } = await admin.from('profiles').update({ chesscom_username: handle }).eq('id', caller.userId);
  if (error) throw new HttpError(500, error.message);
  await admin.from('chesscom_verifications').delete().eq('profile_id', caller.userId);
  refreshAchievements().catch(() => {});
  return { username: handle };
}

async function resetLink(profileId: unknown, redirectTo: unknown) {
  if (typeof profileId !== 'string') throw new HttpError(400, 'Pick a member.');
  const { data: user, error } = await admin.auth.admin.getUserById(profileId);
  if (error || !user.user?.email) throw new HttpError(404, 'This member has no login email.');
  const redirect = typeof redirectTo === 'string' && /^https?:\/\//.test(redirectTo) ? redirectTo : undefined;
  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: user.user.email,
    options: redirect ? { redirectTo: redirect } : undefined,
  });
  if (linkError) throw new HttpError(500, linkError.message);
  return { link: data.properties?.action_link ?? null, email: user.user.email };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const caller = await getCaller(req);

    switch (body.action) {
      case 'tick':
        return json(await tick());

      case 'stage_arena': {
        const c = requireStaff(caller);
        const row = await stageArena(parseArenaId(body.arena), { reason: `Imported by ${c.name}`, manual: true });
        return json({ import: row });
      }

      case 'approve_import': {
        const c = requireStaff(caller);
        const { data, error } = await asUser(c).rpc('apply_arena_import', {
          p_import_id: body.id,
          p_event_name: typeof body.eventName === 'string' ? body.eventName : null,
        });
        if (error) throw new HttpError(400, error.message);
        const achievements = await refreshAchievements().catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
        return json({ ...data, achievements });
      }

      case 'dismiss_import': {
        const c = requireStaff(caller);
        const { error } = await asUser(c).rpc('dismiss_arena_import', { p_import_id: body.id });
        if (error) throw new HttpError(400, error.message);
        return json({ ok: true });
      }

      case 'resync': {
        const c = requireStaff(caller);
        const playerId = typeof body.playerId === 'string' ? body.playerId : null;
        return json(await resync({ playerId, reason: playerId ? `Resync requested by ${c.name}` : `Full resync by ${c.name}` }));
      }

      case 'recalculate': {
        const c = requireStaff(caller);
        const ratings = await recalc(asUser(c));
        const achievements = await refreshAchievements();
        return json({ ratings, achievements });
      }

      case 'refresh_achievements':
        requireStaff(caller);
        return json(await refreshAchievements());

      case 'link_lichess':
        return json(await linkLichess(requireUser(caller), body.token));

      case 'unlink_account':
        return json(await unlinkAccount(requireUser(caller), body.platform));

      case 'chesscom_start':
        return json(await chesscomStart(requireUser(caller), body.username));

      case 'chesscom_verify':
        return json(await chesscomVerify(requireUser(caller)));

      case 'reset_link':
        requireAdmin(caller);
        return json(await resetLink(body.profileId, body.redirectTo));

      default:
        throw new HttpError(400, 'Unknown action.');
    }
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    const message = e instanceof Error ? e.message : 'Unexpected error.';
    if (status >= 500) console.error(message);
    return json({ error: message }, status);
  }
});

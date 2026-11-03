import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Eye, Download, RefreshCw, Users, Inbox, History, Search, ExternalLink, Copy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { errorMessage, invokeFca } from '../../lib/api';
import { copyText, siteUrl } from '../../lib/share';
import { formatDateTime, timeAgo } from '../../lib/format';
import { arenaUrl } from '../../lib/lichess';
import type { ArenaImport, StagedGame } from '../../types';
import { Card, EmptyState, SectionHeader, Skeleton, Spinner } from '../../components/ui/misc';
import Sheet from '../../components/ui/Sheet';
import { useToast } from '../../components/ui/Toast';

const LIST_COLUMNS = 'id, kind, status, lichess_arena_id, tournament_id, title, event_name, starts_at, total_games, rated_games, new_games, players, linked_players, unlinked_players, reason, detected_at, decided_at, decided_by, applied_games, error';

export default function AdminImports() {
  const toast = useToast();
  const [pending, setPending] = useState<ArenaImport[] | null>(null);
  const [history, setHistory] = useState<ArenaImport[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [arena, setArena] = useState('');
  const [preview, setPreview] = useState<ArenaImport | null>(null);
  const [resyncOpen, setResyncOpen] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  async function load() {
    const [p, h] = await Promise.all([
      supabase.from('arena_imports').select(LIST_COLUMNS).eq('status', 'PENDING').order('detected_at', { ascending: false }),
      supabase.from('arena_imports').select(LIST_COLUMNS).neq('status', 'PENDING').order('detected_at', { ascending: false }).limit(20),
    ]);
    if (p.error) {
      setUnavailable(true);
      setPending([]);
      return;
    }
    const rows = (p.data ?? []) as unknown as ArenaImport[];
    setPending(rows);
    setHistory((h.data ?? []) as unknown as ArenaImport[]);
    setNames((n) => Object.fromEntries(rows.map((r) => [r.id, n[r.id] ?? r.event_name])));
  }
  useEffect(() => { load(); }, []);

  async function approve(imp: ArenaImport) {
    setBusy(imp.id);
    try {
      const r = await invokeFca<{ inserted: number; profiles_changed: number }>('approve_import', { id: imp.id, eventName: imp.kind === 'ARENA' ? names[imp.id] : undefined });
      toast(`Approved · ${r.inserted} games rated · ${r.profiles_changed} ratings updated`);
      load();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function dismiss(imp: ArenaImport) {
    if (!confirm(`Dismiss "${imp.title}"? Its games will not be rated. You can import the arena again later.`)) return;
    setBusy(imp.id);
    try {
      await invokeFca('dismiss_import', { id: imp.id });
      toast('Dismissed', 'info');
      load();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function stage(e: React.FormEvent) {
    e.preventDefault();
    setBusy('stage');
    try {
      const r = await invokeFca<{ import: { status: string; new_games: number } }>('stage_arena', { arena });
      toast(r.import.status === 'PENDING' ? `Ready to approve: ${r.import.new_games} new rated games` : 'Nothing new to rate in that arena', r.import.status === 'PENDING' ? 'success' : 'info');
      setArena('');
      load();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  if (unavailable) {
    return <Card><EmptyState icon={Inbox} title="Imports aren't set up yet" text="Run database migration 2 (imports, achievements, seasons) in the Supabase SQL editor." /></Card>;
  }

  return (
    <div className="space-y-6">
      <section>
        <SectionHeader title="Waiting for approval" subtitle="Finished FCA arenas are detected automatically every 15 minutes" />
        {!pending ? <Skeleton className="h-40" /> : pending.length === 0 ? (
          <Card><EmptyState icon={CheckCircle2} title="All caught up" text="New Titled Tuesday arenas appear here shortly after they finish." /></Card>
        ) : (
          <div className="space-y-3">
            {pending.map((imp) => (
              <Card key={imp.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${imp.kind === 'RESYNC' ? 'bg-sky-500/15 text-sky-300' : 'bg-primary/15 text-primary-light'}`}>{imp.kind === 'RESYNC' ? 'RESYNC' : 'ARENA'}</span>
                      <span className="truncate font-bold text-white">{imp.title}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-text-muted">
                      {imp.starts_at ? formatDateTime(imp.starts_at) : ''}{imp.reason ? ` · ${imp.reason}` : ''} · found {timeAgo(imp.detected_at)}
                    </div>
                  </div>
                  {imp.lichess_arena_id && (
                    <a href={arenaUrl(imp.lichess_arena_id)} target="_blank" rel="noreferrer" className="btn-ghost !min-h-[36px] shrink-0 !px-2" aria-label="Open arena on Lichess"><ExternalLink className="h-4 w-4" /></a>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-primary/10 py-2"><div className="text-lg font-extrabold text-white">{imp.new_games}</div><div className="text-[11px] text-text-muted">new rated games</div></div>
                  <div className="rounded-xl bg-white/[0.04] py-2"><div className="text-lg font-extrabold text-white">{imp.linked_players}<span className="text-sm text-text-muted">/{imp.players}</span></div><div className="text-[11px] text-text-muted">players linked</div></div>
                  <div className="rounded-xl bg-white/[0.04] py-2"><div className="text-lg font-extrabold text-white">{imp.total_games}</div><div className="text-[11px] text-text-muted">games in arena</div></div>
                </div>

                {imp.unlinked_players.length > 0 && (
                  <details className="mt-3 rounded-xl bg-[#1E1C18] px-3 py-2 text-sm">
                    <summary className="cursor-pointer select-none text-xs font-semibold text-amber-300">
                      {imp.unlinked_players.length} player{imp.unlinked_players.length === 1 ? '' : 's'} not linked — their games won't be rated
                    </summary>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {imp.unlinked_players.map((u) => <span key={u} className="rounded-lg bg-white/5 px-2 py-1 text-xs text-text-muted">{u}</span>)}
                    </div>
                    <button
                      onClick={() => copyText(`Played in our FCA arena? Join FCA Rated and link your Lichess so your games count: ${siteUrl('/join')}`).then(() => toast('Message copied for the WhatsApp group'))}
                      className="btn-ghost mt-2 !min-h-[34px] !px-2 text-xs"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy a join reminder
                    </button>
                  </details>
                )}

                {imp.kind === 'ARENA' && (
                  <label className="mt-3 block">
                    <span className="field-label">Event name on FCA</span>
                    <input className="input-field" value={names[imp.id] ?? ''} onChange={(e) => setNames({ ...names, [imp.id]: e.target.value })} />
                  </label>
                )}

                <div className="mt-3 flex gap-2">
                  <button onClick={() => approve(imp)} disabled={busy === imp.id} className="btn-primary flex-1">
                    {busy === imp.id ? <Spinner className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />} Approve & rate
                  </button>
                  <button onClick={() => setPreview(imp)} className="btn-secondary" aria-label="Preview games"><Eye className="h-4 w-4" /></button>
                  <button onClick={() => dismiss(imp)} disabled={busy === imp.id} className="btn-secondary" aria-label="Dismiss"><XCircle className="h-4 w-4" /></button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="flex items-center gap-2 font-bold text-white"><Download className="h-4 w-4 text-primary" /> Import any arena</h3>
          <p className="mt-1 text-xs text-text-muted">Paste a Lichess arena link (e.g. one created by another account). It's queued above for approval.</p>
          <form onSubmit={stage} className="mt-3 flex gap-2">
            <input className="input-field" placeholder="lichess.org/tournament/…" value={arena} onChange={(e) => setArena(e.target.value)} autoCapitalize="none" />
            <button disabled={!arena.trim() || busy === 'stage'} className="btn-primary shrink-0">{busy === 'stage' ? <Spinner className="h-4 w-4" /> : 'Fetch'}</button>
          </form>
        </Card>
        <Card className="p-4">
          <h3 className="flex items-center gap-2 font-bold text-white"><RefreshCw className="h-4 w-4 text-primary" /> Resync missing games</h3>
          <p className="mt-1 text-xs text-text-muted">When someone links Lichess late, their past arena games are found automatically. Run it yourself for one member or everyone.</p>
          <button onClick={() => setResyncOpen(true)} className="btn-secondary mt-3 w-full"><Users className="h-4 w-4" /> Resync…</button>
        </Card>
      </div>

      <section>
        <SectionHeader title={<span className="flex items-center gap-2"><History className="h-4 w-4" /> Recent decisions</span>} />
        <Card className="divide-y divide-chess-border overflow-hidden">
          {history.length === 0 ? <EmptyState title="No imports yet" /> : history.map((h) => (
            <div key={h.id} className="flex items-center gap-3 px-3 py-2.5 text-sm sm:px-4">
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${h.status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-300' : h.status === 'EMPTY' ? 'bg-white/5 text-text-muted' : 'bg-rose-500/15 text-rose-300'}`}>
                {h.status === 'EMPTY' ? 'UP TO DATE' : h.status}
              </span>
              <span className="min-w-0 flex-1 truncate text-white">{h.title}</span>
              <span className="shrink-0 text-xs text-text-muted">
                {h.status === 'APPROVED' ? `${h.applied_games ?? 0} rated · ` : ''}{timeAgo(h.decided_at ?? h.detected_at)}
              </span>
              {h.tournament_id && <Link to={`/events/${h.tournament_id}`} className="shrink-0 text-xs font-semibold text-primary">View</Link>}
            </div>
          ))}
        </Card>
      </section>

      <PreviewSheet imp={preview} onClose={() => setPreview(null)} />
      <ResyncSheet open={resyncOpen} onClose={() => setResyncOpen(false)} onDone={load} />
    </div>
  );
}

function PreviewSheet({ imp, onClose }: { imp: ArenaImport | null; onClose: () => void }) {
  const [games, setGames] = useState<StagedGame[] | null>(null);
  const [linked, setLinked] = useState<Map<string, string>>(new Map());
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'rated' | 'all'>('rated');

  useEffect(() => {
    if (!imp) return;
    setGames(null);
    (async () => {
      const [{ data: row }, { data: profiles }] = await Promise.all([
        supabase.from('arena_imports').select('games').eq('id', imp.id).single(),
        supabase.from('profiles').select('full_name, lichess_username').not('lichess_username', 'is', null),
      ]);
      const staged = ((row?.games ?? []) as StagedGame[]).slice().sort((a, b) => a.createdAt - b.createdAt);
      const map = new Map((profiles ?? []).map((p) => [String(p.lichess_username).toLowerCase(), p.full_name as string]));
      const ids = staged.map((g) => g.id);
      const found = new Set<string>();
      for (let i = 0; i < ids.length; i += 150) {
        const { data } = await supabase.from('games').select('lichess_game_id').in('lichess_game_id', ids.slice(i, i + 150));
        (data ?? []).forEach((g) => g.lichess_game_id && found.add(g.lichess_game_id));
      }
      setLinked(map);
      setExisting(found);
      setGames(staged);
    })();
  }, [imp]);

  const rows = useMemo(() => (games ?? []).map((g) => {
    const w = linked.get(g.white.toLowerCase());
    const b = linked.get(g.black.toLowerCase());
    const state = existing.has(g.id) ? 'done' : w && b ? 'rated' : 'skip';
    return { g, w, b, state };
  }).filter((r) => filter === 'all' || r.state === 'rated'), [games, linked, existing, filter]);

  return (
    <Sheet open={!!imp} onClose={onClose} title={imp?.title ?? ''} wide>
      {!games ? <div className="flex justify-center py-8"><Spinner /></div> : (
        <div>
          <div className="mb-3 flex gap-2">
            <button onClick={() => setFilter('rated')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === 'rated' ? 'bg-primary/15 text-primary-light' : 'bg-white/5 text-text-muted'}`}>Will be rated</button>
            <button onClick={() => setFilter('all')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === 'all' ? 'bg-primary/15 text-primary-light' : 'bg-white/5 text-text-muted'}`}>All {games.length}</button>
          </div>
          <ul className="divide-y divide-chess-border text-sm">
            {rows.map(({ g, w, b, state }) => (
              <li key={g.id} className="flex items-center gap-2 py-2">
                <span className={`min-w-0 flex-1 truncate text-right ${g.winner === 'white' ? 'font-bold text-white' : 'text-text-muted'}`}>{w ?? g.white}</span>
                <a href={`https://lichess.org/${g.id}`} target="_blank" rel="noreferrer" className="w-11 shrink-0 rounded bg-white/5 py-0.5 text-center text-xs font-bold text-white">
                  {g.winner === 'white' ? '1-0' : g.winner === 'black' ? '0-1' : '½'}
                </a>
                <span className={`min-w-0 flex-1 truncate ${g.winner === 'black' ? 'font-bold text-white' : 'text-text-muted'}`}>{b ?? g.black}</span>
                <span className={`w-16 shrink-0 text-right text-[10px] font-bold ${state === 'rated' ? 'text-primary' : state === 'done' ? 'text-text-muted' : 'text-amber-400'}`}>
                  {state === 'rated' ? 'RATED' : state === 'done' ? 'DONE' : 'SKIP'}
                </span>
              </li>
            ))}
          </ul>
          {rows.length === 0 && <EmptyState title="No games in this view" />}
        </div>
      )}
    </Sheet>
  );
}

function ResyncSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<Array<{ id: string; full_name: string; lichess_username: string }>>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    supabase.from('profiles').select('id, full_name, lichess_username').not('lichess_username', 'is', null).order('full_name')
      .then(({ data }) => setMembers((data ?? []) as Array<{ id: string; full_name: string; lichess_username: string }>));
  }, [open]);

  async function run(playerId: string | null) {
    setBusy(playerId ?? 'all');
    try {
      const r = await invokeFca<{ missing: number; scanned: number }>('resync', { playerId });
      toast(r.missing ? `Found ${r.missing} missing game${r.missing === 1 ? '' : 's'} — review them in the list` : `Checked ${r.scanned} event${r.scanned === 1 ? '' : 's'}: nothing missing`, r.missing ? 'success' : 'info');
      onDone();
      if (r.missing) onClose();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  }

  const q = query.trim().toLowerCase();
  const shown = members.filter((m) => !q || m.full_name.toLowerCase().includes(q) || m.lichess_username.toLowerCase().includes(q)).slice(0, 30);

  return (
    <Sheet open={open} onClose={onClose} title="Resync missing games">
      <button onClick={() => run(null)} disabled={!!busy} className="btn-primary w-full">
        {busy === 'all' ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />} Scan every arena for every member
      </button>
      <p className="mt-2 text-xs text-text-muted">Takes up to a minute. Found games are queued for your approval — nothing is rated until you approve.</p>
      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input className="input-field !pl-10" placeholder="Or pick one member…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <ul className="mt-2 divide-y divide-chess-border">
        {shown.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{m.full_name}</div>
              <div className="truncate text-xs text-text-muted">@{m.lichess_username}</div>
            </div>
            <button onClick={() => run(m.id)} disabled={!!busy} className="btn-secondary !min-h-[36px] !px-3 text-xs">{busy === m.id ? <Spinner className="h-3.5 w-3.5" /> : 'Resync'}</button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

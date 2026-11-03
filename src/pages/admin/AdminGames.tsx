import { useEffect, useState } from 'react';
import { Swords, Ban, RotateCcw, Trash2, ExternalLink, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GAME_COLUMNS, invokeFca } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, shortEventName, signed } from '../../lib/format';
import type { Game, GameMode } from '../../types';
import { MODES, MODE_LABELS } from '../../types';
import PlayerPicker from '../../components/admin/PlayerPicker';
import { Card, Chip, EmptyState, ModeIcon, SectionHeader, Segmented, Spinner } from '../../components/ui/misc';
import Sheet from '../../components/ui/Sheet';
import { useToast } from '../../components/ui/Toast';

const PAGE = 30;

function localNow() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function AdminGames() {
  const toast = useToast();
  const [white, setWhite] = useState<string | null>(null);
  const [black, setBlack] = useState<string | null>(null);
  const [mode, setMode] = useState<GameMode>('CLASSICAL');
  const [result, setResult] = useState<1 | 0.5 | 0 | null>(null);
  const [eventName, setEventName] = useState('Challenge');
  const [playedAt, setPlayedAt] = useState(localNow());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    supabase.from('tournaments').select('title').order('start_date', { ascending: false }).limit(15)
      .then(({ data }) => setRecent([...new Set(['Challenge', ...(data ?? []).map((t) => t.title as string)])]));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!white || !black || result === null) {
      toast('Pick both players and the result', 'error');
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc('log_otb_game', {
      p_white: white,
      p_black: black,
      p_mode: mode,
      p_result: result,
      p_event_name: eventName,
      p_played_at: new Date(playedAt).toISOString(),
      p_notes: notes || null,
    });
    setSubmitting(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    const r = data as { white_before: number; white_after: number; black_before: number; black_after: number };
    toast(`Logged · White ${signed(r.white_after - r.white_before)} · Black ${signed(r.black_after - r.black_before)}`);
    invokeFca('refresh_achievements').catch(() => {});
    setWhite(null);
    setBlack(null);
    setResult(null);
    setNotes('');
    setVersion((v) => v + 1);
  }

  return (
    <div className="space-y-6">
      <section>
        <SectionHeader title="Log an over-the-board game" subtitle="Ratings are rebuilt in date order, so you can log games after the fact" />
        <Card className="p-4">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <span className="field-label">White</span>
                <PlayerPicker label="Pick white" value={white} onChange={setWhite} exclude={black} />
              </div>
              <div>
                <span className="field-label">Black</span>
                <PlayerPicker label="Pick black" value={black} onChange={setBlack} exclude={white} />
              </div>
            </div>
            <div>
              <span className="field-label">Time control</span>
              <Segmented value={mode} onChange={setMode} options={MODES.map((m) => ({ value: m, label: <><ModeIcon mode={m} /> {MODE_LABELS[m]}</> }))} />
            </div>
            <div>
              <span className="field-label">Result</span>
              <div className="grid grid-cols-3 gap-2">
                {([[1, 'White won'], [0.5, 'Draw'], [0, 'Black won']] as const).map(([v, label]) => (
                  <button
                    type="button"
                    key={label}
                    onClick={() => setResult(v)}
                    className={`min-h-[46px] rounded-xl border text-sm font-semibold ${result === v ? 'border-primary bg-primary/15 text-white' : 'border-chess-border bg-[#1E1C18] text-text-muted'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">Event</span>
                <input className="input-field" list="otb-events" value={eventName} onChange={(e) => setEventName(e.target.value)} />
                <datalist id="otb-events">{recent.map((r) => <option key={r} value={r} />)}</datalist>
              </label>
              <label className="block">
                <span className="field-label">Played at</span>
                <input className="input-field" type="datetime-local" value={playedAt} onChange={(e) => setPlayedAt(e.target.value)} />
              </label>
            </div>
            <label className="block">
              <span className="field-label">Notes (optional)</span>
              <input className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. SEET hall, board 2" />
            </label>
            <button type="submit" disabled={submitting} className="btn-primary w-full">{submitting ? <Spinner className="h-4 w-4" /> : <><Swords className="h-4 w-4" /> Log rated game</>}</button>
          </form>
        </Card>
      </section>

      <RecentGames key={version} />
    </div>
  );
}

function RecentGames() {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [source, setSource] = useState<'ALL' | 'OTB_MANUAL' | 'LICHESS_ARENA'>('ALL');
  const [player, setPlayer] = useState<string | null>(null);
  const [games, setGames] = useState<Game[] | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Game | null>(null);
  const [busy, setBusy] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  async function load() {
    let q = supabase.from('games').select(GAME_COLUMNS).order('played_at', { ascending: false }).limit(limit);
    if (source !== 'ALL') q = q.eq('source', source);
    if (player) q = q.or(`white_player_id.eq.${player},black_player_id.eq.${player}`);
    const { data } = await q;
    setGames((data ?? []) as unknown as Game[]);
  }
  useEffect(() => { load(); }, [source, player, limit]);

  async function act(fn: () => PromiseLike<{ error: { message: string } | null }>, done: string) {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast(done);
    invokeFca('refresh_achievements').catch(() => {});
    setSelected(null);
    load();
  }

  return (
    <section>
      <SectionHeader
        title="Recent games"
        action={<button onClick={() => setFilterOpen(true)} className="btn-ghost !min-h-[36px] !px-2.5 text-xs"><Filter className="h-4 w-4" /> Filter{player ? ' · 1 player' : ''}</button>}
      />
      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Chip active={source === 'ALL'} onClick={() => setSource('ALL')}>All</Chip>
        <Chip active={source === 'LICHESS_ARENA'} onClick={() => setSource('LICHESS_ARENA')}>Lichess arenas</Chip>
        <Chip active={source === 'OTB_MANUAL'} onClick={() => setSource('OTB_MANUAL')}>Over the board</Chip>
      </div>
      <Card className="divide-y divide-chess-border overflow-hidden">
        {!games ? <div className="flex justify-center py-8"><Spinner /></div> : games.length === 0 ? <EmptyState title="No games" /> : games.map((g) => {
          const res = Number(g.result) === 1 ? '1-0' : Number(g.result) === 0 ? '0-1' : '½-½';
          return (
            <button key={g.id} onClick={() => setSelected(g)} className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/[0.02] sm:px-4 ${g.is_official === false ? 'opacity-50' : ''}`}>
              <ModeIcon mode={g.mode} className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-white">{g.white_player?.full_name} <span className="text-text-muted">vs</span> {g.black_player?.full_name}</span>
              <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-xs font-bold text-white">{res}</span>
              <span className="hidden w-28 shrink-0 truncate text-right text-xs text-text-muted sm:block">{shortEventName(g.event_name)}</span>
              <span className="w-14 shrink-0 text-right text-xs text-text-muted">{formatDate(g.played_at, { day: 'numeric', month: 'short' })}</span>
            </button>
          );
        })}
      </Card>
      {games && games.length >= limit && <button onClick={() => setLimit((l) => l + PAGE)} className="btn-secondary mt-3 w-full">Load more</button>}

      <Sheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter games">
        <span className="field-label">Player</span>
        <PlayerPicker label="Any player" value={player} onChange={(id) => { setPlayer(id); setFilterOpen(false); }} />
        {player && <button onClick={() => setPlayer(null)} className="btn-ghost mt-2">Clear player</button>}
      </Sheet>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title="Game">
        {selected && (
          <div className="space-y-4">
            <div className="text-sm">
              <div className="font-semibold text-white">{selected.white_player?.full_name} vs {selected.black_player?.full_name}</div>
              <div className="text-text-muted">{selected.event_name} · {MODE_LABELS[selected.mode]} · {formatDate(selected.played_at)}</div>
              <div className="mt-1 text-xs text-text-muted">
                White {selected.white_elo_before ?? '—'} → {selected.white_elo_after ?? '—'} · Black {selected.black_elo_before ?? '—'} → {selected.black_elo_after ?? '—'}
              </div>
              {selected.notes && <div className="mt-1 text-xs text-text-muted">Note: {selected.notes}</div>}
              {selected.external_url && <a href={selected.external_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">Open on Lichess <ExternalLink className="h-3 w-3" /></a>}
            </div>
            <div>
              <span className="field-label">Correct the result</span>
              <div className="grid grid-cols-3 gap-2">
                {([[1, 'White won'], [0.5, 'Draw'], [0, 'Black won']] as const).map(([v, label]) => (
                  <button
                    key={label}
                    disabled={busy || Number(selected.result) === v}
                    onClick={() => act(() => supabase.rpc('update_game_result', { p_game_id: selected.id, p_result: v }), 'Result updated, ratings rebuilt')}
                    className={`min-h-[44px] rounded-xl border text-sm font-semibold disabled:opacity-60 ${Number(selected.result) === v ? 'border-primary bg-primary/15 text-white' : 'border-chess-border bg-[#1E1C18] text-text-muted'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {selected.is_official === false ? (
              <button disabled={busy} onClick={() => act(() => supabase.rpc('set_game_official', { p_game_id: selected.id, p_official: true }), 'Game restored')} className="btn-secondary w-full">
                <RotateCcw className="h-4 w-4" /> Restore as rated
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={() => {
                  const reason = prompt('Why void this game? (e.g. fair-play, wrong players)');
                  if (reason === null) return;
                  act(() => supabase.rpc('set_game_official', { p_game_id: selected.id, p_official: false, p_note: reason }), 'Game voided, ratings rebuilt');
                }}
                className="btn-secondary w-full"
              >
                <Ban className="h-4 w-4" /> Void (keep record, remove from ratings)
              </button>
            )}
            {isAdmin && (
              <button
                disabled={busy}
                onClick={() => confirm('Delete this game permanently?') && act(() => supabase.rpc('delete_game', { p_game_id: selected.id }), 'Game deleted')}
                className="btn-danger w-full"
              >
                <Trash2 className="h-4 w-4" /> Delete permanently
              </button>
            )}
          </div>
        )}
      </Sheet>
    </section>
  );
}

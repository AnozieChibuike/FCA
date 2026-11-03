import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Flame, TrendingUp } from 'lucide-react';
import type { Game, GameMode, Profile } from '../../types';
import { MODES, MODE_LABELS, modeRating } from '../../types';
import { formatDate, plural, shortEventName } from '../../lib/format';
import { LineChart, type LinePoint } from '../charts/charts';
import { Card, Diff, ModeIcon, ResultPill, EmptyState } from '../ui/misc';

export function outcomeFor(g: Game, playerId: string): 'W' | 'D' | 'L' {
  const r = Number(g.result);
  if (r === 0.5) return 'D';
  const white = g.white_player_id === playerId;
  return (white && r === 1) || (!white && r === 0) ? 'W' : 'L';
}

export function myElo(g: Game, playerId: string) {
  const white = g.white_player_id === playerId;
  const before = white ? g.white_elo_before : g.black_elo_before;
  const after = white ? g.white_elo_after : g.black_elo_after;
  return { before, after, diff: before != null && after != null ? after - before : null };
}

export function ModeCards({ player, mode, onMode }: { player: Profile; mode: GameMode; onMode: (m: GameMode) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
      {MODES.map((m) => {
        const r = modeRating(player, m);
        const active = m === mode;
        return (
          <button
            key={m}
            onClick={() => onMode(m)}
            aria-pressed={active}
            className={`rounded-2xl border p-3 text-left transition-colors sm:p-4 ${active ? 'border-primary/60 bg-primary/[0.08]' : 'border-chess-border bg-surface hover:border-chess-border/80'}`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
              <span className="flex items-center gap-1.5"><ModeIcon mode={m} /> {MODE_LABELS[m]}</span>
              <span className="tabular-nums">{r.games} g</span>
            </div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums text-white">{r.elo}</div>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-text-muted">
              <TrendingUp className="h-3 w-3 text-emerald-400" /> Peak <span className="font-semibold text-emerald-300 tabular-nums">{r.peak}</span>
              {r.games > 0 && r.games < 15 && <span className="ml-auto rounded bg-white/5 px-1">prov.</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function RatingHistory({ games, playerId, mode }: { games: Game[]; playerId: string; mode: GameMode }) {
  const points = useMemo<LinePoint[]>(() => {
    const list = games
      .filter((g) => g.mode === mode && g.is_official !== false)
      .slice()
      .sort((a, b) => a.played_at.localeCompare(b.played_at));
    const pts: LinePoint[] = [];
    if (list.length) {
      const first = myElo(list[0], playerId);
      if (first.before != null) pts.push({ y: first.before, label: 'Start', detail: 'Starting rating' });
    }
    for (const g of list) {
      const e = myElo(g, playerId);
      if (e.after == null) continue;
      const opp = g.white_player_id === playerId ? g.black_player?.full_name : g.white_player?.full_name;
      pts.push({
        y: e.after,
        label: formatDate(g.played_at, { day: 'numeric', month: 'short' }),
        detail: (
          <span>
            {outcomeFor(g, playerId) === 'W' ? 'Won' : outcomeFor(g, playerId) === 'L' ? 'Lost' : 'Drew'} vs {opp ?? '—'} <Diff value={e.diff} /><br />
            {shortEventName(g.event_name)}
          </span>
        ),
      });
    }
    return pts;
  }, [games, playerId, mode]);

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">{MODE_LABELS[mode]} rating history</h3>
        <span className="text-xs text-text-muted">{Math.max(0, points.length - 1)} rated games</span>
      </div>
      {points.length >= 2 ? (
        <LineChart points={points} height={200} ariaLabel={`${MODE_LABELS[mode]} rating over ${points.length - 1} games, now ${points[points.length - 1].y}`} />
      ) : (
        <EmptyState title={`No ${MODE_LABELS[mode].toLowerCase()} games yet`} text="Play a rated arena to start your history." />
      )}
    </Card>
  );
}

export function RecentForm({ games, playerId }: { games: Game[]; playerId: string }) {
  const last = games.filter((g) => g.is_official !== false).slice(0, 10);
  if (!last.length) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-text-muted">Form</span>
      <div className="flex gap-1">
        {last.slice().reverse().map((g) => <ResultPill key={g.id} outcome={outcomeFor(g, playerId)} />)}
      </div>
    </div>
  );
}

interface Opp { id: string; name: string; games: number; w: number; d: number; l: number }

export function PerformanceStats({ games, playerId, viewerId }: { games: Game[]; playerId: string; viewerId?: string | null }) {
  const s = useMemo(() => {
    const chrono = games.filter((g) => g.is_official !== false).slice().sort((a, b) => a.played_at.localeCompare(b.played_at));
    let w = 0, d = 0, l = 0, ww = 0, wg = 0, bw = 0, bg = 0, cur = 0, best = 0;
    const opps = new Map<string, Opp>();
    for (const g of chrono) {
      const o = outcomeFor(g, playerId);
      const white = g.white_player_id === playerId;
      if (white) { wg++; if (o === 'W') ww++; } else { bg++; if (o === 'W') bw++; }
      if (o === 'W') { w++; cur++; best = Math.max(best, cur); } else { cur = 0; if (o === 'D') d++; else l++; }
      const oppId = white ? g.black_player_id : g.white_player_id;
      const oppName = (white ? g.black_player?.full_name : g.white_player?.full_name) ?? '—';
      const x = opps.get(oppId) ?? { id: oppId, name: oppName, games: 0, w: 0, d: 0, l: 0 };
      x.games++;
      if (o === 'W') x.w++; else if (o === 'D') x.d++; else x.l++;
      opps.set(oppId, x);
    }
    const total = w + d + l;
    const list = [...opps.values()];
    const rival = list.filter((x) => x.games >= 3).sort((a, b) => b.l / b.games - a.l / a.games || b.games - a.games)[0];
    const fav = list.filter((x) => x.w > 0).sort((a, b) => b.w - a.w)[0];
    const most = list.sort((a, b) => b.games - a.games)[0];
    return { w, d, l, total, ww, wg, bw, bg, cur, best, rival, fav, most };
  }, [games, playerId]);

  if (!s.total) return null;
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const compareLink = (oppId: string) => `/compare/${playerId}/${oppId}`;

  return (
    <Card className="p-4 sm:p-5">
      <h3 className="mb-3 text-sm font-bold text-white">Performance</h3>
      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-extrabold text-white">{pct(s.w, s.total)}%</span>
        <span className="text-xs text-text-muted">{s.w}W · {s.d}D · {s.l}L</span>
      </div>
      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white/[0.06]" role="img" aria-label={`${s.w} wins, ${s.d} draws, ${s.l} losses`}>
        <span className="h-full bg-emerald-500" style={{ width: `${pct(s.w, s.total)}%` }} />
        <span className="h-full bg-white/30" style={{ width: `${pct(s.d, s.total)}%` }} />
        <span className="h-full bg-rose-500" style={{ width: `${pct(s.l, s.total)}%` }} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-text-muted">With white</dt><dd className="font-semibold text-white">{pct(s.ww, s.wg)}% <span className="text-xs font-normal text-text-muted">of {s.wg}</span></dd></div>
        <div><dt className="text-xs text-text-muted">With black</dt><dd className="font-semibold text-white">{pct(s.bw, s.bg)}% <span className="text-xs font-normal text-text-muted">of {s.bg}</span></dd></div>
        <div><dt className="text-xs text-text-muted">Best win streak</dt><dd className="font-semibold text-white">{s.best}</dd></div>
        <div><dt className="text-xs text-text-muted">Current streak</dt><dd className="font-semibold text-white">{s.cur > 0 ? <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-400" />{s.cur}</span> : '—'}</dd></div>
      </dl>
      <div className="mt-4 space-y-2 border-t border-chess-border pt-3 text-sm">
        {s.rival && (
          <Link to={compareLink(s.rival.id)} className="flex items-center justify-between gap-2 hover:text-primary-light">
            <span className="text-xs text-text-muted">Toughest rival</span>
            <span className="truncate font-semibold text-white">{s.rival.name} <span className="text-xs font-normal text-text-muted">{s.rival.w}-{s.rival.d}-{s.rival.l}</span></span>
          </Link>
        )}
        {s.fav && (
          <Link to={compareLink(s.fav.id)} className="flex items-center justify-between gap-2 hover:text-primary-light">
            <span className="text-xs text-text-muted">Most wins against</span>
            <span className="truncate font-semibold text-white">{s.fav.name} <span className="text-xs font-normal text-text-muted">{s.fav.w} wins</span></span>
          </Link>
        )}
        {s.most && (
          <Link to={compareLink(s.most.id)} className="flex items-center justify-between gap-2 hover:text-primary-light">
            <span className="text-xs text-text-muted">Most played</span>
            <span className="truncate font-semibold text-white">{s.most.name} <span className="text-xs font-normal text-text-muted">{plural(s.most.games, 'game')}</span></span>
          </Link>
        )}
        {viewerId && viewerId !== playerId && (
          <Link to={`/compare/${viewerId}/${playerId}`} className="btn-secondary mt-2 w-full">Compare with me</Link>
        )}
      </div>
    </Card>
  );
}

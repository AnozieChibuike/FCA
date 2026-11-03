import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, History } from 'lucide-react';
import type { Game, GameMode } from '../../types';
import { MODES, MODE_LABELS } from '../../types';
import { formatDate, shortEventName } from '../../lib/format';
import { Avatar } from '../ui/Avatar';
import { Card, Chip, Diff, EmptyState, ModeIcon, ResultPill } from '../ui/misc';
import { myElo, outcomeFor } from './RatingPanel';

const PAGE = 20;

export default function MatchList({ games, playerId }: { games: Game[]; playerId: string }) {
  const [mode, setMode] = useState<'ALL' | GameMode>('ALL');
  const [shown, setShown] = useState(PAGE);
  const filtered = useMemo(() => (mode === 'ALL' ? games : games.filter((g) => g.mode === mode)), [games, mode]);
  const counts = useMemo(() => Object.fromEntries(MODES.map((m) => [m, games.filter((g) => g.mode === m).length])), [games]);

  return (
    <div>
      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Chip active={mode === 'ALL'} onClick={() => { setMode('ALL'); setShown(PAGE); }}>All · {games.length}</Chip>
        {MODES.filter((m) => counts[m] > 0).map((m) => (
          <Chip key={m} active={mode === m} onClick={() => { setMode(m); setShown(PAGE); }}>
            <ModeIcon mode={m} /> {MODE_LABELS[m]} · {counts[m]}
          </Chip>
        ))}
      </div>
      {filtered.length === 0 ? (
        <Card><EmptyState icon={History} title="No games yet" text="Rated games appear here after each arena is approved." /></Card>
      ) : (
        <Card className="divide-y divide-chess-border overflow-hidden">
          {filtered.slice(0, shown).map((g) => {
            const white = g.white_player_id === playerId;
            const opp = white ? g.black_player : g.white_player;
            const oppId = white ? g.black_player_id : g.white_player_id;
            const e = myElo(g, playerId);
            const voided = g.is_official === false;
            return (
              <div key={g.id} className={`flex items-center gap-3 px-3 py-2.5 sm:px-4 ${voided ? 'opacity-50' : ''}`}>
                <ResultPill outcome={outcomeFor(g, playerId)} />
                <Link to={`/profile/${oppId}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                  <Avatar src={opp?.avatar_url} name={opp?.full_name} size="sm" />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full border border-chess-border ${white ? 'bg-black' : 'bg-white'}`} title={`Opponent had ${white ? 'black' : 'white'}`} />
                      <span className="truncate font-semibold text-white">{opp?.full_name ?? 'Unknown'}</span>
                    </span>
                    <span className="flex items-center gap-1 truncate text-xs text-text-muted">
                      <ModeIcon mode={g.mode} className="h-3 w-3" />
                      {g.source === 'OTB_MANUAL' ? 'Over the board' : shortEventName(g.event_name)} · {formatDate(g.played_at, { day: 'numeric', month: 'short' })}
                      {voided && ' · voided'}
                    </span>
                  </span>
                </Link>
                <span className="text-right">
                  <span className="block text-sm font-bold tabular-nums text-white">{e.after ?? '—'}</span>
                  <Diff value={e.diff} className="text-xs" />
                </span>
                {g.external_url ? (
                  <a href={g.external_url} target="_blank" rel="noreferrer" className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-white/5 hover:text-white" aria-label="Open game on Lichess">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : <span className="w-8" />}
              </div>
            );
          })}
        </Card>
      )}
      {filtered.length > shown && (
        <button onClick={() => setShown((n) => n + PAGE)} className="btn-secondary mt-3 w-full">Show more ({filtered.length - shown} left)</button>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Swords, ExternalLink } from 'lucide-react';
import { fetchPlayerGames, fetchProfile } from '../lib/api';
import { formatDate, shortEventName } from '../lib/format';
import type { Game, Profile } from '../types';
import { MODES, MODE_LABELS, modeRating } from '../types';
import { outcomeFor } from '../components/profile/RatingPanel';
import { Avatar, TitleBadge } from '../components/ui/Avatar';
import { Card, EmptyState, ModeIcon, PageLoader, ResultPill } from '../components/ui/misc';

export default function Compare() {
  const { a, b } = useParams<{ a: string; b: string }>();
  const [pa, setPa] = useState<Profile | null>(null);
  const [pb, setPb] = useState<Profile | null>(null);
  const [games, setGames] = useState<Game[] | null>(null);

  useEffect(() => {
    if (!a || !b) return;
    setGames(null);
    Promise.all([fetchProfile(a), fetchProfile(b), fetchPlayerGames(a)]).then(([x, y, g]) => {
      setPa(x);
      setPb(y);
      setGames(g.filter((m) => m.white_player_id === b || m.black_player_id === b));
    });
  }, [a, b]);

  const record = useMemo(() => {
    const r = { w: 0, d: 0, l: 0 };
    for (const g of games ?? []) {
      if (g.is_official === false) continue;
      const o = outcomeFor(g, a!);
      if (o === 'W') r.w++; else if (o === 'D') r.d++; else r.l++;
    }
    return r;
  }, [games, a]);

  if (!games) return <PageLoader />;
  if (!pa || !pb) return <div className="page"><EmptyState title="Player not found" /></div>;

  const total = record.w + record.d + record.l;
  const pct = (n: number) => (total ? (n / total) * 100 : 0);

  return (
    <div className="page space-y-5">
      <Link to={`/profile/${a}`} className="inline-flex items-center gap-1 text-sm font-semibold text-text-muted hover:text-white"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <h1 className="text-2xl font-extrabold text-white">Head to head</h1>

      <Card className="p-4 sm:p-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {[pa, pb].map((p, i) => (
            <Link key={p.id} to={`/profile/${p.id}`} className={`flex min-w-0 flex-col items-center gap-2 text-center ${i === 1 ? 'order-3' : ''}`}>
              <Avatar src={p.avatar_url} name={p.full_name} size="lg" />
              <span className="flex max-w-full items-center gap-1"><span className="truncate text-sm font-bold text-white">{p.full_name}</span><TitleBadge title={p.earned_title} /></span>
            </Link>
          ))}
          <div className="order-2 text-center">
            <div className="text-3xl font-extrabold tabular-nums text-white">{record.w}<span className="mx-1 text-text-muted">–</span>{record.l}</div>
            <div className="text-xs text-text-muted">{record.d} draw{record.d === 1 ? '' : 's'} · {total} games</div>
          </div>
        </div>
        {total > 0 && (
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-white/[0.06]" role="img" aria-label={`${record.w} wins, ${record.d} draws, ${record.l} losses`}>
            <span className="h-full bg-emerald-500" style={{ width: `${pct(record.w)}%` }} />
            <span className="h-full bg-white/30" style={{ width: `${pct(record.d)}%` }} />
            <span className="h-full bg-rose-500" style={{ width: `${pct(record.l)}%` }} />
          </div>
        )}
        <div className="mt-5 grid grid-cols-4 gap-2 border-t border-chess-border pt-4">
          {MODES.map((m) => {
            const ra = modeRating(pa, m).elo;
            const rb = modeRating(pb, m).elo;
            return (
              <div key={m} className="text-center">
                <div className="flex items-center justify-center gap-1 text-[11px] text-text-muted"><ModeIcon mode={m} className="h-3 w-3" /> {MODE_LABELS[m]}</div>
                <div className="mt-1 text-sm font-bold tabular-nums">
                  <span className={ra >= rb ? 'text-white' : 'text-text-muted'}>{ra}</span>
                  <span className="mx-1 text-text-muted">·</span>
                  <span className={rb > ra ? 'text-white' : 'text-text-muted'}>{rb}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <section>
        <h2 className="mb-3 text-base font-bold text-white">Games between them</h2>
        {games.length === 0 ? (
          <Card><EmptyState icon={Swords} title="They haven't played a rated game yet" text="Meet in the next Titled Tuesday!" /></Card>
        ) : (
          <Card className="divide-y divide-chess-border overflow-hidden">
            {games.map((g) => (
              <div key={g.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                <ResultPill outcome={outcomeFor(g, a!)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{g.white_player_id === a ? pa.full_name : pb.full_name} <span className="text-text-muted">(white)</span></div>
                  <div className="flex items-center gap-1 truncate text-xs text-text-muted"><ModeIcon mode={g.mode} className="h-3 w-3" /> {shortEventName(g.event_name)} · {formatDate(g.played_at)}</div>
                </div>
                {g.external_url && (
                  <a href={g.external_url} target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-white/5 hover:text-white" aria-label="Open on Lichess">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

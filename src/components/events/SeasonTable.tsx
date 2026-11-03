import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Info } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { fetchSeasons, fetchSeasonStandings } from '../../lib/api';
import { formatDate, ordinal } from '../../lib/format';
import type { Season, SeasonStanding } from '../../types';
import { Avatar, TitleBadge } from '../ui/Avatar';
import { Card, EmptyState, Skeleton } from '../ui/misc';

export default function SeasonTable() {
  const { profile } = useAuth();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [rows, setRows] = useState<SeasonStanding[] | null>(null);

  useEffect(() => {
    fetchSeasons().then((s) => {
      setSeasons(s);
      const today = new Date().toISOString().slice(0, 10);
      const current = s.find((x) => x.starts_at <= today && x.ends_at >= today) ?? s[0];
      setSeasonId(current?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!seasonId) return;
    setRows(null);
    fetchSeasonStandings(seasonId).then(setRows).catch(() => setRows([]));
  }, [seasonId]);

  const season = seasons.find((s) => s.id === seasonId);
  const scheme = season?.points_scheme ?? [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-primary">Season standings</div>
            <div className="text-base font-bold text-white">{season?.name ?? 'Current season'}</div>
            {season && <div className="text-xs text-text-muted">{formatDate(season.starts_at)} – {formatDate(season.ends_at)}</div>}
          </div>
          {seasons.length > 1 && (
            <select className="input-field !min-h-[40px] !w-auto !py-2 text-sm" value={seasonId ?? ''} onChange={(e) => setSeasonId(e.target.value)}>
              {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Every arena finish among FCA members scores points: {scheme.slice(0, 5).join(', ')}… for 1st to 5th, plus {season?.participation_points ?? 1} for showing up. Turn up every week and you climb.
          </span>
        </p>
      </Card>

      {!rows ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon={Trophy} title="No season points yet" text="Points appear once this season's arenas are synced." /></Card>
      ) : (
        <Card className="divide-y divide-chess-border overflow-hidden">
          {rows.map((r, i) => {
            const me = profile?.id === r.player_id;
            return (
              <Link key={r.player_id} to={`/profile/${r.player_id}`} className={`flex items-center gap-3 px-3 py-3 sm:px-4 ${me ? 'bg-primary/10' : 'hover:bg-white/[0.02]'}`}>
                <span className={`w-7 text-center text-sm font-extrabold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-text-muted'}`}>{i + 1}</span>
                <Avatar src={r.avatar_url} name={r.full_name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-semibold text-white">{r.full_name}</span>
                    <TitleBadge title={r.earned_title} />
                    {me && <span className="rounded bg-primary px-1.5 text-[10px] font-bold text-black">YOU</span>}
                  </div>
                  <div className="text-xs text-text-muted">
                    {r.events} events · {r.wins > 0 ? `${r.wins} win${r.wins > 1 ? 's' : ''} · ` : ''}{r.podiums} podium{r.podiums === 1 ? '' : 's'} · best {ordinal(r.best_rank)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold leading-none tabular-nums text-white">{r.points}</div>
                  <div className="text-[10px] text-text-muted">pts</div>
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}

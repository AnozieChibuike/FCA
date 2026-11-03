import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Medal } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { fetchAchievementStats, fetchBadgeHolders, fetchPlayerAchievements, type EarnedBadge } from '../lib/api';
import { formatDate } from '../lib/format';
import type { PlayerAchievement } from '../types';
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, BadgeMedal, tierLabel, type AchievementDef } from '../components/achievements/Badges';
import { Avatar } from '../components/ui/Avatar';
import { Card, Chip, EmptyState, ProgressBar, Spinner } from '../components/ui/misc';
import Sheet from '../components/ui/Sheet';

export default function Achievements() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Record<string, { earned: number; active: number }>>({});
  const [mine, setMine] = useState<PlayerAchievement[]>([]);
  const [category, setCategory] = useState('All');
  const [open, setOpen] = useState<AchievementDef | null>(null);
  const [holders, setHolders] = useState<EarnedBadge[] | null>(null);

  useEffect(() => { fetchAchievementStats().then(setStats).catch(() => {}); }, []);
  useEffect(() => { if (profile) fetchPlayerAchievements(profile.id).then(setMine).catch(() => {}); }, [profile]);
  useEffect(() => {
    if (!open) return;
    setHolders(null);
    fetchBadgeHolders(open.key).then(setHolders).catch(() => setHolders([]));
  }, [open]);

  const mineByKey = useMemo(() => new Map(mine.map((m) => [m.achievement_key, m])), [mine]);
  const myCount = mine.filter((m) => m.earned_at).length;
  const list = category === 'All' ? ACHIEVEMENTS : ACHIEVEMENTS.filter((a) => a.category === category);

  return (
    <div className="page">
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Badges</h1>
      <p className="mb-4 text-sm text-text-muted">{ACHIEVEMENTS.length} badges to unlock by playing, winning, climbing and growing the club. Some are secret.</p>

      {profile && (
        <Card className="mb-5 flex items-center gap-4 p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15"><Medal className="h-6 w-6 text-primary" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-white">You have {myCount} of {ACHIEVEMENTS.length}</div>
            <ProgressBar value={myCount} max={ACHIEVEMENTS.length} className="mt-2" />
          </div>
          <Link to={`/profile/${profile.id}`} className="btn-secondary shrink-0 !min-h-[38px] !px-3 text-xs">My badges</Link>
        </Card>
      )}

      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {['All', ...ACHIEVEMENT_CATEGORIES].map((c) => <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>)}
      </div>

      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((def) => {
          const s = stats[def.key];
          const pct = s && s.active ? Math.round((s.earned / s.active) * 100) : null;
          const mineRow = mineByKey.get(def.key);
          const have = !!mineRow?.earned_at;
          const hidden = def.secret && !have;
          return (
            <li key={def.key}>
              <button onClick={() => setOpen(def)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors hover:border-primary/40 ${have ? 'border-primary/30 bg-primary/[0.05]' : 'border-chess-border bg-surface'}`}>
                <BadgeMedal def={def} earned={have || (!profile && !def.secret)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-semibold text-white">{hidden ? 'Secret badge' : def.name}</span>
                    <span className={`text-[10px] font-bold uppercase ${tierLabel(def.tier).text}`}>{tierLabel(def.tier).label}</span>
                  </div>
                  <div className="line-clamp-2 text-xs text-text-muted">{hidden ? 'Unlock it to find out.' : def.description}</div>
                  <div className="mt-1 text-[11px] text-text-muted">
                    {s ? `${s.earned} player${s.earned === 1 ? '' : 's'}${pct !== null ? ` · ${pct}%` : ''}` : '—'}
                    {have && <span className="ml-2 font-semibold text-primary">✓ You have it</span>}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? (open.secret && !mineByKey.get(open.key)?.earned_at ? 'Secret badge' : open.name) : ''}>
        {open && (
          <div>
            <div className="mb-4 flex flex-col items-center text-center">
              <BadgeMedal def={open} earned={!(open.secret && !mineByKey.get(open.key)?.earned_at)} size="lg" />
              <span className={`mt-3 text-xs font-bold uppercase tracking-wider ${tierLabel(open.tier).text}`}>{tierLabel(open.tier).label} · {open.category}</span>
              <p className="mt-2 text-sm text-white">{open.secret && !mineByKey.get(open.key)?.earned_at ? 'Keep playing to discover how to unlock this one.' : open.description}</p>
            </div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">Earned by</h3>
            {!holders ? <div className="flex justify-center py-6"><Spinner /></div> : holders.length === 0 ? (
              <EmptyState title="Nobody yet" text="Be the first to unlock it." />
            ) : (
              <ul className="divide-y divide-chess-border">
                {holders.map((h) => h.player && (
                  <li key={h.player_id}>
                    <Link to={`/profile/${h.player_id}`} className="flex items-center gap-3 py-2.5">
                      <Avatar src={h.player.avatar_url} name={h.player.full_name} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{h.player.full_name}</span>
                      <span className="text-xs text-text-muted">{formatDate(h.earned_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}

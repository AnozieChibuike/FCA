import { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import {
  ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_MAP, TIER_ORDER,
  type AchievementDef, type AchievementTier,
} from '../../../supabase/functions/fca-api/achievements';
import type { PlayerAchievement } from '../../types';
import { formatDate } from '../../lib/format';
import { Chip, ProgressBar } from '../ui/misc';
import Sheet from '../ui/Sheet';

export { ACHIEVEMENTS, ACHIEVEMENT_MAP, ACHIEVEMENT_CATEGORIES };
export type { AchievementDef };

const TIER_STYLE: Record<AchievementTier, { ring: string; bg: string; label: string; text: string }> = {
  bronze: { ring: 'ring-amber-700/70', bg: 'from-amber-800/50 to-amber-950/60', label: 'Bronze', text: 'text-amber-500' },
  silver: { ring: 'ring-slate-300/60', bg: 'from-slate-400/30 to-slate-700/40', label: 'Silver', text: 'text-slate-300' },
  gold: { ring: 'ring-yellow-400/70', bg: 'from-yellow-500/35 to-amber-700/40', label: 'Gold', text: 'text-yellow-400' },
  platinum: { ring: 'ring-cyan-300/70', bg: 'from-cyan-300/30 to-sky-700/40', label: 'Platinum', text: 'text-cyan-300' },
  legendary: { ring: 'ring-fuchsia-400/80', bg: 'from-fuchsia-500/40 to-purple-800/50', label: 'Legendary', text: 'text-fuchsia-300' },
};

export function tierLabel(tier: AchievementTier) {
  return TIER_STYLE[tier];
}

export function BadgeMedal({ def, earned, size = 'md' }: { def: AchievementDef; earned: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const t = TIER_STYLE[def.tier];
  const dims = size === 'lg' ? 'h-20 w-20 text-4xl' : size === 'sm' ? 'h-10 w-10 text-xl' : 'h-14 w-14 text-2xl';
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ring-2 ${dims} ${
        earned ? `${t.bg} ${t.ring} ${def.tier === 'legendary' ? 'shadow-[0_0_18px_rgba(217,70,239,0.35)]' : ''}` : 'from-white/[0.04] to-white/[0.02] ring-white/10'
      }`}
      aria-hidden="true"
    >
      <span className={earned ? '' : 'opacity-25 grayscale'}>{def.secret && !earned ? '❔' : def.icon}</span>
      {!earned && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-chess-border bg-surface">
          <Lock className="h-2.5 w-2.5 text-text-muted" />
        </span>
      )}
    </span>
  );
}

function progressText(def: AchievementDef, row?: PlayerAchievement) {
  if (!row) return '';
  if (def.category === 'Rating' && def.target >= 1000) return `Peak ${row.progress} / ${def.target}`;
  if (def.target <= 1) return '';
  return `${row.progress} / ${def.target}`;
}

function progressFraction(def: AchievementDef, row?: PlayerAchievement) {
  if (!row) return 0;
  // Ratings start at 1200, so measure rating badges from a 1000 floor rather than from zero.
  if (def.category === 'Rating' && def.target >= 1000) return Math.max(0, (row.progress - 1000) / (def.target - 1000));
  return row.progress / (def.target || 1);
}

export function BadgeGrid({ rows, rarity, compact = false }: {
  rows: PlayerAchievement[];
  rarity?: Record<string, { earned: number; active: number }>;
  compact?: boolean;
}) {
  const [category, setCategory] = useState<string>('All');
  const [open, setOpen] = useState<AchievementDef | null>(null);
  const byKey = useMemo(() => new Map(rows.map((r) => [r.achievement_key, r])), [rows]);
  const earnedCount = rows.filter((r) => r.earned_at).length;

  const defs = useMemo(() => {
    const list = category === 'All' ? ACHIEVEMENTS : ACHIEVEMENTS.filter((a) => a.category === category);
    return [...list].sort((a, b) => {
      const ea = byKey.get(a.key)?.earned_at ? 1 : 0;
      const eb = byKey.get(b.key)?.earned_at ? 1 : 0;
      if (ea !== eb) return eb - ea;
      return TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
    });
  }, [category, byKey]);

  const shown = compact ? defs.slice(0, 12) : defs;
  const openRow = open ? byKey.get(open.key) : undefined;

  return (
    <div>
      {!compact && (
        <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {['All', ...ACHIEVEMENT_CATEGORIES].map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>
          ))}
        </div>
      )}
      <div className="mb-3 flex items-center justify-between text-xs text-text-muted">
        <span><span className="font-bold text-white">{earnedCount}</span> of {ACHIEVEMENTS.length} badges earned</span>
      </div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {shown.map((def) => {
          const row = byKey.get(def.key);
          const earned = !!row?.earned_at;
          return (
            <li key={def.key}>
              <button
                onClick={() => setOpen(def)}
                className={`flex h-full w-full flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors ${
                  earned ? 'border-chess-border bg-[#1E1C18] hover:border-primary/40' : 'border-dashed border-chess-border/70 hover:border-chess-border'
                }`}
              >
                <BadgeMedal def={def} earned={earned} />
                <span className={`line-clamp-2 text-[11px] font-semibold leading-tight ${earned ? 'text-white' : 'text-text-muted'}`}>
                  {def.secret && !earned ? 'Secret badge' : def.name}
                </span>
                {!earned && def.target > 1 && row && (
                  <ProgressBar value={progressFraction(def, row)} max={1} className="!h-1" />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? (open.secret && !openRow?.earned_at ? 'Secret badge' : open.name) : ''}>
        {open && (
          <div className="flex flex-col items-center text-center">
            <BadgeMedal def={open} earned={!!openRow?.earned_at} size="lg" />
            <span className={`mt-3 text-xs font-bold uppercase tracking-wider ${TIER_STYLE[open.tier].text}`}>{TIER_STYLE[open.tier].label} · {open.category}</span>
            <p className="mt-2 text-sm text-white">{open.secret && !openRow?.earned_at ? 'Keep playing to discover how to unlock this one.' : open.description}</p>
            {openRow?.earned_at ? (
              <p className="mt-2 text-xs text-primary">Earned {formatDate(openRow.earned_at)}</p>
            ) : openRow && open.target > 1 ? (
              <div className="mt-3 w-full max-w-xs">
                <ProgressBar value={progressFraction(open, openRow)} max={1} />
                <p className="mt-1.5 text-xs text-text-muted">{progressText(open, openRow)}</p>
              </div>
            ) : null}
            {rarity?.[open.key] && rarity[open.key].active > 0 && (
              <p className="mt-3 text-xs text-text-muted">
                Held by {Math.round((rarity[open.key].earned / rarity[open.key].active) * 100)}% of active players
              </p>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}

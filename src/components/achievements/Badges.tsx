import { useId, useMemo, useState } from 'react';
import {
  Award, Axe, BadgeCheck, BookOpen, Brain, BrickWall, CalendarCheck, CalendarDays, CalendarHeart, Camera, Castle,
  Clock, Coffee, CopyCheck, Crosshair, Crown, Dog, Dumbbell, Eye, Flag, Flame, FlameKindling, Footprints, Gavel, Gem,
  Globe, GraduationCap, Grid3x3, Hammer, HelpCircle, Hourglass, Infinity as InfinityIcon, Landmark, Link, Lock, Medal,
  Megaphone, Moon, MoonStar, Mountain, MountainSnow, Network, PartyPopper, Play, Repeat, Rocket, RotateCcw, Scale,
  Shapes, ShieldCheck, Skull, Sparkle, Sparkles, Sprout, Star, Sun, Sword, Swords, Target, Ticket, Timer, Tornado,
  TrendingUp, Trophy, Users, UsersRound, Zap, type LucideIcon,
} from 'lucide-react';
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

// Explicit map (not `import *`) so only these icons end up in the bundle.
const BADGE_ICONS: Record<string, LucideIcon> = {
  Award, Axe, BadgeCheck, BookOpen, Brain, BrickWall, CalendarCheck, CalendarDays, CalendarHeart, Camera, Castle,
  Clock, Coffee, CopyCheck, Crosshair, Crown, Dog, Dumbbell, Eye, Flag, Flame, FlameKindling, Footprints, Gavel, Gem,
  Globe, GraduationCap, Grid3x3, Hammer, Hourglass, Infinity: InfinityIcon, Landmark, Link, Medal, Megaphone, Moon,
  MoonStar, Mountain, MountainSnow, Network, PartyPopper, Play, Repeat, Rocket, RotateCcw, Scale, Shapes, ShieldCheck,
  Skull, Sparkle, Sparkles, Sprout, Star, Sun, Sword, Swords, Target, Ticket, Timer, Tornado, TrendingUp, Trophy, Users,
  UsersRound, Zap,
};

const TIER_STYLE: Record<AchievementTier, { label: string; text: string }> = {
  bronze: { label: 'Bronze', text: 'text-amber-500' },
  silver: { label: 'Silver', text: 'text-slate-300' },
  gold: { label: 'Gold', text: 'text-yellow-400' },
  platinum: { label: 'Platinum', text: 'text-cyan-300' },
  legendary: { label: 'Legendary', text: 'text-fuchsia-300' },
};

// Metal finishes: light edge -> body -> shadow, a bright rim, and an icon ink that reads on the body colour.
const METAL: Record<AchievementTier, { stops: [string, string, string]; rim: string; ink: string; glow?: string }> = {
  bronze: { stops: ['#F6C08A', '#C47A3C', '#6E3A12'], rim: '#FFD7AE', ink: '#FFF4E6' },
  silver: { stops: ['#FFFFFF', '#C9D1DC', '#5F6B7A'], rim: '#FFFFFF', ink: '#1E293B' },
  gold: { stops: ['#FFF3A3', '#F5C518', '#94600A'], rim: '#FFF9D6', ink: '#3F2304' },
  platinum: { stops: ['#E2FDFF', '#7BE3F3', '#0B6E86'], rim: '#F0FEFF', ink: '#062F3A' },
  legendary: { stops: ['#FBD7FF', '#D24BE8', '#5B1890'], rim: '#FCE8FF', ink: '#FFFFFF', glow: 'rgba(210,75,232,0.55)' },
};

const HEX = 'M32 2.5 57.5 17v30L32 61.5 6.5 47V17Z';
const HEX_INNER = 'M32 8.5 52 20v24L32 55.5 12 44V20Z';
const SIZE = { sm: 40, md: 56, lg: 84 } as const;

export function tierLabel(tier: AchievementTier) {
  return TIER_STYLE[tier];
}

/** Hexagonal medallion: metallic finish when earned, carved stone with a lock while locked. */
export function BadgeMedal({ def, earned, size = 'md' }: { def: AchievementDef; earned: boolean; size?: keyof typeof SIZE }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const px = SIZE[size];
  const metal = METAL[def.tier];
  const hidden = def.secret && !earned;
  const Icon = hidden ? HelpCircle : BADGE_ICONS[def.icon] ?? Award;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${earned && def.tier === 'legendary' ? 'badge-legendary' : ''}`}
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" width={px} height={px} className="absolute inset-0 overflow-visible">
        <defs>
          <linearGradient id={`body-${uid}`} x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0" stopColor={metal.stops[0]} />
            <stop offset="0.5" stopColor={metal.stops[1]} />
            <stop offset="1" stopColor={metal.stops[2]} />
          </linearGradient>
          <linearGradient id={`gloss-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.5" />
            <stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.06" />
            <stop offset="0.46" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {earned ? (
          <>
            <path d={HEX} fill={`url(#body-${uid})`} />
            <path d={HEX} fill={`url(#gloss-${uid})`} />
            <path d={HEX_INNER} fill="none" stroke="#000000" strokeOpacity="0.22" strokeWidth="1.6" strokeLinejoin="round" />
            <path d={HEX} fill="none" stroke={metal.rim} strokeOpacity="0.9" strokeWidth="1.8" strokeLinejoin="round" />
          </>
        ) : (
          <>
            <path d={HEX} fill="#22201D" />
            <path d={HEX_INNER} fill="none" stroke="#33312D" strokeWidth="1.6" strokeLinejoin="round" />
            <path d={HEX} fill="none" stroke="#3B3935" strokeWidth="1.8" strokeLinejoin="round" />
          </>
        )}
      </svg>
      <Icon
        className="relative"
        style={{ width: px * 0.4, height: px * 0.4, color: earned ? metal.ink : '#5C5A56' }}
        strokeWidth={2.4}
      />
      {!earned && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border border-chess-border bg-[#1A1916]"
          style={{ width: Math.max(16, px * 0.34), height: Math.max(16, px * 0.34) }}
        >
          <Lock className="text-text-muted" style={{ width: Math.max(9, px * 0.17), height: Math.max(9, px * 0.17) }} />
        </span>
      )}
    </span>
  );
}

/** Gold / silver / bronze rank coin for podiums. */
export function RankMedal({ rank, size = 28 }: { rank: 1 | 2 | 3; size?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const metal = METAL[rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze'];
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} aria-label={`Place ${rank}`}>
      <svg viewBox="0 0 32 32" width={size} height={size} className="absolute inset-0">
        <defs>
          <linearGradient id={`coin-${uid}`} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor={metal.stops[0]} />
            <stop offset="0.55" stopColor={metal.stops[1]} />
            <stop offset="1" stopColor={metal.stops[2]} />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="14.5" fill={`url(#coin-${uid})`} stroke={metal.rim} strokeWidth="1.5" />
        <circle cx="16" cy="16" r="10.5" fill="none" stroke="#000000" strokeOpacity="0.2" strokeWidth="1.2" />
      </svg>
      <span className="relative text-[13px] font-black leading-none" style={{ color: metal.ink }}>{rank}</span>
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

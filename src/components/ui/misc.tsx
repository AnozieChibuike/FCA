import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Clock, Flame, Landmark, Zap, type LucideIcon } from 'lucide-react';
import type { GameMode } from '../../types';
import { countdownParts } from '../../lib/format';

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-white/20 border-t-primary ${className}`} aria-label="Loading" />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />;
}

export function Card({ children, className = '', as: As = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' }) {
  return <As className={`rounded-2xl border border-chess-border bg-surface ${className}`}>{children}</As>;
}

export function SectionHeader({ title, subtitle, to, action }: { title: ReactNode; subtitle?: ReactNode; to?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-bold text-white sm:text-lg">{title}</h2>
        {subtitle && <p className="text-xs text-text-muted sm:text-sm">{subtitle}</p>}
      </div>
      {action ?? (to && (
        <Link to={to} className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary hover:text-primary-light">
          See all <ChevronRight className="h-4 w-4" />
        </Link>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon?: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {Icon && (
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04] text-text-muted">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <p className="font-semibold text-white">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className = '', size = 'md' }: {
  value: T; onChange: (v: T) => void; options: Array<{ value: T; label: ReactNode }>; className?: string; size?: 'sm' | 'md';
}) {
  return (
    <div role="tablist" className={`no-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-chess-border bg-[#1E1C18] p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex shrink-0 grow items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-colors ${
            size === 'sm' ? 'min-h-[34px] px-2.5 text-xs' : 'min-h-[40px] px-2.5 text-sm sm:px-3'
          } ${value === o.value ? 'bg-surface-hover text-white shadow-sm' : 'text-text-muted hover:text-white'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[36px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-xs font-semibold transition-colors ${
        active ? 'border-primary bg-primary/15 text-primary-light' : 'border-chess-border bg-surface text-text-muted hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

export function StatTile({ label, value, sub, icon: Icon }: { label: string; value: ReactNode; sub?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-chess-border bg-surface p-3.5 sm:p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold text-white">{value}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-text-muted">{sub}</div>}
    </div>
  );
}

export function ProgressBar({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07] ${className}`}>
      <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

const MODE_ICON: Record<GameMode, LucideIcon> = { BLITZ: Zap, RAPID: Clock, BULLET: Flame, CLASSICAL: Landmark };
const MODE_COLOR: Record<GameMode, string> = {
  BLITZ: 'text-amber-400', RAPID: 'text-sky-400', BULLET: 'text-rose-400', CLASSICAL: 'text-emerald-400',
};

export function ModeIcon({ mode, className = 'h-3.5 w-3.5' }: { mode: GameMode; className?: string }) {
  const Icon = MODE_ICON[mode] ?? Zap;
  return <Icon className={`${MODE_COLOR[mode] ?? ''} ${className}`} aria-hidden="true" />;
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function Countdown({ to, compact = false }: { to: string; compact?: boolean }) {
  useNow(1000);
  const c = countdownParts(to);
  if (c.done) return <span>Starting now</span>;
  const units: Array<[number, string]> = [[c.days, 'd'], [c.hours, 'h'], [c.minutes, 'm'], [c.seconds, 's']];
  const shown = c.days > 0 ? units.slice(0, 3) : units.slice(1);
  if (compact) return <span className="tabular-nums">{shown.map(([n, u]) => `${n}${u}`).join(' ')}</span>;
  return (
    <span className="flex gap-1.5 tabular-nums">
      {shown.map(([n, u]) => (
        <span key={u} className="flex min-w-[44px] flex-col items-center rounded-lg bg-black/30 px-2 py-1">
          <span className="text-lg font-bold leading-tight text-white">{String(n).padStart(2, '0')}</span>
          <span className="text-[10px] uppercase text-text-muted">{u}</span>
        </span>
      ))}
    </span>
  );
}

export function ResultPill({ outcome }: { outcome: 'W' | 'D' | 'L' }) {
  const cls = outcome === 'W' ? 'bg-emerald-500/15 text-emerald-300' : outcome === 'L' ? 'bg-rose-500/15 text-rose-300' : 'bg-white/10 text-text-muted';
  return <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold ${cls}`}>{outcome}</span>;
}

export function Diff({ value, className = '' }: { value: number | null | undefined; className?: string }) {
  if (value == null) return null;
  const cls = value > 0 ? 'text-emerald-400' : value < 0 ? 'text-rose-400' : 'text-text-muted';
  return <span className={`font-semibold tabular-nums ${cls} ${className}`}>{value > 0 ? `+${value}` : value}</span>;
}

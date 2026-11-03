import { useMemo } from 'react';
import { Award, CheckCircle2, Crown, Sparkles, Swords, Trophy, Zap, type LucideIcon } from 'lucide-react';
import type { Profile, TitleStats } from '../../types';
import { TITLE_CONFIG } from '../../types';
import { getTitleProgress } from '../../lib/elo';
import { TitleBadge } from '../ui/Avatar';

interface TitleProgressPillProps {
  player: Profile;
  stats: TitleStats | null;
}

export default function TitleProgressPill({ player, stats }: TitleProgressPillProps) {
  const progress = useMemo(() => getTitleProgress(player, stats), [player, stats]);

  if (progress.isImmortal) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-purple-500/30 bg-purple-950/20 px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span className="font-semibold text-purple-200">FCA Eternal</span>
          <span className="text-xs text-purple-300/80">• Honorary lifetime memorial title</span>
        </div>
        <TitleBadge title="FET" />
      </div>
    );
  }

  if (progress.isMaxTitle && progress.currentTitle === 'FGM') {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/20 px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-rose-400" />
          <span className="font-semibold text-rose-200">FCA Grandmaster</span>
          <span className="text-xs text-rose-300/80">• Pinnacle of FCA chess</span>
        </div>
        <TitleBadge title="FGM" />
      </div>
    );
  }

  const nextCfg = progress.nextTitle ? TITLE_CONFIG[progress.nextTitle] : null;
  if (!nextCfg || !progress.targetElo) return null;

  return (
    <div className="rounded-2xl border border-chess-border bg-[#1E1C18]/90 p-3.5 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-yellow-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Title Progression</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Target:</span>
          <span className="text-xs font-bold text-white">{nextCfg.label}</span>
          <TitleBadge title={progress.nextTitle} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
        <Requirement icon={Zap} iconClass="text-primary-light" bar="bg-primary" label="Peak Elo"
          value={progress.peakElo} target={progress.targetElo} done="Met" todo={(n) => `${n} Elo away`} />
        <Requirement icon={Trophy} iconClass="text-sky-400" bar="bg-sky-400" label="Rated Games"
          value={progress.totalGames} target={progress.minGamesRequired} done="Established" todo={(n) => `${n} more to establish`} />
        {progress.targetPodiums != null && (
          <Requirement icon={Crown} iconClass="text-amber-400" bar="bg-amber-400" label="FCA Podiums"
            value={progress.fcaPodiums} target={progress.targetPodiums} done="Qualified" todo={(n) => `${n} more podiums`} />
        )}
        {progress.targetWins != null && (
          <Requirement icon={Crown} iconClass="text-rose-400" bar="bg-rose-400" label="FCA Wins"
            value={progress.fcaWins} target={progress.targetWins} done="Qualified" todo={(n) => `${n} more 1st-place wins`} />
        )}
        {progress.targetFgmBeaten != null && (
          <Requirement icon={Swords} iconClass="text-rose-400" bar="bg-rose-400" label="FGMs Beaten"
            value={progress.fgmBeaten} target={progress.targetFgmBeaten} done="Qualified" todo={(n) => `beat ${n} more FGM${n === 1 ? '' : 's'}`} />
        )}
      </div>
      {(progress.targetPodiums != null || progress.targetWins != null) && (
        <p className="mt-2 text-[10px] text-text-muted">Podiums and wins count in events with 8+ FCA members.</p>
      )}
    </div>
  );
}


function Requirement({ icon: Icon, iconClass, bar, label, value, target, done, todo }: {
  icon: LucideIcon; iconClass: string; bar: string; label: string;
  value: number; target: number; done: string; todo: (remaining: number) => string;
}) {
  const met = value >= target;
  return (
    <div className="rounded-xl border border-white/[0.04] bg-surface/60 p-2.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex min-w-0 items-center gap-1.5 text-text-muted">
          <Icon className={`h-3 w-3 shrink-0 ${iconClass}`} /> <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 font-semibold tabular-nums text-white">
          {value} <span className="font-normal text-text-muted">/ {target}</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-300 ${met ? 'bg-emerald-400' : bar}`}
          style={{ width: `${Math.min(100, Math.round((value / target) * 100))}%` }}
        />
      </div>
      <div className="mt-1 flex justify-end">
        {met ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
            <CheckCircle2 className="h-2.5 w-2.5" /> {done}
          </span>
        ) : (
          <span className="text-[10px] tabular-nums text-text-muted">{todo(target - value)}</span>
        )}
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { Award, CheckCircle2, Crown, Sparkles, Trophy, Zap } from 'lucide-react';
import type { Profile, Standing } from '../../types';
import { TITLE_CONFIG } from '../../types';
import { getTitleProgress } from '../../lib/elo';
import { TitleBadge } from '../ui/Avatar';

interface TitleProgressPillProps {
  player: Profile;
  events?: Standing[];
}

export default function TitleProgressPill({ player, events = [] }: TitleProgressPillProps) {
  const progress = useMemo(() => getTitleProgress(player, events), [player, events]);

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

  const eloDone = progress.peakElo >= progress.targetElo;
  const gamesDone = progress.totalGames >= progress.minGamesRequired;
  const podiumsDone = progress.targetPodiums == null || progress.fcaPodiums >= progress.targetPodiums;
  const winsDone = progress.targetWins == null || progress.fcaWins >= progress.targetWins;

  const eloPercent = Math.min(100, Math.round((progress.peakElo / progress.targetElo) * 100));
  const gamesPercent = Math.min(100, Math.round((progress.totalGames / progress.minGamesRequired) * 100));

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
        {/* Peak Elo requirement */}
        <div className="rounded-xl border border-white/[0.04] bg-surface/60 p-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-text-muted">
              <Zap className="h-3 w-3 text-primary-light" /> Peak Elo
            </span>
            <span className="font-semibold tabular-nums text-white">
              {progress.peakElo} <span className="text-text-muted font-normal">/ {progress.targetElo}</span>
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-300 ${eloDone ? 'bg-emerald-400' : 'bg-primary'}`}
              style={{ width: `${eloPercent}%` }}
            />
          </div>
          <div className="mt-1 flex justify-end">
            {eloDone ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                <CheckCircle2 className="h-2.5 w-2.5" /> Met
              </span>
            ) : (
              <span className="text-[10px] text-text-muted tabular-nums">
                {progress.targetElo - progress.peakElo} Elo away
              </span>
            )}
          </div>
        </div>

        {/* 25 Games requirement */}
        <div className="rounded-xl border border-white/[0.04] bg-surface/60 p-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-text-muted">
              <Trophy className="h-3 w-3 text-sky-400" /> Rated Games
            </span>
            <span className="font-semibold tabular-nums text-white">
              {progress.totalGames} <span className="text-text-muted font-normal">/ {progress.minGamesRequired}</span>
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-300 ${gamesDone ? 'bg-emerald-400' : 'bg-sky-400'}`}
              style={{ width: `${gamesPercent}%` }}
            />
          </div>
          <div className="mt-1 flex justify-end">
            {gamesDone ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                <CheckCircle2 className="h-2.5 w-2.5" /> Established
              </span>
            ) : (
              <span className="text-[10px] text-text-muted tabular-nums">
                {progress.minGamesRequired - progress.totalGames} more to establish
              </span>
            )}
          </div>
        </div>

        {/* Podiums for FIM or Wins for FGM */}
        {progress.targetPodiums != null && (
          <div className="rounded-xl border border-white/[0.04] bg-surface/60 p-2.5 sm:col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-text-muted">
                <Crown className="h-3 w-3 text-amber-400" /> FCA Podiums
              </span>
              <span className="font-semibold tabular-nums text-white">
                {progress.fcaPodiums} <span className="text-text-muted font-normal">/ {progress.targetPodiums}</span>
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-300 ${podiumsDone ? 'bg-emerald-400' : 'bg-amber-400'}`}
                style={{ width: `${Math.min(100, Math.round((progress.fcaPodiums / progress.targetPodiums) * 100))}%` }}
              />
            </div>
            <div className="mt-1 flex justify-end">
              {podiumsDone ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Qualified
                </span>
              ) : (
                <span className="text-[10px] text-text-muted tabular-nums">
                  {progress.targetPodiums - progress.fcaPodiums} more podiums
                </span>
              )}
            </div>
          </div>
        )}

        {progress.targetWins != null && (
          <div className="rounded-xl border border-white/[0.04] bg-surface/60 p-2.5 sm:col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-text-muted">
                <Crown className="h-3 w-3 text-rose-400" /> FCA Wins
              </span>
              <span className="font-semibold tabular-nums text-white">
                {progress.fcaWins} <span className="text-text-muted font-normal">/ {progress.targetWins}</span>
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-300 ${winsDone ? 'bg-emerald-400' : 'bg-rose-400'}`}
                style={{ width: `${Math.min(100, Math.round((progress.fcaWins / progress.targetWins) * 100))}%` }}
              />
            </div>
            <div className="mt-1 flex justify-end">
              {winsDone ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Qualified
                </span>
              ) : (
                <span className="text-[10px] text-text-muted tabular-nums">
                  {progress.targetWins - progress.fcaWins} more 1st-place wins
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


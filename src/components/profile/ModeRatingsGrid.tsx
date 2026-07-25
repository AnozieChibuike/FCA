import React from 'react';
import { Zap, Clock, Rocket, Landmark, TrendingUp, Swords } from 'lucide-react';
import { MODE_LABELS, type Profile as ProfileType, type GameMode } from '../../types';

const MODES: GameMode[] = ['BLITZ', 'RAPID', 'BULLET', 'CLASSICAL'];

const MODE_ICONS: Record<GameMode, React.ReactNode> = {
  BLITZ: <Zap className="w-4 h-4 text-primary shrink-0" />,
  RAPID: <Clock className="w-4 h-4 text-primary shrink-0" />,
  BULLET: <Rocket className="w-4 h-4 text-primary shrink-0" />,
  CLASSICAL: <Landmark className="w-4 h-4 text-primary shrink-0" />
};

interface ModeRatingsGridProps {
  player: ProfileType;
}

export default function ModeRatingsGrid({ player }: ModeRatingsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
      {MODES.map((mode) => {
        const elo = player[`${mode.toLowerCase()}_elo` as keyof ProfileType] as number;
        const peak = (player[`peak_${mode.toLowerCase()}_elo` as keyof ProfileType] as number) ?? elo;
        const games = player[`${mode.toLowerCase()}_games` as keyof ProfileType] as number;

        return (
          <div
            key={mode}
            className="bg-surface border border-chess-border p-3.5 sm:p-5 rounded-lg shadow-card hover:border-primary/50 transition-colors flex flex-col justify-between"
          >
            {/* Top row: Mode Icon + Mode Label & Compact Icon Game Count */}
            <div className="flex items-center justify-between gap-1.5 mb-2 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                {MODE_ICONS[mode]}
                <span className="text-[11px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider truncate">
                  {MODE_LABELS[mode]}
                </span>
              </div>

              {/* Compact game counter using Swords icon to eliminate text overlap */}
              <span
                title={`${games} games played`}
                className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-text-muted font-mono bg-[#161512] px-1.5 py-0.5 rounded border border-chess-border shrink-0"
              >
                <Swords className="w-3 h-3 text-primary/80" />
                <span>{games}</span>
              </span>
            </div>

            {/* Rating Value */}
            <div className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">
              {elo}
            </div>

            {/* Bottom row: Peak Elo */}
            <div className="text-xs font-medium flex items-center justify-between text-text-muted pt-2 border-t border-chess-border/60">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px] sm:text-xs">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Peak:</span>
              </span>
              <span className="text-emerald-400 font-bold font-mono text-xs sm:text-sm">{peak}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

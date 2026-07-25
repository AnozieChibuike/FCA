import { useMemo } from 'react';
import { Game } from '../types';
import { Trophy, Flame, Swords, ShieldAlert } from 'lucide-react';

interface OpponentStat {
  id: string;
  name: string;
  games: number;
  wins: number;
  losses: number;
}

interface PlayerStatsProps {
  games: Game[];
  playerId: string;
}

export default function PlayerStats({ games, playerId }: PlayerStatsProps) {
  const stats = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let whiteGames = 0;
    let whiteWins = 0;
    let blackGames = 0;
    let blackWins = 0;

    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    const opponentStats: Record<string, OpponentStat> = {};

    const chronologicalGames = [...games].reverse();

    chronologicalGames.forEach((game) => {
      const isWhite = game.white_player_id === playerId;
      const isBlack = game.black_player_id === playerId;

      let isWin = false;
      let isLoss = false;
      let isDraw = game.result === 0.5;

      if (isWhite) {
        whiteGames++;
        if (game.result === 1) {
          isWin = true;
          whiteWins++;
        }
        if (game.result === 0) {
          isLoss = true;
        }
      } else if (isBlack) {
        blackGames++;
        if (game.result === 0) {
          isWin = true;
          blackWins++;
        }
        if (game.result === 1) {
          isLoss = true;
        }
      }

      if (isWin) {
        wins++;
        tempStreak++;
        if (tempStreak > maxStreak) maxStreak = tempStreak;
      } else if (isLoss) {
        losses++;
        tempStreak = 0;
      } else if (isDraw) {
        draws++;
        tempStreak = 0;
      }

      const opponentId = isWhite ? game.black_player_id : game.white_player_id;
      const opponentName = isWhite ? game.black_player?.full_name : game.white_player?.full_name;

      if (opponentId && opponentName) {
        if (!opponentStats[opponentId]) {
          opponentStats[opponentId] = { id: opponentId, name: opponentName, games: 0, wins: 0, losses: 0 };
        }
        opponentStats[opponentId].games++;
        if (isWin) opponentStats[opponentId].wins++;
        if (isLoss) opponentStats[opponentId].losses++;
      }
    });

    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      const isWhite = game.white_player_id === playerId;
      const isWin = (isWhite && game.result === 1) || (!isWhite && game.result === 0);
      if (isWin) {
        currentStreak++;
      } else {
        break;
      }
    }

    const totalGames = games.length;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    const whiteWinRate = whiteGames > 0 ? Math.round((whiteWins / whiteGames) * 100) : 0;
    const blackWinRate = blackGames > 0 ? Math.round((blackWins / blackGames) * 100) : 0;

    let hardestOpponent: OpponentStat | null = null;
    let highestLossRate = -1;

    let favoriteOpponent: OpponentStat | null = null;
    let mostWins = -1;

    Object.values(opponentStats).forEach((opp) => {
      if (opp.games >= 3) {
        const lossRate = opp.losses / opp.games;
        if (lossRate > highestLossRate) {
          highestLossRate = lossRate;
          hardestOpponent = opp;
        }
      }
      if (opp.wins > mostWins) {
        mostWins = opp.wins;
        favoriteOpponent = opp;
      }
    });

    return {
      totalGames,
      wins,
      losses,
      draws,
      winRate,
      whiteGames,
      whiteWins,
      whiteWinRate,
      blackGames,
      blackWins,
      blackWinRate,
      currentStreak,
      maxStreak,
      hardestOpponent: hardestOpponent as OpponentStat | null,
      favoriteOpponent: favoriteOpponent as OpponentStat | null,
    };
  }, [games, playerId]);

  if (games.length === 0) return null;

  return (
    <div className="mb-8 sm:mb-10">
      <div className="flex items-center gap-2 mb-4 sm:mb-5">
        <Trophy className="w-5 h-5 text-primary shrink-0" />
        <h2 className="text-lg sm:text-xl font-extrabold text-white">Performance Analytics</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Overall Win Rate & W/D/L Grid */}
        <div className="bg-surface border border-chess-border p-3.5 sm:p-5 rounded-lg shadow-card flex flex-col justify-between">
          <div>
            <span className="text-[11px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">
              Win Rate
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {stats.winRate}%
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 mt-3 pt-2 border-t border-chess-border/60 text-center font-mono">
            <div className="bg-emerald-950/40 border border-emerald-600/30 rounded py-1 px-0.5">
              <span className="text-[10px] text-emerald-400 block font-bold">W</span>
              <span className="text-xs text-white font-extrabold">{stats.wins}</span>
            </div>
            <div className="bg-amber-950/40 border border-amber-600/30 rounded py-1 px-0.5">
              <span className="text-[10px] text-amber-400 block font-bold">D</span>
              <span className="text-xs text-white font-extrabold">{stats.draws}</span>
            </div>
            <div className="bg-rose-950/40 border border-rose-600/30 rounded py-1 px-0.5">
              <span className="text-[10px] text-rose-400 block font-bold">L</span>
              <span className="text-xs text-white font-extrabold">{stats.losses}</span>
            </div>
          </div>
        </div>

        {/* Win Streaks */}
        <div className="bg-surface border border-chess-border p-3.5 sm:p-5 rounded-lg shadow-card flex flex-col justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">
            Win Streaks
          </span>
          <div className="grid grid-cols-2 gap-2 my-auto py-1">
            <div className="bg-[#161512] border border-chess-border/60 rounded p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-orange-400 font-semibold mb-0.5">
                <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                <span>Current</span>
              </div>
              <span className="text-xl sm:text-2xl font-extrabold text-orange-400 font-mono">
                {stats.currentStreak}
              </span>
            </div>

            <div className="bg-[#161512] border border-chess-border/60 rounded p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-amber-400 font-semibold mb-0.5">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>Best</span>
              </div>
              <span className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                {stats.maxStreak}
              </span>
            </div>
          </div>
          <div className="text-[10px] text-text-muted text-center pt-2 border-t border-chess-border/60 truncate font-mono">
            {stats.currentStreak > 0 ? `🔥 ${stats.currentStreak} game win streak` : 'No active win streak'}
          </div>
        </div>

        {/* Win Rate by Color */}
        <div className="bg-surface border border-chess-border p-3.5 sm:p-5 rounded-lg shadow-card flex flex-col justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">
            By Color
          </span>
          <div className="space-y-2.5 my-auto">
            <div>
              <div className="flex justify-between items-center text-[11px] sm:text-xs font-medium mb-1">
                <span className="text-white">⚪ White</span>
                <span className="text-primary font-bold font-mono">{stats.whiteWinRate}%</span>
              </div>
              <div className="w-full bg-[#161512] rounded-full h-1.5 overflow-hidden border border-chess-border/40">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${stats.whiteWinRate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-[11px] sm:text-xs font-medium mb-1">
                <span className="text-white">⚫ Black</span>
                <span className="text-primary font-bold font-mono">{stats.blackWinRate}%</span>
              </div>
              <div className="w-full bg-[#161512] rounded-full h-1.5 overflow-hidden border border-chess-border/40">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${stats.blackWinRate}%` }}
                />
              </div>
            </div>
          </div>
          <div className="text-[10px] text-text-muted text-center pt-2 border-t border-chess-border/60 truncate font-mono">
            {stats.whiteGames}W / {stats.blackGames}B total
          </div>
        </div>

        {/* Rival Analytics */}
        <div className="bg-surface border border-chess-border p-3.5 sm:p-5 rounded-lg shadow-card flex flex-col justify-between min-w-0">
          <span className="text-[11px] sm:text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">
            Rival Analytics
          </span>

          <div className="space-y-2 my-auto min-w-0">
            <div className="min-w-0">
              <div className="text-[10px] text-text-muted mb-0.5 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
                <span>Toughest Rival</span>
              </div>
              <div className="text-xs text-rose-400 font-bold truncate">
                {stats.hardestOpponent ? stats.hardestOpponent.name : 'None yet'}
              </div>
            </div>

            <div className="min-w-0 pt-1.5 border-t border-chess-border/40">
              <div className="text-[10px] text-text-muted mb-0.5 flex items-center gap-1">
                <Swords className="w-3 h-3 text-primary shrink-0" />
                <span>Most Wins Against</span>
              </div>
              <div className="text-xs text-primary font-bold truncate">
                {stats.favoriteOpponent && stats.favoriteOpponent.wins > 0 ? stats.favoriteOpponent.name : 'None yet'}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-text-muted text-center pt-2 border-t border-chess-border/60 truncate font-mono">
            Head-to-head records
          </div>
        </div>
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { Game } from '../types';
import { Trophy } from 'lucide-react';

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

    chronologicalGames.forEach(game => {
      const isWhite = game.white_player_id === playerId;
      const isBlack = game.black_player_id === playerId;
      
      let isWin = false;
      let isLoss = false;
      let isDraw = game.result === 0.5;

      if (isWhite) {
        whiteGames++;
        if (game.result === 1) { isWin = true; whiteWins++; }
        if (game.result === 0) { isLoss = true; }
      } else if (isBlack) {
        blackGames++;
        if (game.result === 0) { isWin = true; blackWins++; }
        if (game.result === 1) { isLoss = true; }
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

    Object.values(opponentStats).forEach(opp => {
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
      totalGames, wins, losses, draws, winRate,
      whiteGames, whiteWins, whiteWinRate,
      blackGames, blackWins, blackWinRate,
      currentStreak, maxStreak,
      hardestOpponent: hardestOpponent as OpponentStat | null,
      favoriteOpponent: favoriteOpponent as OpponentStat | null
    };
  }, [games, playerId]);

  if (games.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2.5 mb-5">
        <Trophy className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-extrabold text-white">Performance Analytics</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Win Rate */}
        <div className="bg-surface border border-chess-border p-5 rounded-lg shadow-card">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Win Rate</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-extrabold text-white">{stats.winRate}%</span>
          </div>
          <div className="mt-3 text-xs flex items-center gap-3 font-semibold">
            <span className="text-primary">{stats.wins} W</span>
            <span className="text-yellow-500">{stats.draws} D</span>
            <span className="text-red-400">{stats.losses} L</span>
          </div>
        </div>

        {/* Color Stats */}
        <div className="bg-surface border border-chess-border p-5 rounded-lg shadow-card">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Win Rate by Color</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-medium">
              <span className="text-white">⚪ White</span>
              <span className="text-primary font-bold">{stats.whiteWinRate}%</span>
            </div>
            <div className="w-full bg-[#161512] rounded-full h-1.5 mb-2">
              <div className="bg-primary h-1.5 rounded-full" style={{ width: `${stats.whiteWinRate}%` }}></div>
            </div>
            <div className="flex justify-between items-center text-xs font-medium">
              <span className="text-white">⚫ Black</span>
              <span className="text-primary font-bold">{stats.blackWinRate}%</span>
            </div>
            <div className="w-full bg-[#161512] rounded-full h-1.5">
              <div className="bg-primary h-1.5 rounded-full" style={{ width: `${stats.blackWinRate}%` }}></div>
            </div>
          </div>
        </div>

        {/* Streaks */}
        <div className="bg-surface border border-chess-border p-5 rounded-lg shadow-card">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Win Streaks</p>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-extrabold text-orange-400">{stats.currentStreak}</span>
            <span className="text-xs text-text-muted mb-1 font-semibold">Current</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-lg font-bold text-white">{stats.maxStreak}</span>
            <span className="text-xs text-text-muted mb-0.5 font-medium">Best</span>
          </div>
        </div>

        {/* Opponents */}
        <div className="bg-surface border border-chess-border p-5 rounded-lg shadow-card">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Rival Analytics</p>
          
          <div className="mb-2">
            <div className="text-[11px] text-text-muted mb-0.5">Toughest Rival</div>
            <div className="text-xs text-red-400 font-bold truncate">
              {stats.hardestOpponent ? stats.hardestOpponent.name : 'N/A'}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-text-muted mb-0.5">Most Wins Against</div>
            <div className="text-xs text-primary font-bold truncate">
              {stats.favoriteOpponent && stats.favoriteOpponent.wins > 0 ? stats.favoriteOpponent.name : 'N/A'}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

import { History, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Game, Profile as ProfileType } from '../../types';
import { extractLichessGameId } from '../../lib/lichess';

interface EnrichedGame extends Game {
  stats: {
    eloBefore: number;
    eloAfter: number;
    eloDiff: number;
    oppEloBefore: number;
    oppEloAfter: number;
    peakElo: number;
  };
}

interface MatchHistoryTableProps {
  player: ProfileType;
  allGames: Game[];
  paginatedGames: EnrichedGame[];
  currentGamesPage: number;
  totalGamesPages: number;
  startIndex: number;
  gamesPerPage: number;
  onPageChange: (page: number) => void;
}

export default function MatchHistoryTable({
  player,
  allGames,
  paginatedGames,
  currentGamesPage,
  totalGamesPages,
  startIndex,
  gamesPerPage,
  onPageChange,
}: MatchHistoryTableProps) {
  return (
    <div className="mb-8">
      {/* Match History Header */}
      <div className="mb-4 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <History className="w-5 h-5 text-primary shrink-0" />
          <h2 className="text-lg sm:text-xl font-extrabold text-white">Match History</h2>
        </div>
        {allGames.length > 0 && (
          <span className="text-xs text-text-muted font-mono">
            Total: <strong className="text-white">{allGames.length}</strong>
          </span>
        )}
      </div>

      <div className="bg-surface border border-chess-border rounded-lg shadow-card overflow-hidden">
        {/* MOBILE CARD VIEW (< sm) */}
        <div className="sm:hidden divide-y divide-chess-border">
          {paginatedGames.length === 0 ? (
            <div className="p-6 text-center text-text-muted italic text-xs">
              No games recorded yet.
            </div>
          ) : (
            paginatedGames.map((game) => {
              const isWhite = game.white_player_id === player.id;
              const opponent = isWhite ? game.black_player : game.white_player;
              const stats = game.stats;

              const isWin = (isWhite && game.result === 1) || (!isWhite && game.result === 0);
              const isLoss = (isWhite && game.result === 0) || (!isWhite && game.result === 1);

              const resultBadge = isWin
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
                : isLoss
                  ? 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                  : 'bg-amber-950/80 text-amber-300 border-amber-700/60';

              const resultText = isWin ? '1 - 0 WIN' : isLoss ? '0 - 1 LOSS' : '½ - ½ DRAW';

              const diffStr = stats.eloDiff > 0 ? `+${stats.eloDiff}` : `${stats.eloDiff}`;
              const diffColor = stats.eloDiff > 0
                ? 'text-emerald-400 font-bold'
                : stats.eloDiff < 0
                  ? 'text-rose-400 font-bold'
                  : 'text-text-muted font-medium';

              const gId = extractLichessGameId(game);
              const lUrl = game.external_url || (gId ? `https://lichess.org/${gId}` : null);

              return (
                <div key={game.id} className="p-3.5 space-y-2.5 hover:bg-[#2E2B27]/40 transition-colors">
                  {/* Top line: Date + Mode + Result */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#161512] border border-chess-border text-text-muted uppercase tracking-wider font-mono">
                        {game.mode}
                      </span>
                      <span className="text-[11px] text-text-muted font-mono">
                        {new Date(game.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold border ${resultBadge}`}>
                      {resultText}
                    </span>
                  </div>

                  {/* Middle line: Opponent + Elo Rating outcome */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-text-muted text-[11px]">vs</span>
                      <span className="font-bold text-white truncate max-w-[140px]">
                        {opponent?.full_name || (isWhite ? 'Black' : 'White')}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-[#161512] border border-chess-border text-emerald-400 shrink-0">
                        ({stats.oppEloBefore})
                      </span>
                      <span className="text-[10px] text-text-muted font-mono shrink-0">({isWhite ? 'W' : 'B'})</span>
                    </div>

                    <div className="font-mono text-xs text-right shrink-0">
                      <span className="text-white font-bold">{stats.eloAfter}</span>
                      <span className={`ml-1 text-[11px] ${diffColor}`}>({diffStr})</span>
                    </div>
                  </div>

                  {/* Bottom line: Event name + Lichess link */}
                  <div className="flex items-center justify-between gap-2 text-[11px] text-text-muted pt-1 border-t border-chess-border/40">
                    <span className="truncate max-w-[200px]">
                      {game.event_name.replace(/\s*\[[a-zA-Z0-9]{8,12}\]/, '')}
                    </span>
                    {lUrl && (
                      <a
                        href={lUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline text-[11px] font-medium shrink-0"
                      >
                        <span>Lichess</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE VIEW (>= sm) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-[#1E1C18] border-b border-chess-border text-text-muted text-xs uppercase tracking-wider font-semibold">
                <th className="p-4">Date</th>
                <th className="p-4">Format</th>
                <th className="p-4">Match Opponent</th>
                <th className="p-4 text-center">Result</th>
                <th className="p-4 text-center">Elo Rating & Change</th>
                <th className="p-4 text-right">Event / Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-chess-border">
              {paginatedGames.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-muted italic">
                    No games recorded yet.
                  </td>
                </tr>
              ) : (
                paginatedGames.map((game) => {
                  const isWhite = game.white_player_id === player.id;
                  const opponent = isWhite ? game.black_player : game.white_player;
                  const stats = game.stats;

                  const isWin = (isWhite && game.result === 1) || (!isWhite && game.result === 0);
                  const isLoss = (isWhite && game.result === 0) || (!isWhite && game.result === 1);

                  const resultColor = isWin
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60'
                    : isLoss
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-700/60'
                      : 'bg-amber-950/80 text-amber-300 border border-amber-700/60';

                  const resultLabel = isWin ? '1 - 0 WIN' : isLoss ? '0 - 1 LOSS' : '½ - ½ DRAW';

                  const diffStr = stats.eloDiff > 0 ? `+${stats.eloDiff}` : `${stats.eloDiff}`;
                  const diffColor = stats.eloDiff > 0
                    ? 'text-emerald-400 font-bold'
                    : stats.eloDiff < 0
                      ? 'text-rose-400 font-bold'
                      : 'text-text-muted font-medium';

                  const gId = extractLichessGameId(game);
                  const lUrl = game.external_url || (gId ? `https://lichess.org/${gId}` : null);

                  return (
                    <tr key={game.id} className="hover:bg-[#2E2B27] transition-colors">
                      <td className="p-4 text-text-muted text-xs font-mono">
                        {new Date(game.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>

                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#161512] border border-chess-border text-text-muted uppercase tracking-wider font-mono">
                          {game.mode}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-xs flex-wrap">
                          <span className="text-text-muted font-medium">vs</span>
                          <span className="font-bold text-white">{opponent?.full_name || (isWhite ? 'Black' : 'White')}</span>
                          <span className="px-1.5 py-0.2 rounded text-[11px] font-mono font-bold bg-[#161512] border border-chess-border text-emerald-400">
                            ({stats.oppEloBefore})
                          </span>
                          <span className="text-[10px] text-text-muted font-mono">({isWhite ? 'White' : 'Black'})</span>
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-extrabold ${resultColor}`}>
                          {resultLabel}
                        </span>
                      </td>

                      <td className="p-4 text-center font-mono text-xs">
                        <span className="text-white font-bold text-sm">{stats.eloAfter}</span>
                        <span className={`ml-2 ${diffColor}`}>({diffStr})</span>
                      </td>

                      <td className="p-4 text-right text-text-muted text-xs">
                        <div className="flex items-center justify-end gap-2">
                          <span className="truncate max-w-[130px] font-medium">{game.event_name.replace(/\s*\[[a-zA-Z0-9]{8,12}\]/, '')}</span>
                          {lUrl && (
                            <a href={lUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-[11px] font-medium">
                              <span>Lichess</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        {allGames.length > 0 && (
          <div className="bg-[#1E1C18] border-t border-chess-border p-3 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
            <span>
              Showing {startIndex + 1}-{Math.min(startIndex + gamesPerPage, allGames.length)} of {allGames.length} games
            </span>

            {totalGamesPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange(Math.max(1, currentGamesPage - 1))}
                  disabled={currentGamesPage === 1}
                  className="px-3 py-1.5 rounded bg-[#161512] border border-chess-border hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <span className="text-xs text-white font-mono px-2">
                  Page <strong>{currentGamesPage}</strong> of <strong>{totalGamesPages}</strong>
                </span>

                <button
                  onClick={() => onPageChange(Math.min(totalGamesPages, currentGamesPage + 1))}
                  disabled={currentGamesPage === totalGamesPages}
                  className="px-3 py-1.5 rounded bg-[#161512] border border-chess-border hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

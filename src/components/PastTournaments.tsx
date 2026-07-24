import { useEffect, useState } from 'react';
import { Trophy, Calendar, ChevronRight, X, ExternalLink, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { extractLichessGameId } from '../lib/lichess';
import type { Game, GameMode } from '../types';

export interface TournamentSummary {
  name: string;
  games: Game[];
  gameCount: number;
  uniquePlayerCount: number;
  modes: GameMode[];
  latestDate: string;
  isChallenge: boolean;
  hasOtb: boolean;
  hasLichess: boolean;
  topScorerName?: string;
}

export default function PastTournaments() {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'OTB' | 'LICHESS' | 'CHALLENGE'>('ALL');
  const [selectedTournament, setSelectedTournament] = useState<TournamentSummary | null>(null);

  useEffect(() => {
    fetchTournaments();
  }, []);

  async function fetchTournaments() {
    try {
      const { data } = await supabase
        .from('games')
        .select(`
          *,
          white_player:profiles!white_player_id(id, full_name, fca_id, earned_title),
          black_player:profiles!black_player_id(id, full_name, fca_id, earned_title)
        `)
        .order('created_at', { ascending: false });

      if (data) {
        const rawGames = data as unknown as Game[];
        const eventMap = new Map<string, Game[]>();

        rawGames.forEach((game) => {
          const cleanName = (game.event_name || 'Challenge')
            .replace(/\s*\[[a-zA-Z0-9]{8,12}\]/, '')
            .trim();
          const key = cleanName || 'Challenge';
          if (!eventMap.has(key)) eventMap.set(key, []);
          eventMap.get(key)!.push(game);
        });

        const summaries: TournamentSummary[] = [];

        eventMap.forEach((games, name) => {
          const modesSet = new Set<GameMode>();
          const playerIds = new Set<string>();
          const playerScores = new Map<string, { name: string; score: number }>();
          let hasOtb = false;
          let hasLichess = false;

          games.forEach((g) => {
            modesSet.add(g.mode);
            if (g.white_player_id) playerIds.add(g.white_player_id);
            if (g.black_player_id) playerIds.add(g.black_player_id);

            if (g.source === 'OTB_MANUAL') hasOtb = true;
            else hasLichess = true;

            // Compute score leader
            if (g.white_player?.full_name) {
              const prev = playerScores.get(g.white_player_id) || { name: g.white_player.full_name, score: 0 };
              prev.score += g.result === 1.0 ? 1 : g.result === 0.5 ? 0.5 : 0;
              playerScores.set(g.white_player_id, prev);
            }
            if (g.black_player?.full_name) {
              const prev = playerScores.get(g.black_player_id) || { name: g.black_player.full_name, score: 0 };
              prev.score += g.result === 0.0 ? 1 : g.result === 0.5 ? 0.5 : 0;
              playerScores.set(g.black_player_id, prev);
            }
          });

          let topScorerName: string | undefined;
          let maxScore = -1;
          playerScores.forEach((val) => {
            if (val.score > maxScore) {
              maxScore = val.score;
              topScorerName = val.name;
            }
          });

          summaries.push({
            name,
            games,
            gameCount: games.length,
            uniquePlayerCount: playerIds.size,
            modes: Array.from(modesSet),
            latestDate: games[0]?.created_at || new Date().toISOString(),
            isChallenge: name.toLowerCase() === 'challenge',
            hasOtb,
            hasLichess,
            topScorerName,
          });
        });

        // Sort so "Challenge" or recent events come first
        summaries.sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());

        setTournaments(summaries);
      }
    } catch (err) {
      console.error('Failed to load past tournaments:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredTournaments = tournaments.filter((t) => {
    if (filter === 'CHALLENGE') return t.isChallenge;
    if (filter === 'OTB') return t.hasOtb && !t.isChallenge;
    if (filter === 'LICHESS') return t.hasLichess && !t.isChallenge;
    return true;
  });

  return (
    <div className="my-12 sm:my-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
            <Trophy className="w-3.5 h-3.5" />
            <span>FCA Event History</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Past Tournaments & Events
          </h2>
          <p className="text-text-muted text-xs sm:text-sm mt-1">
            Explore past campus OTB tournaments, online Lichess arenas, and approved 1-on-1 matches.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-[#161512] p-1 rounded-lg border border-chess-border self-start sm:self-auto overflow-x-auto max-w-full">
          {(['ALL', 'OTB', 'LICHESS', 'CHALLENGE'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                filter === f
                  ? 'bg-surface text-white shadow-sm border border-chess-border'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              {f === 'ALL' ? 'All Events' : f === 'OTB' ? 'Campus OTB' : f === 'LICHESS' ? 'Lichess Arenas' : '1-on-1 Challenges'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted text-sm bg-surface/50 border border-chess-border rounded-xl">
          Loading past tournaments...
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="py-12 text-center text-text-muted text-sm bg-surface/50 border border-chess-border rounded-xl">
          No events found for this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredTournaments.map((t) => (
            <div
              key={t.name}
              onClick={() => setSelectedTournament(t)}
              className="bg-surface hover:bg-[#2E2B27] border border-chess-border hover:border-primary/50 p-5 rounded-xl transition-all duration-150 cursor-pointer group flex flex-col justify-between shadow-card active:scale-[0.99]"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    t.isChallenge
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
                      : t.hasOtb
                      ? 'bg-amber-950/80 text-amber-300 border-amber-600/60'
                      : 'bg-sky-950/80 text-sky-300 border-sky-600/60'
                  }`}>
                    {t.isChallenge ? '⚔️ 1-on-1 Challenge' : t.hasOtb ? '🏆 Campus OTB' : '⚡ Lichess Arena'}
                  </span>

                  <span className="text-[10px] text-text-muted flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3" />
                    {new Date(t.latestDate).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors line-clamp-2">
                  {t.name}
                </h3>

                <div className="grid grid-cols-2 gap-2 my-4 p-3 rounded-lg bg-[#161512] border border-chess-border text-xs">
                  <div>
                    <span className="text-text-muted text-[10px] uppercase block">Matches</span>
                    <span className="font-extrabold text-white text-sm">{t.gameCount} Games</span>
                  </div>
                  <div>
                    <span className="text-text-muted text-[10px] uppercase block">Players</span>
                    <span className="font-extrabold text-white text-sm">{t.uniquePlayerCount} Players</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-chess-border/60 flex items-center justify-between text-xs">
                <span className="text-text-muted text-[11px] truncate max-w-[170px]">
                  {t.topScorerName ? `Top: ${t.topScorerName}` : 'FCA Rated Event'}
                </span>
                <span className="text-primary font-semibold flex items-center gap-1 group-hover:gap-1.5 transition-all">
                  Details <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TOURNAMENT DETAIL MODAL */}
      {selectedTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-chess-border rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-chess-border flex items-start justify-between gap-4 bg-[#161512]">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Official FCA Event Log</span>
                </div>
                <h2 className="text-xl font-bold text-white">{selectedTournament.name}</h2>
                <p className="text-text-muted text-xs mt-0.5">
                  {selectedTournament.gameCount} rated games played • {selectedTournament.uniquePlayerCount} participants
                </p>
              </div>
              <button
                onClick={() => setSelectedTournament(null)}
                className="p-1 rounded-lg bg-surface text-text-muted hover:text-white border border-chess-border cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content / Games list */}
            <div className="p-5 overflow-y-auto space-y-3 divide-y divide-chess-border/40">
              {selectedTournament.games.map((game) => {
                const gameId = extractLichessGameId(game);
                const lichessUrl = game.external_url || (gameId ? `https://lichess.org/${gameId}` : null);

                return (
                  <div key={game.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white">{game.white_player?.full_name || 'White'}</span>
                        <span className="text-text-muted">vs</span>
                        <span className="font-bold text-white">{game.black_player?.full_name || 'Black'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-text-muted">
                        <span className="uppercase font-semibold text-primary-light">{game.mode}</span>
                        <span>•</span>
                        <span>{new Date(game.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                        game.result === 1.0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-600' :
                        game.result === 0.0 ? 'bg-red-950 text-red-300 border border-red-700' :
                        'bg-yellow-950 text-yellow-300 border border-yellow-700'
                      }`}>
                        {game.result === 1.0 ? '1 - 0' : game.result === 0.0 ? '0 - 1' : '½ - ½'}
                      </span>

                      {lichessUrl && (
                        <a
                          href={lichessUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded bg-[#161512] border border-chess-border text-primary hover:text-white transition-colors"
                          title="View on Lichess"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

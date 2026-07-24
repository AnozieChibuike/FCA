import { useEffect, useState } from 'react';
import { Calendar, Search, MapPin, Globe, X, Loader2, Plus, Zap, Flame, Hourglass, Rocket, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Tournament, GameMode } from '../types';
import CreateTournamentModal from './CreateTournamentModal';

interface TournamentCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TournamentCalendarModal({ isOpen, onClose }: TournamentCalendarModalProps) {
  const { isAdmin, isArbiter } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UPCOMING' | 'PAST'>('ALL');
  const [modeFilter, setModeFilter] = useState<'ALL' | GameMode>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const authenticated = isAdmin || isArbiter;

  const [loggedEvents, setLoggedEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchTournaments();
    }
  }, [isOpen]);

  async function fetchTournaments() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('tournaments')
        .select('*');

      const { data: gamesData } = await supabase
        .from('games')
        .select('event_name');

      const loggedSet = new Set<string>();
      if (gamesData) {
        gamesData.forEach((g) => {
          if (g.event_name) {
            const clean = g.event_name.replace(/\s*\[[a-zA-Z0-9]{8,12}\]/, '').trim().toLowerCase();
            loggedSet.add(clean);
          }
        });
      }
      setLoggedEvents(loggedSet);

      if (data) {
        const list = data as Tournament[];
        const now = new Date().getTime();

        // Sort: Upcoming events closest to today first (ascending start_date), followed by past events (descending start_date)
        list.sort((a, b) => {
          const tA = new Date(a.start_date).getTime();
          const tB = new Date(b.start_date).getTime();
          const isAUpcoming = tA >= now && !loggedSet.has(a.title.trim().toLowerCase()) && a.status === 'SCHEDULED';
          const isBUpcoming = tB >= now && !loggedSet.has(b.title.trim().toLowerCase()) && b.status === 'SCHEDULED';

          if (isAUpcoming && isBUpcoming) return tA - tB; // nearest upcoming first
          if (!isAUpcoming && !isBUpcoming) return tB - tA; // most recent past first
          return isAUpcoming ? -1 : 1; // upcoming before past
        });

        setTournaments(list);
      }
    } catch (err) {
      console.error('Failed to load tournaments directory:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const filteredTournaments = tournaments.filter((t) => {
    const hasGames = loggedEvents.has(t.title.trim().toLowerCase());
    const isUpcoming = new Date(t.start_date) >= new Date() && !hasGames && t.status === 'SCHEDULED';
    if (statusFilter === 'UPCOMING' && !isUpcoming) return false;
    if (statusFilter === 'PAST' && isUpcoming) return false;

    if (modeFilter !== 'ALL' && t.mode !== modeFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchLocation = t.location.toLowerCase().includes(q);
      if (!matchTitle && !matchLocation) return false;
    }

    return true;
  });

  const MODE_CONFIG: Record<string, { label: string; icon: any; style: string }> = {
    BLITZ: { label: 'Blitz', icon: Zap, style: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50' },
    RAPID: { label: 'Rapid', icon: Flame, style: 'bg-amber-950/90 text-amber-300 border-amber-500/50' },
    CLASSICAL: { label: 'Classical', icon: Hourglass, style: 'bg-sky-950/90 text-sky-300 border-sky-500/50' },
    BULLET: { label: 'Bullet', icon: Rocket, style: 'bg-rose-950/90 text-rose-300 border-rose-500/50' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-chess-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-chess-border flex items-start justify-between gap-3 bg-[#161512]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 sm:p-2.5 rounded-xl bg-primary/20 border border-primary/30 text-primary shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-tight">
                Tournament Calendar Directory
              </h2>
              <p className="text-text-muted text-[11px] sm:text-xs mt-0.5">
                Full directory of campus rating events, online arenas, and time controls
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {authenticated && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Schedule Event</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-surface text-text-muted hover:text-white border border-chess-border cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="p-3 sm:p-4 bg-[#1A1917] border-b border-chess-border grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5 sm:top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title or location..."
              className="input-field text-xs pl-9 py-2"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="input-field text-xs cursor-pointer py-2"
          >
            <option value="ALL">All Statuses (Upcoming & Past)</option>
            <option value="UPCOMING">📅 Upcoming Scheduled Only</option>
            <option value="PAST">🏆 Past Events Only</option>
          </select>

          {/* Mode Filter */}
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as any)}
            className="input-field text-xs cursor-pointer py-2"
          >
            <option value="ALL">All Time Controls</option>
            <option value="BLITZ">⚡ Blitz</option>
            <option value="RAPID">🔥 Rapid</option>
            <option value="CLASSICAL">⏳ Classical</option>
            <option value="BULLET">🚀 Bullet</option>
          </select>
        </div>

        {/* Directory Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="py-12 text-center text-text-muted text-sm">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
              Loading tournament directory...
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-sm border border-dashed border-chess-border/80 rounded-xl">
              No tournaments match your search criteria.
            </div>
          ) : (
            filteredTournaments.map((t) => {
              const hasGames = loggedEvents.has(t.title.trim().toLowerCase());
              const isUpcoming = new Date(t.start_date) >= new Date() && !hasGames && t.status === 'SCHEDULED';
              const config = MODE_CONFIG[t.mode] || MODE_CONFIG.BLITZ;
              const ModeIcon = config.icon;
              const displayTc = t.time_control && t.time_control !== t.mode ? t.time_control : config.label;

              return (
                <div
                  key={t.id}
                  className="bg-[#161512] hover:bg-[#201D19] border border-chess-border/80 p-3.5 sm:p-4 rounded-xl transition-all space-y-2 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2.5 flex-wrap sm:flex-nowrap">
                    <div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                        isUpcoming
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                          : 'bg-surface text-text-muted border-chess-border'
                      }`}>
                        {isUpcoming ? (
                          <>
                            <Clock className="w-3 h-3 text-emerald-400" />
                            <span>Upcoming</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3 text-text-muted" />
                            <span>Completed</span>
                          </>
                        )}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-white mt-1 leading-snug">
                        {t.title}
                      </h3>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold border ${config.style} shrink-0`}>
                      <ModeIcon className="w-3 h-3" />
                      <span>{displayTc}</span>
                    </span>
                  </div>

                  <div className="font-mono text-[11px] sm:text-xs text-text-muted flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{new Date(t.start_date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                  </div>

                  <div className="text-xs text-text-muted flex items-center gap-1.5">
                    {t.is_online ? (
                      <>
                        <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>Lichess Online</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{t.location || 'Campus Arena'}</span>
                      </>
                    )}
                  </div>

                  {t.description && (
                    <p className="text-[11px] sm:text-xs text-text-muted/80 pt-1.5 border-t border-chess-border/40">
                      {t.description}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <CreateTournamentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchTournaments}
      />
    </div>
  );
}

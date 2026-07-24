import { useEffect, useState } from 'react';
import { Calendar, MapPin, Globe, ArrowRight, Zap, Flame, Hourglass, Rocket, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Tournament } from '../types';
import TournamentCalendarModal from './TournamentCalendarModal';

export default function UpcomingEvents() {
  const [events, setEvents] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  useEffect(() => {
    fetchUpcoming();
  }, []);

  async function fetchUpcoming() {
    try {
      const now = new Date().toISOString();
      // Fetch upcoming tournaments (start_date >= now) sorted ascending so nearest to today comes first!
      const { data: tournamentsData } = await supabase
        .from('tournaments')
        .select('*')
        .gte('start_date', now)
        .order('start_date', { ascending: true });

      // Fetch logged games to detect tournaments that have already started
      const { data: gamesData } = await supabase
        .from('games')
        .select('event_name');

      const loggedEventNames = new Set<string>();
      if (gamesData) {
        gamesData.forEach((g) => {
          if (g.event_name) {
            const clean = g.event_name.replace(/\s*\[[a-zA-Z0-9]{8,12}\]/, '').trim().toLowerCase();
            loggedEventNames.add(clean);
          }
        });
      }

      if (tournamentsData && tournamentsData.length > 0) {
        const upcomingFiltered = (tournamentsData as Tournament[]).filter((t) => {
          // Remove if status is explicitly COMPLETED or ONGOING
          if (t.status && t.status !== 'SCHEDULED') return false;

          // Remove if at least 1 game has been logged for this event (online or OTB)
          const cleanTitle = t.title.trim().toLowerCase();
          if (loggedEventNames.has(cleanTitle)) return false;

          return true;
        });

        setEvents(upcomingFiltered.slice(0, 3));
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error('Failed to fetch upcoming events:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatEventDate(dateString: string) {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;

    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    return `${weekday}, ${month} ${day}  •  ${time}`;
  }

  const MODE_CONFIG: Record<string, { label: string; icon: any; style: string }> = {
    BLITZ: { label: 'Blitz', icon: Zap, style: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50' },
    RAPID: { label: 'Rapid', icon: Flame, style: 'bg-amber-950/90 text-amber-300 border-amber-500/50' },
    CLASSICAL: { label: 'Classical', icon: Hourglass, style: 'bg-sky-950/90 text-sky-300 border-sky-500/50' },
    BULLET: { label: 'Bullet', icon: Rocket, style: 'bg-rose-950/90 text-rose-300 border-rose-500/50' },
  };

  return (
    <div className="bg-[#1A1917] border border-chess-border/80 rounded-2xl p-4 sm:p-6 shadow-xl mb-8 sm:mb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5 pb-3 sm:pb-4 border-b border-chess-border/60">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary sm:w-6 sm:h-6" />
          <h2 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight">
            Upcoming Events
          </h2>
        </div>
        <div className="p-1.5 sm:p-2 rounded-xl bg-[#26231E] border border-chess-border text-primary">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-text-muted text-xs">
          Loading upcoming tournaments...
        </div>
      ) : events.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-chess-border/80 rounded-xl p-4 my-2">
          <Calendar className="w-8 h-8 text-text-muted/50 mx-auto mb-2" />
          <p className="text-white text-xs sm:text-sm font-bold">No Upcoming Events Scheduled Yet</p>
          <p className="text-text-muted text-[11px] sm:text-xs mt-1">Official rating tournaments will appear here when scheduled by arbiters.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-4 sm:mb-5">
          {events.map((event) => {
            const config = MODE_CONFIG[event.mode] || MODE_CONFIG.BLITZ;
            const ModeIcon = config.icon;
            const displayTc = event.time_control && event.time_control !== event.mode ? event.time_control : config.label;

            return (
              <div
                key={event.id}
                className="bg-[#24211D] hover:bg-[#2A2723] border border-chess-border/70 p-3.5 sm:p-5 rounded-xl transition-all duration-150 group shadow-sm"
              >
                <div className="flex items-start justify-between gap-2.5 flex-wrap sm:flex-nowrap">
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-primary transition-colors leading-snug">
                    {event.title}
                  </h3>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] sm:text-xs font-semibold border ${config.style} shrink-0`}>
                    <ModeIcon className="w-3 h-3" />
                    <span>{displayTc}</span>
                  </span>
                </div>

                <div className="font-mono text-xs sm:text-sm text-text-muted mt-2 tracking-wide font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary/80 shrink-0" />
                  <span>{formatEventDate(event.start_date)}</span>
                </div>

                <div className="text-xs text-text-muted/90 mt-2 font-medium flex items-center gap-1.5">
                  {event.is_online ? (
                    <>
                      <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Lichess Online</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{event.location || 'FUTO Campus'}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Button */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => setIsCalendarModalOpen(true)}
          className="inline-flex items-center gap-2 text-primary hover:text-primary-light font-bold text-xs sm:text-base hover:underline transition-colors group cursor-pointer"
        >
          <span>View Full Calendar</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <TournamentCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
      />
    </div>
  );
}

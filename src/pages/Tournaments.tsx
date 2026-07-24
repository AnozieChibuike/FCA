import { useState } from 'react';
import { Trophy, Calendar, Plus } from 'lucide-react';
import { useAuth } from '../lib/auth';
import UpcomingEvents from '../components/UpcomingEvents';
import PastTournaments from '../components/PastTournaments';
import CreateTournamentModal from '../components/CreateTournamentModal';
import TournamentCalendarModal from '../components/TournamentCalendarModal';

export default function Tournaments() {
  const { isArbiter, isAdmin } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDirectoryModalOpen, setIsDirectoryModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const authenticated = isAdmin || isArbiter;

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-12 sm:pb-16 px-3.5 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Hero Header */}
        <div className="glass-card p-5 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2.5 sm:mb-3">
              <Trophy className="w-3.5 h-3.5" />
              <span>Official FUTO Chess Events</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Tournaments & Competition Calendar
            </h1>
            <p className="text-text-muted text-xs sm:text-base mt-2 max-w-2xl leading-relaxed">
              Explore upcoming campus rating events, past arena results, and official head-to-head challenges across FUTO.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setIsDirectoryModalOpen(true)}
              className="px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-[#161512] border border-primary/40 text-primary hover:border-primary text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-primary" />
              <span>Full Calendar Pop-Up</span>
            </button>

            {authenticated && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="btn-primary py-2.5 sm:py-3 px-4 sm:px-5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Tournament</span>
              </button>
            )}
          </div>
        </div>

        {/* Homepage Screenshot-Style Upcoming Events Section */}
        <UpcomingEvents key={`upcoming-${refreshKey}`} />

        {/* Detailed Past Events & Results */}
        <PastTournaments />
      </div>

      {/* Modals */}
      <CreateTournamentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      <TournamentCalendarModal
        isOpen={isDirectoryModalOpen}
        onClose={() => setIsDirectoryModalOpen(false)}
      />
    </div>
  );
}

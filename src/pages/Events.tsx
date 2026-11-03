import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, CalendarPlus, Plus, Trophy } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { fetchEvents } from '../lib/api';
import { downloadEventIcs } from '../lib/ics';
import { siteUrl } from '../lib/share';
import type { GameMode, TournamentSummary } from '../types';
import { MODES, MODE_LABELS } from '../types';
import { EventRow, NextEventCard, eventStatus } from '../components/events/EventBits';
import SeasonTable from '../components/events/SeasonTable';
import { Chip, EmptyState, Segmented, Skeleton } from '../components/ui/misc';

type Tab = 'upcoming' | 'past' | 'season';

function nextTuesday() {
  const d = new Date();
  d.setUTCHours(19, 30, 0, 0); // 8:30 PM WAT
  const add = (2 - d.getUTCDay() + 7) % 7 || (Date.now() > d.getTime() ? 7 : 0);
  d.setUTCDate(d.getUTCDate() + add);
  return d;
}

export default function Events() {
  const { isStaff } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'upcoming';
  const [events, setEvents] = useState<TournamentSummary[] | null>(null);
  const [mode, setMode] = useState<'ALL' | GameMode>('ALL');

  useEffect(() => { fetchEvents().then(setEvents).catch(() => setEvents([])); }, []);

  const { upcoming, past } = useMemo(() => {
    const list = events ?? [];
    const up = list.filter((e) => eventStatus(e) !== 'done').sort((a, b) => a.start_date.localeCompare(b.start_date));
    const done = list
      .filter((e) => eventStatus(e) === 'done' && (e.rated_games > 0 || e.participants > 0 || e.status === 'COMPLETED'))
      .filter((e) => mode === 'ALL' || e.mode === mode);
    return { upcoming: up, past: done };
  }, [events, mode]);

  return (
    <div className="page">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Events</h1>
          <p className="text-sm text-text-muted">Titled Tuesday every week, plus special arenas and over-the-board challenges.</p>
        </div>
        {isStaff && (
          <Link to="/admin/events" className="btn-secondary shrink-0"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Schedule</span></Link>
        )}
      </div>

      <Segmented
        className="mb-5"
        value={tab}
        onChange={(v) => setParams(v === 'upcoming' ? {} : { tab: v }, { replace: true })}
        options={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'past', label: 'Results' },
          { value: 'season', label: <><Trophy className="h-4 w-4" /> Season</> },
        ]}
      />

      {tab === 'upcoming' && (
        <div className="space-y-4">
          {!events ? <Skeleton className="h-48" /> : upcoming.length ? (
            <>
              <NextEventCard event={upcoming[0]} />
              {upcoming.slice(1).map((e) => <EventRow key={e.id} e={e} />)}
            </>
          ) : (
            <div className="rounded-2xl border border-chess-border bg-surface">
              <EmptyState
                icon={CalendarDays}
                title="Titled Tuesday is every week"
                text="The next arena shows up here automatically once it's created on Lichess. Add the weekly reminder to your phone calendar so you never miss it."
                action={(
                  <button
                    className="btn-primary"
                    onClick={() => downloadEventIcs({ id: 'titled-tuesday', title: 'FCA Titled Tuesday', start: nextTuesday().toISOString(), url: siteUrl('/events'), weekly: true })}
                  >
                    <CalendarPlus className="h-4 w-4" /> Remind me every Tuesday
                  </button>
                )}
              />
            </div>
          )}
        </div>
      )}

      {tab === 'past' && (
        <div>
          <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Chip active={mode === 'ALL'} onClick={() => setMode('ALL')}>All</Chip>
            {MODES.map((m) => <Chip key={m} active={mode === m} onClick={() => setMode(m)}>{MODE_LABELS[m]}</Chip>)}
          </div>
          <div className="space-y-2.5">
            {!events ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[74px]" />)
              : past.length ? past.map((e) => <EventRow key={e.id} e={e} />)
              : <div className="rounded-2xl border border-chess-border bg-surface"><EmptyState icon={Trophy} title="No results yet" /></div>}
          </div>
        </div>
      )}

      {tab === 'season' && <SeasonTable />}
    </div>
  );
}

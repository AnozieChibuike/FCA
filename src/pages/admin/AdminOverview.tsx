import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, Activity, Link2, Swords, Inbox, RefreshCw, Copy, ExternalLink, AlertTriangle, Calculator } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { errorMessage, invokeFca } from '../../lib/api';
import { copyText, siteUrl } from '../../lib/share';
import { formatDate, plural, shortEventName, timeAgo } from '../../lib/format';
import { lichessProfileUrl } from '../../lib/lichess';
import type { AdminStats } from '../../types';
import { CHART, ColumnChart, HBarChart } from '../../components/charts/charts';
import { Card, EmptyState, SectionHeader, Skeleton, Spinner, StatTile } from '../../components/ui/misc';
import { useToast } from '../../components/ui/Toast';

export default function AdminOverview() {
  const toast = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [recalcing, setRecalcing] = useState(false);

  async function load() {
    const { data, error: e } = await supabase.rpc('admin_stats');
    if (e) setError(e.message.includes('admin_stats') ? 'Run database migration 2 to enable console stats.' : e.message);
    else setStats(data as AdminStats);
  }
  useEffect(() => { load(); }, []);

  async function syncNow() {
    setSyncing(true);
    try {
      const r = await invokeFca<Record<string, unknown>>('tick');
      toast(r.skipped ? 'A sync just ran — try again in a minute' : 'Sync finished');
      load();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function recalc() {
    if (!confirm('Replay every rated game in order and rebuild all ratings? This is safe to run any time.')) return;
    setRecalcing(true);
    try {
      const r = await invokeFca<{ ratings: { games_rated: number; profiles_changed: number } }>('recalculate');
      toast(`Rebuilt ratings from ${r.ratings.games_rated} games · ${r.ratings.profiles_changed} players changed`);
      load();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setRecalcing(false);
    }
  }

  function inviteMessage(username: string, events: number) {
    return `Hi ${username}! You've played ${events} FCA arena${events === 1 ? '' : 's'} on Lichess. Join FCA Rated so your games count towards an official FCA rating, titles and badges: ${siteUrl('/join')}`;
  }

  if (error) return <Card><EmptyState icon={AlertTriangle} title="Stats unavailable" text={error} /></Card>;
  if (!stats) return <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  const m = stats.members;
  const linkedPct = m.total ? Math.round((m.lichess_linked / m.total) * 100) : 0;
  const events = stats.events.map((e) => ({
    label: formatDate(e.start_date, { day: 'numeric', month: 'short' }),
    title: shortEventName(e.title),
    values: [e.fca_players, e.guest_players],
  }));
  const weeks = stats.signups_by_week.map((w) => ({ label: formatDate(w.week, { day: 'numeric', month: 'short' }), title: `Week of ${formatDate(w.week)}`, values: [w.n] }));

  return (
    <div className="space-y-6">
      {(stats.pending_imports > 0 || m.pending > 0) && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {stats.pending_imports > 0 && (
            <Link to="/admin/imports" className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4">
              <Inbox className="h-5 w-5 text-primary" />
              <span className="flex-1 text-sm font-semibold text-white">{stats.pending_imports} import{stats.pending_imports === 1 ? '' : 's'} waiting for approval</span>
              <span className="text-xs font-bold text-primary">Review</span>
            </Link>
          )}
          {m.pending > 0 && (
            <Link to="/admin/members?status=PENDING" className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
              <UserCheck className="h-5 w-5 text-amber-400" />
              <span className="flex-1 text-sm font-semibold text-white">{m.pending} member{m.pending === 1 ? '' : 's'} awaiting approval</span>
              <span className="text-xs font-bold text-amber-300">Review</span>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile icon={Users} label="Approved members" value={m.approved} sub={`+${m.new_30d} in 30 days · +${m.new_7d} this week`} />
        <StatTile icon={Activity} label="Active in 30 days" value={stats.active_players_30d} sub={`${m.never_played} members never played`} />
        <StatTile icon={Link2} label="Lichess linked" value={`${linkedPct}%`} sub={`${m.lichess_linked} of ${m.total}`} />
        <StatTile icon={Swords} label="Rated games" value={stats.games.total.toLocaleString()} sub={`${stats.games.last_30d} in 30 days · ${stats.games.otb} OTB`} />
        <StatTile icon={UserCheck} label="Came via invite links" value={m.referred} sub={`${m.whatsapp} joined WhatsApp`} />
        <StatTile icon={Users} label="Female · Alumni" value={`${m.female} · ${m.alumni}`} sub={`${m.staff} staff`} />
      </div>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <div className="font-semibold text-white">Lichess sync</div>
          <div className="text-text-muted">
            {stats.last_sync ? `Last run ${timeAgo(stats.last_sync)}` : 'Not run yet'} · runs every 15 minutes, finds finished arenas and queues them for approval.
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={syncNow} disabled={syncing} className="btn-secondary">{syncing ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />} Sync now</button>
          <button onClick={recalc} disabled={recalcing} className="btn-secondary">{recalcing ? <Spinner className="h-4 w-4" /> : <Calculator className="h-4 w-4" />} Rebuild ratings</button>
        </div>
      </Card>

      <section>
        <SectionHeader title="Turnout per event" subtitle="FCA members vs players who aren't members yet" />
        <Card className="p-4">
          {events.length ? (
            <ColumnChart
              data={events}
              series={[{ name: 'FCA members', color: CHART.series1 }, { name: 'Not members yet', color: CHART.series2 }]}
              ariaLabel="Players per event, members and guests"
            />
          ) : <EmptyState title="No synced events yet" />}
        </Card>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <SectionHeader title="Sign-ups per week" subtitle="Last 16 weeks" />
          <Card className="p-4">
            {weeks.length ? <ColumnChart data={weeks} series={[{ name: 'Sign-ups', color: CHART.series1 }]} height={170} ariaLabel="New members per week" /> : <EmptyState title="No sign-ups in this period" />}
          </Card>
        </section>
        <section>
          <SectionHeader title="Members by department" />
          <Card className="p-4">
            <HBarChart data={stats.departments.map((d) => ({ label: d.department, value: d.n }))} />
          </Card>
        </section>
      </div>

      <section>
        <SectionHeader title="Recruit these players" subtitle="They keep playing FCA arenas but haven't joined FCA Rated" />
        <Card className="divide-y divide-chess-border overflow-hidden">
          {stats.unlinked_regulars.length === 0 ? <EmptyState title="Everyone who plays is a member" /> : stats.unlinked_regulars.map((u) => (
            <div key={u.lichess_username} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-white">{u.lichess_username}</div>
                <div className="text-xs text-text-muted">{plural(u.events, 'event')} · {plural(u.games, 'game')} · best #{u.best_rank} · last {timeAgo(u.last_seen)}</div>
              </div>
              <button
                onClick={() => copyText(inviteMessage(u.lichess_username, u.events)).then(() => toast('Invite message copied'))}
                className="btn-ghost !px-2.5"
                aria-label={`Copy invite message for ${u.lichess_username}`}
              >
                <Copy className="h-4 w-4" />
              </button>
              <a href={`https://lichess.org/inbox/${encodeURIComponent(u.lichess_username)}`} target="_blank" rel="noreferrer" className="btn-ghost !px-2.5" aria-label="Message on Lichess">
                <ExternalLink className="h-4 w-4" />
              </a>
              <a href={lichessProfileUrl(u.lichess_username)} target="_blank" rel="noreferrer" className="hidden text-xs font-semibold text-primary sm:block">Profile</a>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}

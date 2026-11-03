import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Swords, CalendarDays, Activity, Crown, GraduationCap, Sparkles, Trophy, Share2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import {
  PROFILE_COLUMNS, fetchLatestCompletedEvent, fetchNextEvent, fetchRecentBadges, fetchSeasonStandings, fetchStandings,
  type EarnedBadge,
} from '../lib/api';
import { inviteUrl, shareLink } from '../lib/share';
import { timeAgo } from '../lib/format';
import type { Profile, SeasonStanding, Standing, TournamentSummary } from '../types';
import { NextEventCard, ResultsCard } from '../components/events/EventBits';
import { ACHIEVEMENT_MAP, BadgeMedal } from '../components/achievements/Badges';
import { Avatar, TitleBadge } from '../components/ui/Avatar';
import { Card, SectionHeader, Skeleton, StatTile } from '../components/ui/misc';
import { useToast } from '../components/ui/Toast';
import OnboardingChecklist from '../components/profile/OnboardingChecklist';
import MemorialBanner from '../components/MemorialBanner';
import fcaLogo from '../assets/logo-128.png';

interface HomeData {
  next: TournamentSummary | null;
  latest: TournamentSummary | null;
  latestStandings: Standing[];
  top: Profile[];
  leaders: Array<{ label: string; icon: typeof Crown; player: Profile | null }>;
  badges: EarnedBadge[];
  season: SeasonStanding[];
  counts: { members: number; games: number; events: number; active: number };
}

async function loadHome(): Promise<HomeData> {
  const approved = () => supabase.from('profiles').select(PROFILE_COLUMNS).eq('status', 'APPROVED').eq('is_immortal', false).gt('blitz_games', 0).order('blitz_elo', { ascending: false });
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [next, latest, top, student, female, alumni, badges, season, members, games, events, recent] = await Promise.all([
    fetchNextEvent(),
    fetchLatestCompletedEvent(),
    approved().limit(5),
    approved().eq('is_alumni', false).limit(1),
    approved().eq('gender', 'FEMALE').limit(1),
    approved().eq('is_alumni', true).limit(1),
    fetchRecentBadges(8),
    fetchSeasonStandings().catch(() => [] as SeasonStanding[]),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'APPROVED').eq('is_immortal', false),
    supabase.from('games').select('id', { count: 'exact', head: true }),
    supabase.from('tournaments').select('id', { count: 'exact', head: true }).eq('status', 'COMPLETED'),
    supabase.from('games').select('white_player_id, black_player_id').gte('played_at', monthAgo).limit(1000),
  ]);

  const active = new Set<string>();
  for (const g of (recent.data ?? []) as Array<{ white_player_id: string; black_player_id: string }>) {
    active.add(g.white_player_id);
    active.add(g.black_player_id);
  }
  const latestStandings = latest ? await fetchStandings(latest.id).catch(() => []) : [];
  const topList = (top.data ?? []) as unknown as Profile[];

  return {
    next,
    latest,
    latestStandings,
    top: topList,
    leaders: [
      { label: 'Top student', icon: GraduationCap, player: ((student.data ?? [])[0] as unknown as Profile) ?? null },
      { label: 'Top female', icon: Crown, player: ((female.data ?? [])[0] as unknown as Profile) ?? null },
      { label: 'Top alumni', icon: GraduationCap, player: ((alumni.data ?? [])[0] as unknown as Profile) ?? null },
    ],
    badges,
    season: season.slice(0, 5),
    counts: { members: members.count ?? 0, games: games.count ?? 0, events: events.count ?? 0, active: active.size },
  };
}

export default function Home() {
  const { profile } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    loadHome().then(setData).catch(() => setData(null));
  }, []);

  async function invite() {
    if (!profile) return;
    const outcome = await shareLink({
      title: 'Join FCA Rated',
      text: 'Play rated chess with the FUTO Chess Association. Join with my link:',
      url: inviteUrl(profile.fca_id),
    });
    if (outcome === 'copied') toast('Invite link copied');
  }

  return (
    <div className="page space-y-6 sm:space-y-8">
      {/* Hero */}
      {profile ? (
        <section className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-text-muted">Welcome back,</p>
            <h1 className="truncate text-2xl font-extrabold text-white sm:text-3xl">{profile.full_name.split(' ')[0]} 👋</h1>
          </div>
          <Link to={`/profile/${profile.id}`} className="flex shrink-0 items-center gap-3 rounded-2xl border border-chess-border bg-surface px-3 py-2">
            <div className="text-right">
              <div className="text-[11px] text-text-muted">Blitz</div>
              <div className="text-xl font-extrabold leading-none text-white tabular-nums">{profile.blitz_elo}</div>
            </div>
            <Avatar src={profile.avatar_url} name={profile.full_name} size="md" />
          </Link>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-3xl border border-chess-border bg-surface px-5 py-8 text-center sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(129,182,76,0.18),transparent_60%)]" />
          <div className="relative">
            <img src={fcaLogo} alt="" className="mx-auto mb-4 h-14 w-14 object-contain" />
            <h1 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-5xl">FUTO's home for rated chess</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-text-muted sm:text-base">
              Play the Titled Tuesday arena every week, earn an official FCA rating and titles, collect badges and climb the campus rankings.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <Link to="/join" className="btn-primary !px-6">Join FCA — it's free <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/leaderboards" className="btn-secondary !px-6">See the rankings</Link>
            </div>
          </div>
        </section>
      )}

      {profile && <OnboardingChecklist profile={profile} />}

      {/* Next event + latest results */}
      <div className="grid gap-4 lg:grid-cols-2">
        {data ? (
          data.next ? <NextEventCard event={data.next} /> : (
            <Card className="flex flex-col justify-center p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-primary">Titled Tuesday</div>
              <p className="mt-1 text-lg font-bold text-white">Every Tuesday · 8:30 PM</p>
              <p className="mt-1 text-sm text-text-muted">The arena link appears here as soon as it's created on Lichess.</p>
              <Link to="/events" className="btn-secondary mt-4 self-start"><CalendarDays className="h-4 w-4" /> All events</Link>
            </Card>
          )
        ) : <Skeleton className="h-52" />}
        {data ? (data.latest && <ResultsCard event={data.latest} standings={data.latestStandings} />) : <Skeleton className="h-52" />}
      </div>

      {/* Club in numbers */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Users} label="Members" value={data ? data.counts.members : '—'} />
        <StatTile icon={Swords} label="Rated games" value={data ? data.counts.games.toLocaleString() : '—'} />
        <StatTile icon={CalendarDays} label="Events played" value={data ? data.counts.events : '—'} />
        <StatTile icon={Activity} label="Active this month" value={data ? data.counts.active : '—'} />
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Top players */}
        <section className="lg:col-span-3">
          <SectionHeader title="Top players" subtitle="Blitz rating · active members" to="/leaderboards" />
          <Card className="divide-y divide-chess-border">
            {data ? data.top.map((p, i) => (
              <Link key={p.id} to={`/profile/${p.id}`} className="flex items-center gap-3 px-3 py-3 hover:bg-white/[0.02] sm:px-4">
                <span className={`w-6 text-center text-sm font-extrabold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-text-muted'}`}>{i + 1}</span>
                <Avatar src={p.avatar_url} name={p.full_name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-semibold text-white">{p.full_name}</span>
                    <TitleBadge title={p.earned_title} />
                  </div>
                  <div className="truncate text-xs text-text-muted">{p.department}</div>
                </div>
                <span className="text-base font-extrabold tabular-nums text-white">{p.blitz_elo}</span>
              </Link>
            )) : Array.from({ length: 5 }).map((_, i) => <div key={i} className="p-3"><Skeleton className="h-9" /></div>)}
          </Card>
          {data && (
            <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
              {data.leaders.map(({ label, icon: Icon, player }) => player && (
                <Link key={label} to={`/profile/${player.id}`} className="flex min-w-[220px] items-center gap-3 rounded-2xl border border-chess-border bg-surface p-3 hover:border-primary/40 sm:min-w-0">
                  <Avatar src={player.avatar_url} name={player.full_name} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-text-muted"><Icon className="h-3.5 w-3.5" /> {label}</div>
                    <div className="truncate text-sm font-bold text-white">{player.full_name}</div>
                    <div className="text-xs text-text-muted tabular-nums">{player.blitz_elo} blitz</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Season race */}
        <section className="lg:col-span-2">
          <SectionHeader title="Season race" subtitle="Points from every arena finish" to="/leaderboards?tab=season" />
          <Card className="divide-y divide-chess-border">
            {data ? (data.season.length ? data.season.map((s, i) => (
              <Link key={s.player_id} to={`/profile/${s.player_id}`} className="flex items-center gap-3 px-3 py-3 hover:bg-white/[0.02] sm:px-4">
                <span className="w-5 text-center text-sm font-bold text-text-muted">{i + 1}</span>
                <Avatar src={s.avatar_url} name={s.full_name} size="sm" />
                <span className="min-w-0 flex-1 truncate font-semibold text-white">{s.full_name}</span>
                <span className="text-xs text-text-muted">{s.wins > 0 && <Trophy className="mr-1 inline h-3.5 w-3.5 text-yellow-400" />}{s.events} ev</span>
                <span className="w-12 text-right font-extrabold tabular-nums text-white">{s.points}</span>
              </Link>
            )) : <p className="p-5 text-sm text-text-muted">Season standings appear after the next sync.</p>)
              : Array.from({ length: 5 }).map((_, i) => <div key={i} className="p-3"><Skeleton className="h-9" /></div>)}
          </Card>
        </section>
      </div>

      {/* Recent badges */}
      {data && data.badges.length > 0 && (
        <section>
          <SectionHeader title={<span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400" /> Fresh badges</span>} subtitle="Achievements members just unlocked" to="/achievements" />
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0">
            {data.badges.map((b) => {
              const def = ACHIEVEMENT_MAP[b.achievement_key];
              if (!def || !b.player) return null;
              return (
                <Link key={`${b.player_id}-${b.achievement_key}`} to={`/profile/${b.player_id}`} className="flex min-w-[240px] items-center gap-3 rounded-2xl border border-chess-border bg-surface p-3 hover:border-primary/40 sm:min-w-0">
                  <BadgeMedal def={def} earned size="sm" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-white">{def.name}</div>
                    <div className="truncate text-xs text-text-muted">{b.player.full_name} · {timeAgo(b.earned_at)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Grow the club */}
      <section className="overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 to-transparent p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-white">Bring your chess friends</h2>
            <ul className="mt-2 space-y-1 text-sm text-text-muted">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Free official FCA rating and titles</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> A rated arena with the club every Tuesday</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Recruit 5 friends to unlock the Ambassador badge</li>
            </ul>
          </div>
          {profile ? (
            <button onClick={invite} className="btn-primary shrink-0"><Share2 className="h-4 w-4" /> Share my invite link</button>
          ) : (
            <Link to="/join" className="btn-primary shrink-0">Create your account <ArrowRight className="h-4 w-4" /></Link>
          )}
        </div>
      </section>

      <MemorialBanner />
    </div>
  );
}

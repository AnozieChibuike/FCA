import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Target, SlidersHorizontal, Star, Share2, Building2, Megaphone, Trophy, Users } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { fetchProfiles, fetchRecruiters } from '../lib/api';
import { inviteUrl, shareLink } from '../lib/share';
import type { GameMode, Profile, Recruiter } from '../types';
import { MODES, MODE_LABELS, modeRating } from '../types';
import SeasonTable from '../components/events/SeasonTable';
import { Avatar, TitleBadge } from '../components/ui/Avatar';
import { Card, Chip, EmptyState, ModeIcon, Segmented, Skeleton } from '../components/ui/misc';
import Sheet from '../components/ui/Sheet';
import { useToast } from '../components/ui/Toast';

type Tab = 'players' | 'season' | 'departments' | 'recruiters';
type Category = 'ALL' | 'FEMALE' | 'MALE' | 'STUDENT' | 'ALUMNI';

const CATEGORIES: Array<{ value: Category; label: string }> = [
  { value: 'ALL', label: 'Everyone' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
  { value: 'STUDENT', label: 'Students' },
  { value: 'ALUMNI', label: 'Alumni' },
];

export default function Leaderboards() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'players';
  const [profiles, setProfiles] = useState<Profile[] | null>(null);

  useEffect(() => { fetchProfiles().then(setProfiles).catch(() => setProfiles([])); }, []);

  return (
    <div className="page">
      <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Rankings</h1>
      <p className="mb-5 text-sm text-text-muted">Official FCA Elo from rated arena and over-the-board games.</p>
      <Segmented
        className="mb-5"
        value={tab}
        onChange={(v) => setParams(v === 'players' ? {} : { tab: v }, { replace: true })}
        options={[
          { value: 'players', label: 'Players' },
          { value: 'season', label: 'Season' },
          { value: 'departments', label: 'Departments' },
          { value: 'recruiters', label: 'Recruiters' },
        ]}
      />
      {tab === 'players' && <PlayersTab profiles={profiles} />}
      {tab === 'season' && <SeasonTable />}
      {tab === 'departments' && <DepartmentsTab profiles={profiles} />}
      {tab === 'recruiters' && <RecruitersTab />}
    </div>
  );
}

function PlayersTab({ profiles }: { profiles: Profile[] | null }) {
  const { profile: me } = useAuth();
  const [mode, setMode] = useState<GameMode>('BLITZ');
  const [category, setCategory] = useState<Category>('ALL');
  const [query, setQuery] = useState('');
  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLElement>());

  const approved = useMemo(() => (profiles ?? []).filter((p) => p.status === 'APPROVED'), [profiles]);
  const immortals = approved.filter((p) => p.is_immortal);
  const faculties = useMemo(() => [...new Set(approved.map((p) => p.faculty).filter((f) => f && f !== 'N/A'))].sort(), [approved]);
  const departments = useMemo(() => [...new Set(approved.filter((p) => !faculty || p.faculty === faculty).map((p) => p.department).filter((d) => d && d !== 'N/A'))].sort(), [approved, faculty]);

  const ranked = useMemo(() => {
    const q = query.trim().toLowerCase();
    return approved
      .filter((p) => !p.is_immortal)
      .filter((p) => !activeOnly || modeRating(p, mode).games > 0)
      .filter((p) => category === 'ALL'
        || (category === 'FEMALE' && p.gender === 'FEMALE')
        || (category === 'MALE' && p.gender === 'MALE')
        || (category === 'STUDENT' && !p.is_alumni)
        || (category === 'ALUMNI' && p.is_alumni))
      .filter((p) => !faculty || p.faculty === faculty)
      .filter((p) => !department || p.department === department)
      .sort((a, b) => modeRating(b, mode).elo - modeRating(a, mode).elo || modeRating(b, mode).games - modeRating(a, mode).games)
      .map((p, i) => ({ p, rank: i + 1 }))
      .filter(({ p }) => !q || p.full_name.toLowerCase().includes(q) || (p.lichess_username ?? '').toLowerCase().includes(q));
  }, [approved, mode, category, query, faculty, department, activeOnly]);

  const myRow = me ? ranked.find((r) => r.p.id === me.id) : undefined;
  const filterCount = (faculty ? 1 : 0) + (department ? 1 : 0) + (activeOnly ? 0 : 1);

  function jumpToMe() {
    if (!me) return;
    const visible = ranked.some((r) => r.p.id === me.id);
    if (!visible) {
      setQuery('');
      setCategory('ALL');
      setFaculty('');
      setDepartment('');
      if (modeRating(me, mode).games === 0) setActiveOnly(false);
    }
    setTimeout(() => {
      const el = rowRefs.current.get(me.id);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFlash(me.id);
      setTimeout(() => setFlash(null), 1800);
    }, visible ? 0 : 150);
  }

  return (
    <div>
      <div className="mb-3 grid grid-cols-4 gap-1 rounded-xl border border-chess-border bg-[#1E1C18] p-1">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg text-xs font-semibold sm:text-sm ${mode === m ? 'bg-surface-hover text-white' : 'text-text-muted hover:text-white'}`}
          >
            <ModeIcon mode={m} /> {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {CATEGORIES.map((c) => <Chip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)}>{c.label}</Chip>)}
      </div>

      <div className="mb-4 flex gap-2">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search players" className="input-field !pl-10" aria-label="Search players" />
        </label>
        <button onClick={() => setFiltersOpen(true)} className="btn-secondary relative !px-3" aria-label="Filters">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {filterCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-black">{filterCount}</span>}
        </button>
        {me && (
          <button onClick={jumpToMe} className="btn-secondary !px-3" aria-label="Jump to my rank">
            <Target className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">{myRow ? `#${myRow.rank}` : 'Me'}</span>
          </button>
        )}
      </div>

      {immortals.map((p) => (
        <Link key={p.id} to={`/profile/${p.id}`} className="mb-3 flex items-center gap-3 rounded-2xl border border-purple-500/30 bg-purple-500/[0.07] px-3 py-3 sm:px-4">
          <Star className="h-5 w-5 shrink-0 fill-purple-400 text-purple-400" />
          <Avatar src={p.avatar_url || '/chisom-howell.jpeg'} name={p.full_name} size="sm" ring="border-purple-400/60" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5"><span className="truncate font-semibold text-white">{p.full_name}</span><TitleBadge title="FET" /></div>
            <div className="text-xs text-purple-200/70">Forever in our hearts</div>
          </div>
          <span className="font-extrabold text-purple-300">∞</span>
        </Link>
      ))}

      {!profiles ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : ranked.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No players match"
            text={activeOnly ? 'Only players with games in this time control are shown.' : undefined}
            action={activeOnly ? <button onClick={() => setActiveOnly(false)} className="btn-secondary">Include players with 0 games</button> : undefined}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[3rem_1fr_10rem_5rem_5rem] gap-3 border-b border-chess-border px-4 py-2.5 text-xs font-semibold text-text-muted md:grid">
            <span className="text-center">#</span><span>Player</span><span>Department</span><span className="text-right">Games</span><span className="text-right">Rating</span>
          </div>
          <ol className="divide-y divide-chess-border">
            {ranked.map(({ p, rank }) => {
              const r = modeRating(p, mode);
              const isMe = me?.id === p.id;
              return (
                <li key={p.id} ref={(el) => { if (el) rowRefs.current.set(p.id, el); }}>
                  <Link
                    to={`/profile/${p.id}`}
                    className={`grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 px-3 py-2.5 transition-colors md:grid-cols-[3rem_1fr_10rem_5rem_5rem] md:px-4 ${
                      isMe ? 'bg-primary/10' : 'hover:bg-white/[0.02]'
                    } ${flash === p.id ? 'ring-2 ring-inset ring-primary' : ''}`}
                  >
                    <span className={`text-center text-sm font-extrabold ${rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-amber-600' : 'text-text-muted'}`}>{rank}</span>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Avatar src={p.avatar_url} name={p.full_name} size="sm" />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate font-semibold text-white">{p.full_name}</span>
                          <TitleBadge title={p.earned_title} />
                          {isMe && <span className="rounded bg-primary px-1.5 text-[10px] font-bold text-black">YOU</span>}
                        </span>
                        <span className="block truncate text-xs text-text-muted md:hidden">
                          {p.department}{p.is_alumni ? ' · Alumni' : ''} · {r.games} games
                        </span>
                        {p.is_alumni && <span className="hidden text-xs text-emerald-300/80 md:block">Alumni</span>}
                      </span>
                    </span>
                    <span className="hidden truncate text-xs text-text-muted md:block">{p.department}</span>
                    <span className="hidden text-right text-sm text-text-muted tabular-nums md:block">{r.games}</span>
                    <span className="text-right">
                      <span className="text-base font-extrabold tabular-nums text-white">{r.elo}</span>
                      {r.games > 0 && r.games < 15 && <span className="block text-[10px] text-text-muted">provisional</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </Card>
      )}
      <p className="mt-3 text-center text-xs text-text-muted">{ranked.length} players · ratings under 15 games are provisional</p>

      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        footer={(
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => { setFaculty(''); setDepartment(''); setActiveOnly(true); }}>Reset</button>
            <button className="btn-primary flex-1" onClick={() => setFiltersOpen(false)}>Show {ranked.length} players</button>
          </div>
        )}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="field-label">Faculty / school</span>
            <select className="input-field" value={faculty} onChange={(e) => { setFaculty(e.target.value); setDepartment(''); }}>
              <option value="">All faculties</option>
              {faculties.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Department</span>
            <select className="input-field" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">All departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-chess-border bg-[#1E1C18] px-3.5">
            <span className="text-sm font-semibold text-white">Only players with games</span>
            <input type="checkbox" className="h-5 w-5 accent-[#81B64C]" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
          </label>
        </div>
      </Sheet>
    </div>
  );
}

function DepartmentsTab({ profiles }: { profiles: Profile[] | null }) {
  const [by, setBy] = useState<'department' | 'faculty'>('department');
  const rows = useMemo(() => {
    const groups = new Map<string, Profile[]>();
    for (const p of profiles ?? []) {
      if (p.is_immortal || p.status !== 'APPROVED') continue;
      const key = (by === 'department' ? p.department : p.faculty) || 'Unknown';
      if (key === 'N/A') continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    return [...groups.entries()].map(([name, members]) => {
      const active = members.filter((m) => m.blitz_games > 0).sort((a, b) => b.blitz_elo - a.blitz_elo);
      const top3 = active.slice(0, 3);
      const strength = top3.length ? Math.round(top3.reduce((s, m) => s + m.blitz_elo, 0) / top3.length) : 0;
      const games = members.reduce((s, m) => s + m.blitz_games + m.rapid_games + m.bullet_games + m.classical_games, 0);
      return { name, members: members.length, active: active.length, strength, games, best: active[0] };
    }).sort((a, b) => b.strength - a.strength || b.members - a.members);
  }, [profiles, by]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-text-muted">Strength = average blitz rating of the top 3 active players.</p>
        <Segmented size="sm" value={by} onChange={setBy} options={[{ value: 'department', label: 'Dept' }, { value: 'faculty', label: 'Faculty' }]} />
      </div>
      {!profiles ? <Skeleton className="h-64" /> : (
        <Card className="divide-y divide-chess-border overflow-hidden">
          {rows.map((r, i) => (
            <div key={r.name} className="flex items-center gap-3 px-3 py-3 sm:px-4">
              <span className={`w-7 text-center text-sm font-extrabold ${i < 3 ? 'text-yellow-400' : 'text-text-muted'}`}>{i + 1}</span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05]"><Building2 className="h-4 w-4 text-text-muted" /></span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-white">{r.name}</div>
                <div className="truncate text-xs text-text-muted">
                  {r.members} members · {r.active} active · {r.games} games
                  {r.best ? <> · best <Link to={`/profile/${r.best.id}`} className="text-white hover:text-primary-light">{r.best.full_name.split(' ')[0]}</Link></> : null}
                </div>
              </div>
              <span className="text-base font-extrabold tabular-nums text-white">{r.strength || '—'}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function RecruitersTab() {
  const { profile } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState<Recruiter[] | null>(null);
  useEffect(() => { fetchRecruiters(30).then(setRows).catch(() => setRows([])); }, []);

  async function share() {
    if (!profile) return;
    const outcome = await shareLink({ title: 'Join FCA Rated', text: 'Play rated chess with the FUTO Chess Association. Join with my link:', url: inviteUrl(profile.fca_id) });
    if (outcome === 'copied') toast('Invite link copied');
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold text-white">Grow the club</p>
            <p className="text-sm text-text-muted">Members who join with your link count here. 1, 5 and 10 recruits unlock the Recruiter, Ambassador and Club Builder badges.</p>
          </div>
        </div>
        {profile ? <button onClick={share} className="btn-primary shrink-0"><Share2 className="h-4 w-4" /> My invite link</button>
          : <Link to="/join" className="btn-primary shrink-0">Join FCA</Link>}
      </Card>
      {!rows ? <Skeleton className="h-40" /> : rows.length === 0 ? (
        <Card><EmptyState icon={Trophy} title="No recruiters yet" text="Be the first: share your invite link in your department group." /></Card>
      ) : (
        <Card className="divide-y divide-chess-border overflow-hidden">
          {rows.map((r, i) => (
            <Link key={r.player_id} to={`/profile/${r.player_id}`} className="flex items-center gap-3 px-3 py-3 hover:bg-white/[0.02] sm:px-4">
              <span className="w-7 text-center text-sm font-extrabold text-text-muted">{i + 1}</span>
              <Avatar src={r.avatar_url} name={r.full_name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5"><span className="truncate font-semibold text-white">{r.full_name}</span><TitleBadge title={r.earned_title} /></div>
                <div className="text-xs text-text-muted">{r.active_recruits} of them already playing</div>
              </div>
              <span className="text-right">
                <span className="block text-base font-extrabold tabular-nums text-white">{r.recruits}</span>
                <span className="text-[10px] text-text-muted">recruits</span>
              </span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}

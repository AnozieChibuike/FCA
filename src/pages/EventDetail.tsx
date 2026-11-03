import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Share2, TrendingUp, Zap, Swords, Flame, UserPlus, CalendarDays } from 'lucide-react';
import { fetchEvent, fetchEventGames, fetchStandings } from '../lib/api';
import { arenaUrl } from '../lib/lichess';
import { shareLink, siteUrl } from '../lib/share';
import { formatDateTime, signed } from '../lib/format';
import { useAuth } from '../lib/auth';
import type { Game, Standing, TournamentSummary } from '../types';
import { MODE_LABELS } from '../types';
import { LiveArena, ResultsCard, eventStatus } from '../components/events/EventBits';
import { Avatar, TitleBadge } from '../components/ui/Avatar';
import { Card, Diff, EmptyState, ModeIcon, PageLoader, Segmented } from '../components/ui/misc';
import { useToast } from '../components/ui/Toast';

interface Highlight { icon: typeof Zap; label: string; name: string; id?: string | null; value: string }

function computeHighlights(games: Game[]): Highlight[] {
  const net = new Map<string, { name: string; first: number; last: number }>();
  const count = new Map<string, { name: string; n: number }>();
  const streak = new Map<string, { name: string; cur: number; best: number }>();
  let upset: { name: string; id: string; gap: number; opp: string } | null = null;

  for (const g of games) {
    const sides = [
      { id: g.white_player_id, name: g.white_player?.full_name ?? '?', before: g.white_elo_before, after: g.white_elo_after, score: Number(g.result), oppBefore: g.black_elo_before, opp: g.black_player?.full_name ?? '?' },
      { id: g.black_player_id, name: g.black_player?.full_name ?? '?', before: g.black_elo_before, after: g.black_elo_after, score: 1 - Number(g.result), oppBefore: g.white_elo_before, opp: g.white_player?.full_name ?? '?' },
    ];
    for (const s of sides) {
      if (s.before != null && s.after != null) {
        const n = net.get(s.id);
        net.set(s.id, { name: s.name, first: n ? n.first : s.before, last: s.after });
      }
      const c = count.get(s.id) ?? { name: s.name, n: 0 };
      c.n++;
      count.set(s.id, c);
      const st = streak.get(s.id) ?? { name: s.name, cur: 0, best: 0 };
      st.cur = s.score === 1 ? st.cur + 1 : 0;
      st.best = Math.max(st.best, st.cur);
      streak.set(s.id, st);
      if (s.score === 1 && s.before != null && s.oppBefore != null) {
        const gap = s.oppBefore - s.before;
        if (gap > 0 && (!upset || gap > upset.gap)) upset = { name: s.name, id: s.id, gap, opp: s.opp };
      }
    }
  }

  const out: Highlight[] = [];
  const climber = [...net.entries()].map(([id, v]) => ({ id, name: v.name, gain: v.last - v.first })).sort((a, b) => b.gain - a.gain)[0];
  if (climber && climber.gain > 0) out.push({ icon: TrendingUp, label: 'Biggest climber', name: climber.name, id: climber.id, value: `${signed(climber.gain)} rating` });
  const u = upset as { name: string; id: string; gap: number; opp: string } | null;
  if (u) out.push({ icon: Zap, label: 'Biggest upset', name: u.name, id: u.id, value: `beat ${u.opp} (+${u.gap} higher)` });
  const busiest = [...count.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.n - a.n)[0];
  if (busiest) out.push({ icon: Swords, label: 'Most rated games', name: busiest.name, id: busiest.id, value: `${busiest.n} games` });
  const hot = [...streak.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.best - a.best)[0];
  if (hot && hot.best >= 3) out.push({ icon: Flame, label: 'Longest win streak', name: hot.name, id: hot.id, value: `${hot.best} in a row` });
  return out;
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const toast = useToast();
  const [event, setEvent] = useState<TournamentSummary | null | undefined>(undefined);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [tab, setTab] = useState<'standings' | 'games'>('standings');

  useEffect(() => {
    if (!id) return;
    setEvent(undefined);
    Promise.all([fetchEvent(id), fetchStandings(id).catch(() => []), fetchEventGames(id).catch(() => [])]).then(([e, s, g]) => {
      setEvent(e);
      setStandings(s);
      setGames(g);
    });
  }, [id]);

  const highlights = useMemo(() => computeHighlights(games), [games]);

  if (event === undefined) return <PageLoader />;
  if (!event) {
    return (
      <div className="page">
        <EmptyState icon={CalendarDays} title="Event not found" action={<Link to="/events" className="btn-secondary">All events</Link>} />
      </div>
    );
  }

  const status = eventStatus(event);
  const guests = standings.filter((s) => !s.player_id && s.games > 0).length;

  async function share() {
    const outcome = await shareLink({ title: event!.title, text: `${event!.title} on FCA Rated`, url: siteUrl(`/events/${event!.id}`) });
    if (outcome === 'copied') toast('Link copied');
  }

  return (
    <div className="page space-y-5">
      <Link to="/events" className="inline-flex items-center gap-1 text-sm font-semibold text-text-muted hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Events
      </Link>

      <header>
        <h1 className="text-balance text-2xl font-extrabold text-white sm:text-3xl">{event.title}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
          <span>{formatDateTime(event.start_date)}</span>
          <span className="flex items-center gap-1"><ModeIcon mode={event.mode} /> {MODE_LABELS[event.mode]}{event.time_control ? ` ${event.time_control}` : ''}</span>
          {(event.participants || event.nb_players) ? <span>{event.participants || event.nb_players} players</span> : null}
          {event.rated_games > 0 && <span>{event.rated_games} rated games</span>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {event.lichess_arena_id && (
            <a href={arenaUrl(event.lichess_arena_id)} target="_blank" rel="noreferrer" className={status === 'done' ? 'btn-secondary' : 'btn-primary'}>
              <ExternalLink className="h-4 w-4" /> {status === 'done' ? 'View on Lichess' : 'Join on Lichess'}
            </a>
          )}
          <button onClick={share} className="btn-secondary"><Share2 className="h-4 w-4" /> Share</button>
        </div>
        {event.description && <p className="mt-3 max-w-2xl whitespace-pre-line text-sm text-text-muted">{event.description}</p>}
      </header>

      {status === 'live' && event.lichess_arena_id && (
        <Card><LiveArena arenaId={event.lichess_arena_id} limit={20} /></Card>
      )}

      {status !== 'live' && standings.some((s) => s.fca_rank) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ResultsCard event={event} standings={standings} />
          {highlights.length > 0 && (
            <Card className="p-4 sm:p-5">
              <div className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">Highlights</div>
              <ul className="space-y-3">
                {highlights.map((h) => (
                  <li key={h.label} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05]"><h.icon className="h-4 w-4 text-primary" /></span>
                    <div className="min-w-0">
                      <div className="text-xs text-text-muted">{h.label}</div>
                      <div className="truncate text-sm text-white">
                        {h.id ? <Link to={`/profile/${h.id}`} className="font-semibold hover:text-primary-light">{h.name}</Link> : h.name}
                        <span className="text-text-muted"> · {h.value}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {guests > 0 && !profile && (
        <Card className="flex flex-col gap-3 border-primary/30 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-white">Played in this arena?</p>
            <p className="text-sm text-text-muted">{guests} players here aren't FCA members yet. Join and link Lichess — your games get rated retroactively once an arbiter approves them.</p>
          </div>
          <Link to="/join" className="btn-primary shrink-0"><UserPlus className="h-4 w-4" /> Join FCA</Link>
        </Card>
      )}

      {(standings.length > 0 || games.length > 0) && (
        <section>
          <Segmented
            className="mb-3"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'standings', label: `Standings (${standings.length})` },
              { value: 'games', label: `Rated games (${games.length})` },
            ]}
          />
          {tab === 'standings' ? (
            <Card className="divide-y divide-chess-border overflow-hidden">
              {standings.length === 0 ? <EmptyState title="Standings not synced yet" /> : standings.map((s) => (
                <div key={s.lichess_username} className={`flex items-center gap-3 px-3 py-2.5 sm:px-4 ${profile && s.player_id === profile.id ? 'bg-primary/10' : ''}`}>
                  <span className="w-7 text-center text-sm font-bold text-text-muted">{s.rank}</span>
                  {s.player_id ? (
                    <Link to={`/profile/${s.player_id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                      <Avatar src={s.avatar_url} name={s.full_name} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-semibold text-white">{s.full_name}</span>
                          <TitleBadge title={s.earned_title} />
                        </div>
                        <div className="truncate text-xs text-text-muted">@{s.lichess_username}{s.fca_rank ? ` · FCA #${s.fca_rank}` : ''}</div>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <Avatar name={s.lichess_username} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate text-text-muted">{s.lichess_username}</div>
                        <div className="text-[11px] text-text-muted/70">Not on FCA yet</div>
                      </div>
                    </div>
                  )}
                  <div className="text-right">
                    <div className="font-bold tabular-nums text-white">{s.score}</div>
                    <div className="text-[10px] text-text-muted">{s.games} games{s.performance ? ` · perf ${s.performance}` : ''}</div>
                  </div>
                </div>
              ))}
            </Card>
          ) : (
            <Card className="divide-y divide-chess-border overflow-hidden">
              {games.length === 0 ? <EmptyState title="No rated games between members yet" /> : [...games].reverse().map((g) => {
                const wd = g.white_elo_after != null && g.white_elo_before != null ? g.white_elo_after - g.white_elo_before : null;
                const bd = g.black_elo_after != null && g.black_elo_before != null ? g.black_elo_after - g.black_elo_before : null;
                const res = Number(g.result) === 1 ? '1-0' : Number(g.result) === 0 ? '0-1' : '½-½';
                return (
                  <div key={g.id} className="flex items-center gap-2 px-3 py-2.5 text-sm sm:px-4">
                    <Link to={`/profile/${g.white_player_id}`} className="flex min-w-0 flex-1 items-center justify-end gap-1.5 text-right">
                      <span className={`truncate ${Number(g.result) === 1 ? 'font-bold text-white' : 'text-text-muted'}`}>{g.white_player?.full_name}</span>
                      <Diff value={wd} className="text-xs" />
                    </Link>
                    <a href={g.external_url ?? '#'} target="_blank" rel="noreferrer" className="w-12 shrink-0 rounded-md bg-white/[0.05] py-1 text-center text-xs font-bold text-white hover:bg-white/10" title="Open game on Lichess">{res}</a>
                    <Link to={`/profile/${g.black_player_id}`} className="flex min-w-0 flex-1 items-center gap-1.5">
                      <Diff value={bd} className="text-xs" />
                      <span className={`truncate ${Number(g.result) === 0 ? 'font-bold text-white' : 'text-text-muted'}`}>{g.black_player?.full_name}</span>
                    </Link>
                  </div>
                );
              })}
            </Card>
          )}
        </section>
      )}

      {status === 'upcoming' && standings.length === 0 && (
        <Card><EmptyState icon={CalendarDays} title="Results appear here after the arena" text="Games between FCA members are rated once an arbiter approves the import." /></Card>
      )}
    </div>
  );
}

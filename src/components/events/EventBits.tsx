import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, ExternalLink, Share2, Radio, Users, Trophy, ChevronRight, Swords, Flame, Image as ImageIcon } from 'lucide-react';
import type { Standing, TournamentSummary } from '../../types';
import { MODE_LABELS } from '../../types';
import { arenaUrl, fetchLiveArena, type LiveArena as LiveArenaData } from '../../lib/lichess';
import { downloadEventIcs } from '../../lib/ics';
import { eventCard, shareImage, shareLink, siteUrl } from '../../lib/share';
import { formatDate, formatDateTime, formatTime, shortEventName } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { Avatar, TitleBadge } from '../ui/Avatar';
import { Card, Countdown, ModeIcon, Spinner } from '../ui/misc';
import { RankMedal } from '../achievements/Badges';
import { useToast } from '../ui/Toast';

export const isTitledTuesday = (title: string) => /titled\s*tuesday/i.test(title);

export function eventStatus(e: Pick<TournamentSummary, 'status' | 'start_date' | 'ends_at' | 'lichess_status'>) {
  const now = Date.now();
  const start = new Date(e.start_date).getTime();
  const end = e.ends_at ? new Date(e.ends_at).getTime() : start + 90 * 60_000;
  if (e.status === 'COMPLETED' || e.lichess_status === 30) return 'done';
  if (e.status === 'ONGOING' || e.lichess_status === 20 || (now >= start && now <= end)) return 'live';
  if (now > end) return 'done';
  return 'upcoming';
}

export function NextEventCard({ event }: { event: TournamentSummary }) {
  const toast = useToast();
  const status = eventStatus(event);
  const weekly = isTitledTuesday(event.title);
  const url = siteUrl(`/events/${event.id}`);

  async function share() {
    const outcome = await shareLink({
      title: event.title,
      text: `${event.title} — ${formatDateTime(event.start_date)}. ${event.lichess_arena_id ? 'Join the arena on Lichess and get FCA rated:' : 'See details:'}`,
      url: event.lichess_arena_id ? arenaUrl(event.lichess_arena_id) : url,
    });
    if (outcome === 'copied') toast('Link copied — paste it in the WhatsApp group');
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent" />
      <div className="relative p-4 sm:p-5">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
          {status === 'live' ? (
            <span className="flex items-center gap-1.5 text-rose-400"><Radio className="h-3.5 w-3.5 animate-pulse" /> Live now</span>
          ) : (
            <span className="text-primary">Next event</span>
          )}
          {event.rating_cap ? <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-sky-300">U{event.rating_cap}</span> : null}
        </div>
        <Link to={`/events/${event.id}`} className="block">
          <h3 className="text-lg font-extrabold leading-tight text-white sm:text-xl">{event.title}</h3>
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
          <span>{formatDateTime(event.start_date)}</span>
          <span className="flex items-center gap-1"><ModeIcon mode={event.mode} /> {MODE_LABELS[event.mode]}{event.time_control ? ` ${event.time_control}` : ''}</span>
          {!!event.nb_players && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {event.nb_players} joined</span>}
        </div>

        {status === 'upcoming' && (
          <div className="mt-4">
            <Countdown to={event.start_date} />
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {event.lichess_arena_id && (
            <a href={arenaUrl(event.lichess_arena_id)} target="_blank" rel="noreferrer" className="btn-primary flex-1 sm:flex-none">
              <ExternalLink className="h-4 w-4" /> {status === 'live' ? 'Play now on Lichess' : 'Join on Lichess'}
            </a>
          )}
          {status === 'upcoming' && (
            <button
              className="btn-secondary"
              onClick={() => downloadEventIcs({
                id: event.id,
                title: weekly ? 'FCA Titled Tuesday' : event.title,
                start: event.start_date,
                end: event.ends_at,
                url: event.lichess_arena_id ? arenaUrl(event.lichess_arena_id) : url,
                weekly,
              })}
              aria-label={weekly ? 'Add every Titled Tuesday to my calendar' : 'Add to calendar'}
            >
              <CalendarPlus className="h-4 w-4" /> {weekly ? 'Remind me weekly' : 'Add to calendar'}
            </button>
          )}
          <button className="btn-secondary" onClick={share} aria-label="Share event">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {status === 'live' && event.lichess_arena_id && <LiveArena arenaId={event.lichess_arena_id} />}
    </Card>
  );
}

/** Live Lichess standings (refreshes every 30s); FCA members are linked to their profiles. */
export function LiveArena({ arenaId, limit = 8 }: { arenaId: string; limit?: number }) {
  const [arena, setArena] = useState<LiveArenaData | null>(null);
  const [members, setMembers] = useState<Map<string, { id: string; full_name: string; avatar_url: string | null }>>(new Map());

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const a = await fetchLiveArena(arenaId);
      if (alive && a) setArena(a);
    };
    load();
    const t = setInterval(load, 30_000);
    supabase.from('profiles').select('id, full_name, avatar_url, lichess_username').not('lichess_username', 'is', null).then(({ data }) => {
      if (!alive) return;
      setMembers(new Map((data ?? []).map((p) => [String(p.lichess_username).toLowerCase(), p])));
    });
    return () => { alive = false; clearInterval(t); };
  }, [arenaId]);

  const players = arena?.standing?.players ?? [];
  if (!arena) return <div className="flex justify-center border-t border-chess-border py-6"><Spinner /></div>;

  return (
    <div className="border-t border-chess-border">
      <div className="flex items-center justify-between px-4 pt-3 text-xs text-text-muted sm:px-5">
        <span>{arena.isFinished ? 'Final standings' : 'Live standings'} · {arena.nbPlayers} players</span>
        {arena.secondsToFinish ? <span>{Math.ceil(arena.secondsToFinish / 60)} min left</span> : null}
      </div>
      <ol className="divide-y divide-chess-border px-2 pb-2 sm:px-3">
        {players.slice(0, limit).map((p) => {
          const m = members.get(p.name.toLowerCase());
          return (
            <li key={p.name} className="flex items-center gap-3 px-2 py-2">
              <span className="w-6 text-center text-xs font-bold text-text-muted">{p.rank}</span>
              {m ? (
                <Link to={`/profile/${m.id}`} className="flex min-w-0 flex-1 items-center gap-2">
                  <Avatar src={m.avatar_url} name={m.full_name} size="xs" />
                  <span className="truncate text-sm font-semibold text-white">{m.full_name}</span>
                </Link>
              ) : (
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <Avatar name={p.name} size="xs" />
                  <span className="truncate text-sm text-text-muted">{p.name}</span>
                  <span className="rounded bg-white/5 px-1.5 text-[10px] text-text-muted">guest</span>
                </span>
              )}
              <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-white">{p.sheet?.fire && <Flame className="h-3.5 w-3.5 text-orange-400" aria-label="on a streak" />}{p.score}</span>
            </li>
          );
        })}
      </ol>
      <a href={arenaUrl(arenaId)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 border-t border-chess-border py-3 text-xs font-semibold text-primary">
        Open arena on Lichess <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

export function Podium({ standings }: { standings: Standing[] }) {
  const top = standings.filter((s) => s.fca_rank != null).sort((a, b) => (a.fca_rank ?? 0) - (b.fca_rank ?? 0)).slice(0, 3);
  if (!top.length) return null;
  const order = [top[1], top[0], top[2]];
  const style = [
    { ring: 'border-slate-300', h: 'h-14', rank: 2 as const },
    { ring: 'border-yellow-400', h: 'h-20', rank: 1 as const },
    { ring: 'border-amber-600', h: 'h-10', rank: 3 as const },
  ];
  return (
    <div className="grid grid-cols-3 items-end gap-2">
      {order.map((s, i) => s ? (
        <Link key={s.lichess_username} to={s.player_id ? `/profile/${s.player_id}` : '#'} className="flex min-w-0 flex-col items-center text-center">
          <Avatar src={s.avatar_url} name={s.full_name ?? s.lichess_username} size={i === 1 ? 'lg' : 'md'} ring={style[i].ring} className="border-2" />
          <span className="mt-1.5 w-full truncate text-xs font-bold text-white sm:text-sm">{s.full_name ?? s.lichess_username}</span>
          <span className="text-[11px] text-text-muted">{s.score} pts</span>
          <span className={`mt-1.5 flex w-full items-start justify-center rounded-t-lg bg-white/[0.06] pt-1.5 ${style[i].h}`}><RankMedal rank={style[i].rank} size={i === 1 ? 30 : 26} /></span>
        </Link>
      ) : <span key={i} />)}
    </div>
  );
}

export function ResultsCard({ event, standings, label = 'Latest results', showTitle = true }: {
  event: TournamentSummary; standings: Standing[]; label?: string; showTitle?: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const top = useMemo(() => standings.filter((s) => s.fca_rank != null).slice(0, 3), [standings]);

  async function shareCard() {
    setBusy(true);
    try {
      const blob = await eventCard({
        title: event.title,
        date: formatDate(event.start_date),
        players: event.participants || event.nb_players || standings.length,
        podium: top.map((s) => ({ name: s.full_name ?? s.lichess_username, avatar: s.avatar_url, score: s.score })),
        nextLine: isTitledTuesday(event.title) ? 'Titled Tuesday · every Tuesday 8:30 PM on Lichess' : 'Rated FCA chess on Lichess',
      });
      const outcome = await shareImage(blob, 'fca-results.png', {
        title: event.title,
        text: `${event.title} results`,
        url: siteUrl(`/events/${event.id}`),
      });
      if (outcome === 'downloaded') toast('Results image saved — post it on your status');
    } catch {
      toast('Could not create the image', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-primary">{label}</div>
          {showTitle && (
            <>
              <Link to={`/events/${event.id}`} className="mt-0.5 block truncate text-base font-bold text-white hover:text-primary-light">{event.title}</Link>
              <div className="text-xs text-text-muted">{formatDate(event.start_date)} · {event.participants || event.nb_players} players · {event.rated_games} rated games</div>
            </>
          )}
          {!showTitle && <div className="mt-0.5 text-xs text-text-muted">Top FCA members · share the results image</div>}
        </div>
        <button onClick={shareCard} disabled={busy} className="btn-secondary !min-h-[40px] shrink-0 !px-3" aria-label="Share results image">
          {busy ? <Spinner className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>
      <Podium standings={standings} />
      <Link to={`/events/${event.id}`} className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-primary">
        Full standings <ChevronRight className="h-4 w-4" />
      </Link>
    </Card>
  );
}

export function EventRow({ e }: { e: TournamentSummary }) {
  const status = eventStatus(e);
  const d = new Date(e.start_date);
  return (
    <Link to={`/events/${e.id}`} className="flex items-center gap-3 rounded-2xl border border-chess-border bg-surface p-3 transition-colors hover:border-primary/40 sm:p-4">
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#1E1C18] leading-none">
        <span className="text-[10px] font-bold uppercase text-text-muted">{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
        <span className="text-lg font-extrabold text-white">{d.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-semibold text-white">{shortEventName(e.title)}</span>
          {status === 'live' && <span className="rounded bg-rose-500/20 px-1.5 text-[10px] font-bold text-rose-300">LIVE</span>}
          {e.rating_cap ? <span className="rounded bg-sky-500/15 px-1.5 text-[10px] font-bold text-sky-300">U{e.rating_cap}</span> : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
          <span className="flex items-center gap-1"><ModeIcon mode={e.mode} className="h-3 w-3" /> {MODE_LABELS[e.mode]}{e.time_control ? ` ${e.time_control}` : ''}</span>
          {status === 'upcoming' ? <span>{formatTime(e.start_date)}</span> : (
            <>
              {(e.participants || e.nb_players) ? <span className="flex items-center gap-1"><Users className="h-3 w-3" />{e.participants || e.nb_players}</span> : null}
              {e.rated_games > 0 && <span className="flex items-center gap-1"><Swords className="h-3 w-3" />{e.rated_games}</span>}
            </>
          )}
        </div>
      </div>
      {e.fca_winner ? (
        <div className="flex shrink-0 items-center gap-2 text-right">
          <div className="hidden min-w-0 sm:block">
            <div className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase text-yellow-400"><Trophy className="h-3 w-3" /> Winner</div>
            <div className="flex max-w-[140px] items-center gap-1 truncate text-sm font-semibold text-white">{e.fca_winner.full_name} <TitleBadge title={e.fca_winner.earned_title} /></div>
          </div>
          <Avatar src={e.fca_winner.avatar_url} name={e.fca_winner.full_name} size="sm" ring="border-yellow-400/70" />
        </div>
      ) : (
        <ChevronRight className="h-5 w-5 shrink-0 text-text-muted" />
      )}
    </Link>
  );
}

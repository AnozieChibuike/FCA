import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Edit3, Share2, Image as ImageIcon, Swords, Clock3, UserPlus, Heart, Trophy, ShieldCheck, ExternalLink, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import {
  fetchAchievementStats, fetchPlayerAchievements, fetchPlayerGames, fetchPlayerStandings, fetchProfile, fetchTitleStats,
} from '../lib/api';
import { inviteUrl, playerCard, shareImage, shareLink, siteUrl } from '../lib/share';
import { lichessProfileUrl } from '../lib/lichess';
import { chesscomProfileUrl } from '../lib/chesscom';
import { formatDate, ordinal, plural, shortEventName } from '../lib/format';
import type { Game, GameMode, PlayerAchievement, Profile as ProfileType, Standing, TitleStats } from '../types';
import { TITLE_CONFIG, modeRating, totalGames } from '../types';
import { ModeCards, PerformanceStats, RatingHistory, RecentForm, outcomeFor } from '../components/profile/RatingPanel';
import TitleProgressPill from '../components/profile/TitleProgressPill';
import MatchList from '../components/profile/MatchList';
import EditProfileSheet from '../components/profile/EditProfileSheet';
import OnboardingChecklist from '../components/profile/OnboardingChecklist';
import { BadgeGrid, BadgeMedal, ACHIEVEMENT_MAP } from '../components/achievements/Badges';
import { Avatar, TitleBadge } from '../components/ui/Avatar';
import { ChesscomIcon, LichessIcon } from '../components/ui/icons';
import { Card, EmptyState, PageLoader, Segmented, Spinner } from '../components/ui/misc';
import { useToast } from '../components/ui/Toast';

type Tab = 'overview' | 'games' | 'badges' | 'events';

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const { profile: me } = useAuth();
  const toast = useToast();
  const [player, setPlayer] = useState<ProfileType | null | undefined>(undefined);
  const [games, setGames] = useState<Game[]>([]);
  const [badges, setBadges] = useState<PlayerAchievement[]>([]);
  const [rarity, setRarity] = useState<Record<string, { earned: number; active: number }>>({});
  const [events, setEvents] = useState<Standing[]>([]);
  const [titleStats, setTitleStats] = useState<TitleStats | null>(null);
  const [recruits, setRecruits] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [mode, setMode] = useState<GameMode>('BLITZ');
  const [tab, setTab] = useState<Tab>('overview');
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [version, setVersion] = useState(0);

  const isOwn = !!me && me.id === id;

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      const p = await fetchProfile(id);
      if (!alive) return;
      setPlayer(p);
      if (!p) return;
      // Default the chart to the time control they actually play most.
      const most = (['BLITZ', 'BULLET', 'RAPID', 'CLASSICAL'] as GameMode[]).sort((a, b) => modeRating(p, b).games - modeRating(p, a).games)[0];
      if (version === 0) setMode(most);
      const [g, b, s, st, rec, higher, ts] = await Promise.all([
        fetchPlayerGames(id).catch(() => []),
        fetchPlayerAchievements(id).catch(() => []),
        fetchPlayerStandings(id).catch(() => []),
        fetchAchievementStats().catch(() => ({})),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('invited_by', id).eq('status', 'APPROVED'),
        p.blitz_games > 0
          ? supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'APPROVED').eq('is_immortal', false).gt('blitz_games', 0).gt('blitz_elo', p.blitz_elo)
          : Promise.resolve({ count: null }),
        fetchTitleStats(id).catch(() => null),
      ]);
      if (!alive) return;
      setGames(g);
      setBadges(b);
      setEvents(s);
      setTitleStats(ts);
      setRarity(st);
      setRecruits(rec.count ?? 0);
      setRank(higher.count == null ? null : higher.count + 1);
    })();
    return () => { alive = false; };
  }, [id, version]);

  useEffect(() => {
    if (isOwn && params.get('edit') === '1') {
      setEditing(true);
      params.delete('edit');
      setParams(params, { replace: true });
    }
  }, [isOwn, params, setParams]);

  useEffect(() => setTab('overview'), [id]);

  const earned = useMemo(() => badges.filter((b) => b.earned_at).sort((a, b) => (b.earned_at ?? '').localeCompare(a.earned_at ?? '')), [badges]);
  const winRate = useMemo(() => {
    const off = games.filter((g) => g.is_official !== false);
    return off.length ? Math.round((off.filter((g) => outcomeFor(g, id!) === 'W').length / off.length) * 100) : 0;
  }, [games, id]);

  if (player === undefined) return <PageLoader />;
  if (!player) {
    return <div className="page"><EmptyState icon={User} title="Player not found" action={<Link to="/leaderboards" className="btn-secondary">Rankings</Link>} /></div>;
  }

  const immortal = player.is_immortal || player.fca_id === 'FCA-ETERNAL';
  const title = immortal ? 'FET' : player.earned_title;

  async function shareCard() {
    setSharing(true);
    try {
      const r = modeRating(player!, 'BLITZ');
      const blob = await playerCard({
        name: player!.full_name,
        avatar: player!.avatar_url,
        title: title !== 'NONE' ? TITLE_CONFIG[title].label : null,
        department: player!.department,
        rating: r.elo,
        peak: r.peak,
        rank,
        games: totalGames(player!),
        winRate,
        badges: earned.length,
      });
      const outcome = await shareImage(blob, 'fca-player-card.png', {
        title: `${player!.full_name} on FCA Rated`,
        text: isOwn ? 'My FCA rating card. Join me on FCA Rated:' : `${player!.full_name} on FCA Rated`,
        url: isOwn ? inviteUrl(player!.fca_id) : siteUrl(`/profile/${player!.id}`),
      });
      if (outcome === 'downloaded') toast('Card saved — share it on your status');
    } catch {
      toast('Could not create the card', 'error');
    } finally {
      setSharing(false);
    }
  }

  async function shareProfile() {
    const outcome = await shareLink({ title: player!.full_name, text: `${player!.full_name} on FCA Rated`, url: siteUrl(`/profile/${player!.id}`) });
    if (outcome === 'copied') toast('Profile link copied');
  }

  async function shareInvite() {
    const outcome = await shareLink({ title: 'Join FCA Rated', text: 'Play rated chess with the FUTO Chess Association. Join with my link:', url: inviteUrl(player!.fca_id) });
    if (outcome === 'copied') toast('Invite link copied');
  }

  return (
    <div className="page space-y-5">
      {/* Header */}
      <Card className="relative overflow-hidden p-4 sm:p-6">
        {immortal && <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/15 to-transparent" />}
        <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <div className="relative">
            <Avatar src={immortal ? (player.avatar_url || '/chisom-howell.jpeg') : player.avatar_url} name={player.full_name} size="xl" ring={immortal ? 'border-purple-400/70' : 'border-chess-border'} className="border-2" />
            {title !== 'NONE' && <TitleBadge title={title} className="absolute -bottom-1 left-1/2 -translate-x-1/2 !text-xs shadow-lg" />}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{player.full_name}</h1>
            <p className="mt-0.5 text-sm text-text-muted">
              {[player.department !== 'N/A' && player.department, player.faculty !== 'N/A' && player.faculty].filter(Boolean).join(' · ') || 'FUTO Chess Association'}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5 text-xs sm:justify-start">
              {player.is_admin && <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary-light"><ShieldCheck className="h-3 w-3" /> Admin</span>}
              {player.is_arbiter && <span className="flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 font-semibold text-sky-300"><ShieldCheck className="h-3 w-3" /> Arbiter</span>}
              {player.is_alumni && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300">Alumni</span>}
              {player.gender === 'FEMALE' && <span className="rounded-full bg-rose-500/15 px-2 py-0.5 font-semibold text-rose-300">Female</span>}
              {rank && <span className="rounded-full bg-white/5 px-2 py-0.5 font-semibold text-white">#{rank} blitz</span>}
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-text-muted">{player.fca_id}</span>
              {!immortal && <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-text-muted"><Clock3 className="h-3 w-3" /> since {formatDate(player.created_at, { month: 'short', year: 'numeric' })}</span>}
            </div>
            {player.bio && <p className="mt-3 max-w-2xl text-sm text-text-muted">{player.bio}</p>}
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {player.lichess_username && (
                <a href={lichessProfileUrl(player.lichess_username)} target="_blank" rel="noreferrer" className="flex min-h-[36px] items-center gap-1.5 rounded-xl border border-chess-border bg-[#1E1C18] px-3 text-xs font-semibold text-white hover:border-primary/50">
                  <LichessIcon className="h-4 w-4" /> {player.lichess_username} <ExternalLink className="h-3 w-3 text-text-muted" />
                </a>
              )}
              {player.chesscom_username && (
                <a href={chesscomProfileUrl(player.chesscom_username)} target="_blank" rel="noreferrer" className="flex min-h-[36px] items-center gap-1.5 rounded-xl border border-chess-border bg-[#1E1C18] px-3 text-xs font-semibold text-white hover:border-primary/50">
                  <ChesscomIcon className="h-4 w-4" /> {player.chesscom_username} <ExternalLink className="h-3 w-3 text-text-muted" />
                </a>
              )}
            </div>
          </div>
          <div className="flex w-full gap-2 sm:w-auto sm:flex-col">
            {isOwn ? (
              <>
                <button onClick={() => setEditing(true)} className="btn-secondary flex-1"><Edit3 className="h-4 w-4" /> Edit</button>
                <button onClick={shareCard} disabled={sharing} className="btn-primary flex-1">{sharing ? <Spinner className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />} My card</button>
              </>
            ) : (
              <>
                {me && !immortal && <Link to={`/compare/${me.id}/${player.id}`} className="btn-primary flex-1"><Swords className="h-4 w-4" /> Compare</Link>}
                <button onClick={shareProfile} className="btn-secondary flex-1"><Share2 className="h-4 w-4" /> Share</button>
              </>
            )}
          </div>
        </div>
      </Card>

      {immortal && (
        <Link to="/memorial" className="flex items-center gap-3 rounded-2xl border border-purple-500/30 bg-purple-500/[0.07] p-4">
          <Heart className="h-5 w-5 fill-purple-400 text-purple-400" />
          <span className="flex-1 text-sm text-purple-100">FCA Eternal — this profile is preserved in memory. Read the tribute.</span>
        </Link>
      )}

      {isOwn && player.status === 'PENDING' && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Your membership is awaiting approval by an FCA admin. You can still connect Lichess and play — your games are rated once you're approved.
        </div>
      )}
      {isOwn && <OnboardingChecklist profile={player} />}

      {!immortal && (
        <>
          <ModeCards player={player} mode={mode} onMode={setMode} />
          <TitleProgressPill player={player} stats={titleStats} />

          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'overview', label: 'Overview' },
              { value: 'games', label: <>Games{games.length > 0 && <span className="text-[11px] font-medium text-text-muted">{games.length}</span>}</> },
              { value: 'badges', label: <>Badges{earned.length > 0 && <span className="text-[11px] font-medium text-text-muted">{earned.length}</span>}</> },
              { value: 'events', label: 'Events' },
            ]}
          />

          {tab === 'overview' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <RatingHistory games={games} playerId={player.id} mode={mode} />
                <RecentForm games={games} playerId={player.id} />
                {earned.length > 0 && (
                  <Card className="p-4 sm:p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white">Latest badges</h3>
                      <button onClick={() => setTab('badges')} className="text-xs font-semibold text-primary">All {earned.length}</button>
                    </div>
                    <div className="no-scrollbar flex gap-3 overflow-x-auto">
                      {earned.slice(0, 8).map((b) => {
                        const def = ACHIEVEMENT_MAP[b.achievement_key];
                        return def && (
                          <div key={b.achievement_key} className="flex w-20 shrink-0 flex-col items-center gap-1.5 text-center">
                            <BadgeMedal def={def} earned />
                            <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-white">{def.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </div>
              <div className="space-y-4">
                <PerformanceStats games={games} playerId={player.id} viewerId={me?.id} />
                {isOwn && (
                  <Card className="p-4 sm:p-5">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-white"><UserPlus className="h-4 w-4 text-primary" /> Invite friends</h3>
                    <p className="mt-1 text-xs text-text-muted">
                      {recruits ? `You've brought ${recruits} member${recruits === 1 ? '' : 's'} to FCA.` : 'Members who sign up with your link count towards your recruiter badges.'}
                    </p>
                    <button onClick={shareInvite} className="btn-primary mt-3 w-full"><Share2 className="h-4 w-4" /> Share my invite link</button>
                  </Card>
                )}
              </div>
            </div>
          )}

          {tab === 'games' && <MatchList games={games} playerId={player.id} />}

          {tab === 'badges' && <BadgeGrid rows={badges} rarity={rarity} />}

          {tab === 'events' && (
            events.length === 0 ? (
              <Card><EmptyState icon={Trophy} title="No events yet" text="Arenas this player joined show up here with their finishing position." /></Card>
            ) : (
              <Card className="divide-y divide-chess-border overflow-hidden">
                {events.map((s) => (
                  <Link key={s.tournament_id} to={`/events/${s.tournament_id}`} className="flex items-center gap-3 px-3 py-3 hover:bg-white/[0.02] sm:px-4">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${
                      s.fca_rank === 1 ? 'bg-yellow-400/15 text-yellow-400' : s.fca_rank && s.fca_rank <= 3 ? 'bg-white/10 text-white' : 'bg-white/[0.04] text-text-muted'}`}
                    >
                      {s.fca_rank ? ordinal(s.fca_rank) : '—'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-white">{shortEventName(s.tournament_title)}</div>
                      <div className="text-xs text-text-muted">{formatDate(s.tournament_date)} · overall #{s.rank} · {plural(s.games, 'game')}</div>
                    </div>
                    <span className="text-right">
                      <span className="block font-bold tabular-nums text-white">{s.score}</span>
                      <span className="text-[10px] text-text-muted">arena pts</span>
                    </span>
                  </Link>
                ))}
              </Card>
            )
          )}
        </>
      )}

      {isOwn && <EditProfileSheet player={player} open={editing} onClose={() => setEditing(false)} onSaved={() => setVersion((v) => v + 1)} />}
    </div>
  );
}

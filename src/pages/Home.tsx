import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Swords, Trophy, Zap, ArrowRight, Crown, GraduationCap, User, Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import fcaLogo from '../assets/logo.png';
import MemorialBanner from '../components/MemorialBanner';
import { TITLE_CONFIG, type Profile } from '../types';
import PastTournaments from '../components/PastTournaments';
import UpcomingEvents from '../components/UpcomingEvents';

interface CategoryLeader {
  player: Profile;
  winRate: number;
  totalGames: number;
}

export default function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalPlayers: 0,
    totalGames: 0,
    numberOne: null as CategoryLeader | null,
    topStudent: null as CategoryLeader | null,
    topFemale: null as CategoryLeader | null,
    topAlumni: null as CategoryLeader | null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getLeaderInfo(query: any): Promise<CategoryLeader | null> {
      const { data: player } = await query.limit(1).maybeSingle();
      if (!player) return null;

      const { data: games } = await supabase
        .from('games')
        .select('white_player_id, black_player_id, result')
        .or(`white_player_id.eq.${player.id},black_player_id.eq.${player.id}`);

      const totalGames = games ? games.length : 0;
      let wins = 0;

      if (games) {
        games.forEach((g: any) => {
          if (g.white_player_id === player.id && Number(g.result) === 1) wins++;
          if (g.black_player_id === player.id && Number(g.result) === 0) wins++;
        });
      }

      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
      return { player: player as Profile, winRate, totalGames };
    }

    async function fetchStats() {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: gameCount } = await supabase.from('games').select('*', { count: 'exact', head: true });

      const [numberOne, topStudent, topFemale, topAlumni] = await Promise.all([
        // #1 Overall Player
        getLeaderInfo(
          supabase.from('profiles').select('*').eq('status', 'APPROVED').eq('is_immortal', false).order('blitz_elo', { ascending: false })
        ),
        // Top Student (is_alumni = false)
        getLeaderInfo(
          supabase.from('profiles').select('*').eq('status', 'APPROVED').eq('is_immortal', false).eq('is_alumni', false).order('blitz_elo', { ascending: false })
        ),
        // Top Female (gender = 'FEMALE')
        getLeaderInfo(
          supabase.from('profiles').select('*').eq('status', 'APPROVED').eq('is_immortal', false).eq('gender', 'FEMALE').order('blitz_elo', { ascending: false })
        ),
        // Top Alumni (is_alumni = true)
        getLeaderInfo(
          supabase.from('profiles').select('*').eq('status', 'APPROVED').eq('is_immortal', false).eq('is_alumni', true).order('blitz_elo', { ascending: false })
        ),
      ]);

      setStats({
        totalPlayers: count || 0,
        totalGames: gameCount || 0,
        numberOne,
        topStudent,
        topFemale,
        topAlumni,
      });
      setLoading(false);
    }
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen">
      <section className="pt-24 sm:pt-28 pb-12 sm:pb-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Main Hero Header */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#262421] border border-chess-border text-white text-xs font-semibold mb-4 sm:mb-6 shadow-sm select-none">
              <img src={fcaLogo} alt="FCA Logo" className="w-4 h-4 object-contain" />
              <span>Official FUTO Chess Association Platform</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 sm:mb-5 leading-tight">
              FUTO Chess Association
            </h1>
            <p className="text-text-muted text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Track your chess ratings across Blitz, Rapid, Bullet, and Classical formats.
              Compete with fellow students and claim your place on the campus leaderboards.
            </p>
          </div>

          {/* Overview Stats (Double Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-8">
            <div className="bg-surface border border-chess-border p-5 sm:p-6 rounded-xl flex items-center gap-4 shadow-card">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-white leading-none mb-1">
                  {loading ? '—' : stats.totalPlayers}
                </p>
                <p className="text-text-muted text-xs font-medium uppercase tracking-wider">Registered FCA Players</p>
              </div>
            </div>
            
            <div className="bg-surface border border-chess-border p-5 sm:p-6 rounded-xl flex items-center gap-4 shadow-card">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Swords className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-white leading-none mb-1">
                  {loading ? '—' : stats.totalGames}
                </p>
                <p className="text-text-muted text-xs font-medium uppercase tracking-wider">Official Rating Games Logged</p>
              </div>
            </div>
          </div>

          {/* Featured Category Leaders Grid (4 Cards Responsive Grid) */}
          <div className="mb-10 sm:mb-14">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                  <span>Featured Category Leaders</span>
                </h2>
                <p className="text-text-muted text-xs">Top ranking active players across campus categories.</p>
              </div>
              <Link
                to="/leaderboards"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span>Full Leaderboards</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              
              {/* CARD 1: #1 OVERALL PLAYER (DISTINCT GOLDEN DESIGN) */}
              <div
                onClick={() => stats.numberOne && navigate(`/profile/${stats.numberOne.player.id}`)}
                className="bg-gradient-to-b from-[#2A261D] via-[#1E1C18] to-amber-950/40 border-2 border-amber-500/70 p-5 rounded-xl shadow-[0_0_25px_rgba(234,179,8,0.2)] relative overflow-hidden transition-all duration-200 hover:scale-[1.02] cursor-pointer group flex flex-col justify-between"
              >
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-500 text-black shadow-md uppercase tracking-wider">
                      <Crown className="w-3.5 h-3.5 fill-black shrink-0" />
                      <span>Current #1 Player</span>
                    </span>
                    <span className="text-[10px] font-bold text-amber-400 font-mono">RANK #1</span>
                  </div>

                  {loading ? (
                    <div className="py-8 text-center">
                      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                    </div>
                  ) : stats.numberOne ? (
                    <div className="flex items-start gap-3 mb-4">
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-[#161512] border-2 border-amber-400 shadow-[0_0_12px_rgba(250,204,21,0.4)] flex items-center justify-center">
                          {stats.numberOne.player.avatar_url ? (
                            <img src={stats.numberOne.player.avatar_url} alt={stats.numberOne.player.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-7 h-7 text-amber-300" />
                          )}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center text-[10px] font-black shadow-md">
                          1
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-extrabold text-white text-base sm:text-lg group-hover:text-amber-400 transition-colors truncate">
                          {stats.numberOne.player.full_name}
                        </h3>
                        {stats.numberOne.player.earned_title !== 'NONE' && (
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-black tracking-wider mb-1 ${TITLE_CONFIG[stats.numberOne.player.earned_title].bg}`}>
                            {TITLE_CONFIG[stats.numberOne.player.earned_title].tag}
                          </span>
                        )}
                        <p className="text-text-muted text-xs truncate">
                          {stats.numberOne.player.department || 'FUTO Player'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-text-muted text-xs py-4">No ranked player available</p>
                  )}
                </div>

                {stats.numberOne && (
                  <div className="pt-3 border-t border-amber-500/30 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase text-text-muted font-semibold block">Blitz Rating</span>
                      <span className="text-xl font-black text-amber-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">
                        {stats.numberOne.player.blitz_elo} Elo
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-text-muted font-semibold block">Win Rate</span>
                      <span className="text-xs font-extrabold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40 inline-block mt-0.5">
                        {stats.numberOne.winRate}% ({stats.numberOne.totalGames} G)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 2: TOP STUDENT */}
              <div
                onClick={() => stats.topStudent && navigate(`/profile/${stats.topStudent.player.id}`)}
                className="bg-surface border border-chess-border hover:border-sky-500/60 p-5 rounded-xl shadow-card transition-all duration-200 hover:scale-[1.01] cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-sky-950/80 text-sky-300 border border-sky-500/50 uppercase tracking-wider">
                      <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                      <span>Top Student</span>
                    </span>
                  </div>

                  {loading ? (
                    <div className="py-8 text-center">
                      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                    </div>
                  ) : stats.topStudent ? (
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-[#161512] border-2 border-sky-500/60 shrink-0 flex items-center justify-center">
                        {stats.topStudent.player.avatar_url ? (
                          <img src={stats.topStudent.player.avatar_url} alt={stats.topStudent.player.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-sky-300" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-white text-base group-hover:text-sky-300 transition-colors truncate">
                          {stats.topStudent.player.full_name}
                        </h3>
                        {stats.topStudent.player.earned_title !== 'NONE' && (
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-black tracking-wider mb-1 ${TITLE_CONFIG[stats.topStudent.player.earned_title].bg}`}>
                            {TITLE_CONFIG[stats.topStudent.player.earned_title].tag}
                          </span>
                        )}
                        <p className="text-text-muted text-xs truncate">
                          {stats.topStudent.player.department || 'FUTO Student'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-text-muted text-xs py-4">No student data</p>
                  )}
                </div>

                {stats.topStudent && (
                  <div className="pt-3 border-t border-chess-border flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase text-text-muted font-semibold block">Blitz Rating</span>
                      <span className="text-lg font-extrabold text-white">
                        {stats.topStudent.player.blitz_elo} Elo
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-text-muted font-semibold block">Win Rate</span>
                      <span className="text-xs font-bold text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded-full border border-sky-500/40 inline-block mt-0.5">
                        {stats.topStudent.winRate}% ({stats.topStudent.totalGames} G)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 3: TOP FEMALE */}
              <div
                onClick={() => stats.topFemale && navigate(`/profile/${stats.topFemale.player.id}`)}
                className="bg-surface border border-chess-border hover:border-rose-500/60 p-5 rounded-xl shadow-card transition-all duration-200 hover:scale-[1.01] cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-950/80 text-rose-300 border border-rose-500/50 uppercase tracking-wider">
                      <Crown className="w-3.5 h-3.5 shrink-0" />
                      <span>Top Female</span>
                    </span>
                  </div>

                  {loading ? (
                    <div className="py-8 text-center">
                      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                    </div>
                  ) : stats.topFemale ? (
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-[#161512] border-2 border-rose-500/60 shrink-0 flex items-center justify-center">
                        {stats.topFemale.player.avatar_url ? (
                          <img src={stats.topFemale.player.avatar_url} alt={stats.topFemale.player.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-rose-300" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-white text-base group-hover:text-rose-300 transition-colors truncate">
                          {stats.topFemale.player.full_name}
                        </h3>
                        {stats.topFemale.player.earned_title !== 'NONE' && (
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-black tracking-wider mb-1 ${TITLE_CONFIG[stats.topFemale.player.earned_title].bg}`}>
                            {TITLE_CONFIG[stats.topFemale.player.earned_title].tag}
                          </span>
                        )}
                        <p className="text-text-muted text-xs truncate">
                          {stats.topFemale.player.department || 'FUTO Player'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-text-muted text-xs py-4">No female player registered yet</p>
                  )}
                </div>

                {stats.topFemale && (
                  <div className="pt-3 border-t border-chess-border flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase text-text-muted font-semibold block">Blitz Rating</span>
                      <span className="text-lg font-extrabold text-white">
                        {stats.topFemale.player.blitz_elo} Elo
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-text-muted font-semibold block">Win Rate</span>
                      <span className="text-xs font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-500/40 inline-block mt-0.5">
                        {stats.topFemale.winRate}% ({stats.topFemale.totalGames} G)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 4: TOP ALUMNI */}
              <div
                onClick={() => stats.topAlumni && navigate(`/profile/${stats.topAlumni.player.id}`)}
                className="bg-surface border border-chess-border hover:border-emerald-500/60 p-5 rounded-xl shadow-card transition-all duration-200 hover:scale-[1.01] cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 uppercase tracking-wider">
                      <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                      <span>Top Alumni</span>
                    </span>
                  </div>

                  {loading ? (
                    <div className="py-8 text-center">
                      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                    </div>
                  ) : stats.topAlumni ? (
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-[#161512] border-2 border-emerald-500/60 shrink-0 flex items-center justify-center">
                        {stats.topAlumni.player.avatar_url ? (
                          <img src={stats.topAlumni.player.avatar_url} alt={stats.topAlumni.player.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-emerald-300" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors truncate">
                          {stats.topAlumni.player.full_name}
                        </h3>
                        {stats.topAlumni.player.earned_title !== 'NONE' && (
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-black tracking-wider mb-1 ${TITLE_CONFIG[stats.topAlumni.player.earned_title].bg}`}>
                            {TITLE_CONFIG[stats.topAlumni.player.earned_title].tag}
                          </span>
                        )}
                        <p className="text-text-muted text-xs truncate">
                          {stats.topAlumni.player.department || 'Alumni Player'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-text-muted text-xs py-4">No alumni player registered yet</p>
                  )}
                </div>

                {stats.topAlumni && (
                  <div className="pt-3 border-t border-chess-border flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase text-text-muted font-semibold block">Blitz Rating</span>
                      <span className="text-lg font-extrabold text-white">
                        {stats.topAlumni.player.blitz_elo} Elo
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-text-muted font-semibold block">Win Rate</span>
                      <span className="text-xs font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40 inline-block mt-0.5">
                        {stats.topAlumni.winRate}% ({stats.topAlumni.totalGames} G)
                      </span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Action Cards (Double Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mb-8 sm:mb-12">
            <Link
              to="/login"
              className="bg-surface hover:bg-[#2E2B27] border border-chess-border hover:border-primary/50 p-5 sm:p-7 rounded-xl transition-all duration-150 group flex flex-col justify-between shadow-card active:scale-[0.99]"
            >
              <div>
                <div className="w-10 h-10 rounded-md bg-[#161512] flex items-center justify-center mb-3 sm:mb-4 border border-chess-border">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Become an FCA Player</h3>
                <p className="text-text-muted text-xs sm:text-sm leading-relaxed mb-4 sm:mb-6">
                  Register with your student details, link your Lichess or Chess.com profile, and start competing in official rating events.
                </p>
              </div>
              <span className="flex items-center gap-2 text-primary text-xs sm:text-sm font-semibold group-hover:gap-3 transition-all duration-150 min-h-[40px] items-center">
                Get Started <ArrowRight className="w-4 h-4" />
              </span>
            </Link>

            <Link
              to="/leaderboards"
              className="bg-surface hover:bg-[#2E2B27] border border-chess-border hover:border-primary/50 p-5 sm:p-7 rounded-xl transition-all duration-150 group flex flex-col justify-between shadow-card active:scale-[0.99]"
            >
              <div>
                <div className="w-10 h-10 rounded-md bg-[#161512] flex items-center justify-center mb-3 sm:mb-4 border border-chess-border">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">View Leaderboards</h3>
                <p className="text-text-muted text-xs sm:text-sm leading-relaxed mb-4 sm:mb-6">
                  Check out current top rankings, filter by department or faculty, and see who dominates FUTO chess.
                </p>
              </div>
              <span className="flex items-center gap-2 text-primary text-xs sm:text-sm font-semibold group-hover:gap-3 transition-all duration-150 min-h-[40px] items-center">
                Explore Rankings <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>

          <UpcomingEvents />

          <PastTournaments limit={3} />

          <MemorialBanner />
        </div>
      </section>
    </div>
  );
}

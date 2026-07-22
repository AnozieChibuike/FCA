import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Swords, Trophy, Zap, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import fcaLogo from '../assets/logo.png';
import MemorialBanner from '../components/MemorialBanner';
import type { Profile } from '../types';

export default function Home() {
  const [stats, setStats] = useState({ totalPlayers: 0, totalGames: 0, topBlitz: null as Profile | null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: gameCount } = await supabase.from('games').select('*', { count: 'exact', head: true });
      const { data: topPlayer } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_immortal', false)
        .order('blitz_elo', { ascending: false })
        .limit(1)
        .maybeSingle();

      setStats({
        totalPlayers: count || 0,
        totalGames: gameCount || 0,
        topBlitz: topPlayer,
      });
      setLoading(false);
    }
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen">
      <section className="pt-28 pb-16 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Main Hero Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#262421] border border-chess-border text-white text-xs font-semibold mb-6 shadow-sm">
              <img src={fcaLogo} alt="FCA Logo" className="w-4 h-4 object-contain" />
              <span>Official FUTO Chess Association Platform</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-5 leading-tight">
              FUTO Chess Association
            </h1>
            <p className="text-text-muted text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Track your chess ratings across Blitz, Rapid, Bullet, and Classical formats.
              Compete with fellow students and claim your place on the campus leaderboards.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
            <div className="bg-surface border border-chess-border p-6 rounded-lg text-center shadow-card">
              <Users className="w-7 h-7 text-primary mx-auto mb-2.5" />
              <p className="text-3xl font-extrabold text-white mb-1">
                {loading ? '—' : stats.totalPlayers}
              </p>
              <p className="text-text-muted text-xs font-medium uppercase tracking-wider">Registered Players</p>
            </div>
            
            <div className="bg-surface border border-chess-border p-6 rounded-lg text-center shadow-card">
              <Swords className="w-7 h-7 text-primary mx-auto mb-2.5" />
              <p className="text-3xl font-extrabold text-white mb-1">
                {loading ? '—' : stats.totalGames}
              </p>
              <p className="text-text-muted text-xs font-medium uppercase tracking-wider">Official Games Played</p>
            </div>

            <div className="bg-surface border border-chess-border p-6 rounded-lg text-center shadow-card">
              <Trophy className="w-7 h-7 text-yellow-500 mx-auto mb-2.5" />
              <p className="text-3xl font-extrabold text-white mb-1">
                {loading ? '—' : stats.topBlitz?.blitz_elo || '—'}
              </p>
              <p className="text-text-muted text-xs font-medium uppercase tracking-wider">Top Blitz Elo</p>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
            <Link
              to="/login"
              className="bg-surface hover:bg-[#2E2B27] border border-chess-border hover:border-primary/50 p-7 rounded-lg transition-all duration-150 group flex flex-col justify-between shadow-card"
            >
              <div>
                <div className="w-10 h-10 rounded-md bg-[#161512] flex items-center justify-center mb-4 border border-chess-border">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Become an FCA Player</h3>
                <p className="text-text-muted text-sm leading-relaxed mb-6">
                  Register with your student details, link your Lichess or Chess.com profile, and start competing in official rating events.
                </p>
              </div>
              <span className="flex items-center gap-2 text-primary text-sm font-semibold group-hover:gap-3 transition-all duration-150">
                Get Started <ArrowRight className="w-4 h-4" />
              </span>
            </Link>

            <Link
              to="/leaderboards"
              className="bg-surface hover:bg-[#2E2B27] border border-chess-border hover:border-primary/50 p-7 rounded-lg transition-all duration-150 group flex flex-col justify-between shadow-card"
            >
              <div>
                <div className="w-10 h-10 rounded-md bg-[#161512] flex items-center justify-center mb-4 border border-chess-border">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">View Leaderboards</h3>
                <p className="text-text-muted text-sm leading-relaxed mb-6">
                  Check out current top rankings, filter by department or faculty, and see who dominates FUTO chess.
                </p>
              </div>
              <span className="flex items-center gap-2 text-primary text-sm font-semibold group-hover:gap-3 transition-all duration-150">
                Explore Rankings <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>

          <MemorialBanner />
        </div>
      </section>
    </div>
  );
}

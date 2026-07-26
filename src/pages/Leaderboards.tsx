import { useEffect, useState } from 'react';
import {
  Search, Star, User, Target, Zap, Clock, Flame, Shield,
  Trophy, Crown, Swords, Building, Filter, GraduationCap, UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { TITLE_CONFIG, MODE_LABELS, type Profile, type GameMode, type LeaderboardEntry } from '../types';

const MODES: GameMode[] = ['BLITZ', 'RAPID', 'BULLET', 'CLASSICAL'];

const MODE_ICONS: Record<GameMode, React.ReactNode> = {
  BLITZ: <Zap className="w-3.5 h-3.5 text-amber-400" />,
  RAPID: <Clock className="w-3.5 h-3.5 text-blue-400" />,
  BULLET: <Flame className="w-3.5 h-3.5 text-rose-500" />,
  CLASSICAL: <Shield className="w-3.5 h-3.5 text-emerald-400" />,
};

export default function Leaderboards() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [mode, setMode] = useState<GameMode>('BLITZ');
  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [genderFilter, setGenderFilter] = useState<'ALL' | 'FEMALE' | 'MALE' | 'ALUMNI' | 'STUDENT'>('ALL');

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('');

  const [departments, setDepartments] = useState<string[]>([]);
  const [faculties, setFaculties] = useState<string[]>([]);

  const [pendingScrollToMyRank, setPendingScrollToMyRank] = useState(false);

  const myEntry = players.find((e) => profile && e.player.id === profile.id);

  const jumpToMyPosition = () => {
    if (!profile) return;
    
    // Reset filters if active to ensure profile is in dataset
    if (searchQuery || departmentFilter || facultyFilter || genderFilter !== 'ALL') {
      setSearchQuery('');
      setDepartmentFilter('');
      setFacultyFilter('');
      setGenderFilter('ALL');
    }
    setPendingScrollToMyRank(true);
  };

  useEffect(() => {
    if (!loading && pendingScrollToMyRank && profile) {
      setPendingScrollToMyRank(false);
      const scrollToTarget = () => {
        const cardEl = document.getElementById(`leaderboard-card-${profile.id}`);
        const rowEl = document.getElementById(`leaderboard-row-${profile.id}`);
        
        // On mobile (<768px), prioritize card element; otherwise prioritize row element
        const isMobile = window.innerWidth < 768;
        const el = isMobile ? (cardEl || rowEl) : (rowEl || cardEl);

        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-[#161512]', 'transition-all');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-[#161512]');
          }, 2500);
        }
      };

      // Allow DOM to settle before scrolling
      requestAnimationFrame(() => {
        setTimeout(scrollToTarget, 150);
      });
    }
  }, [loading, pendingScrollToMyRank, profile]);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('status', 'APPROVED')
        .order('is_immortal', { ascending: false })
        .order(`${mode.toLowerCase()}_elo`, { ascending: false });

      if (genderFilter === 'FEMALE') {
        query = query.eq('gender', 'FEMALE');
      } else if (genderFilter === 'MALE') {
        query = query.eq('gender', 'MALE');
      } else if (genderFilter === 'ALUMNI') {
        query = query.eq('is_alumni', true);
      } else if (genderFilter === 'STUDENT') {
        query = query.eq('is_alumni', false);
      }

      if (departmentFilter) {
        query = query.eq('department', departmentFilter);
      }
      if (facultyFilter) {
        query = query.eq('faculty', facultyFilter);
      }
      if (searchQuery) {
        query = query.ilike('full_name', `%${searchQuery}%`);
      }

      const { data } = await query;

      if (data) {
        let immortalCount = 0;
        const entries: LeaderboardEntry[] = data.map((player: Profile, index: number) => {
          if (player.is_immortal) {
            immortalCount++;
          }
          return {
            rank: player.is_immortal ? 0 : index - immortalCount + 1,
            player,
            elo: player[`${mode.toLowerCase()}_elo` as keyof Profile] as number,
            games: player[`${mode.toLowerCase()}_games` as keyof Profile] as number,
            peak_elo: (player[`peak_${mode.toLowerCase()}_elo` as keyof Profile] as number) ?? (player[`${mode.toLowerCase()}_elo` as keyof Profile] as number),
          };
        });
        setPlayers(entries);
      }
      setLoading(false);
    }

    const timeoutId = setTimeout(() => {
      fetchLeaderboard();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [mode, genderFilter, departmentFilter, facultyFilter, searchQuery]);

  useEffect(() => {
    async function fetchFilters() {
      const { data } = await supabase.from('profiles').select('department, faculty').eq('status', 'APPROVED');
      if (data) {
        const uniqueDepts = [...new Set(data.map((p) => p.department).filter(Boolean))].sort();
        const uniqueFacs = [...new Set(data.map((p) => p.faculty).filter(Boolean))].sort();
        setDepartments(uniqueDepts);
        setFaculties(uniqueFacs);
      }
    }
    fetchFilters();
  }, []);

  const getRankBadge = (rank: number) => {
    if (rank === 0) return <Star className="w-4 h-4 text-purple-400 fill-purple-400 animate-pulse mx-auto" />;
    if (rank === 1) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 text-xs font-black mx-auto">1</span>;
    if (rank === 2) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/40 text-xs font-black mx-auto">2</span>;
    if (rank === 3) return <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-500 border border-amber-600/40 text-xs font-black mx-auto">3</span>;
    return <span className="text-text-muted font-bold text-xs">#{rank}</span>;
  };

  const getEloColorClass = (rank: number, isImmortal: boolean) => {
    if (isImmortal || rank === 0) {
      return 'text-purple-400 font-extrabold text-lg sm:text-xl drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]';
    }
    if (rank === 1) {
      return 'text-yellow-400 font-black text-xl sm:text-2xl drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]';
    }
    if (rank === 2) {
      return 'text-slate-200 font-black text-lg sm:text-xl drop-shadow-[0_0_8px_rgba(226,232,240,0.5)]';
    }
    if (rank === 3) {
      return 'text-amber-500 font-black text-lg sm:text-xl drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]';
    }
    return 'text-primary font-bold text-lg';
  };

  return (
    <div className="min-h-screen px-3 sm:px-6 pt-20 sm:pt-28 pb-12 sm:pb-16">
      <div className="max-w-6xl mx-auto">

        {/* Header Area */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-primary shrink-0" />
                <span>Global Rankings</span>
              </h1>
              {profile && (
                <button
                  onClick={jumpToMyPosition}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-primary/10 border border-primary/40 text-primary hover:bg-primary hover:text-black transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Scroll directly to your rank on the leaderboard"
                >
                  <Target className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {myEntry
                      ? myEntry.rank === 0
                        ? 'My Rank: Immortal ⭐'
                        : `My Rank: #${myEntry.rank}`
                      : profile.status === 'PENDING'
                      ? 'Rank: Pending Approval'
                      : 'Jump to My Rank'}
                  </span>
                </button>
              )}
            </div>
            <p className="text-text-muted text-xs sm:text-sm">Real-time Elo tracking across all verified FCA formats.</p>
          </div>

          {/* Game Modes Selector */}
          <div className="grid grid-cols-2 sm:flex bg-[#161512] border border-chess-border p-1 rounded-lg w-full sm:w-auto gap-1">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-md text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap min-h-[38px] flex items-center justify-center gap-1.5 select-none active:scale-95
                  ${mode === m
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted hover:text-white hover:bg-[#262421]'
                  }`}
              >
                {MODE_ICONS[m]}
                <span>{MODE_LABELS[m]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Category Tabs: General / Female Category / Male Category */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setGenderFilter('ALL')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2 select-none active:scale-95 shrink-0 ${
              genderFilter === 'ALL'
                ? 'bg-primary text-black shadow-md'
                : 'bg-surface text-text-muted border border-chess-border hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 shrink-0" />
            <span>General Leaderboard</span>
          </button>
          <button
            onClick={() => setGenderFilter('FEMALE')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2 select-none active:scale-95 shrink-0 ${
              genderFilter === 'FEMALE'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40'
                : 'bg-surface text-rose-300/80 border border-rose-900/40 hover:text-rose-300 hover:border-rose-600/60'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-rose-300 shrink-0" />
            <span>Female Category</span>
          </button>
          <button
            onClick={() => setGenderFilter('MALE')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2 select-none active:scale-95 shrink-0 ${
              genderFilter === 'MALE'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-900/40'
                : 'bg-surface text-sky-300/80 border border-sky-900/40 hover:text-sky-300 hover:border-sky-600/60'
            }`}
          >
            <Swords className="w-3.5 h-3.5 text-sky-300 shrink-0" />
            <span>Male Category</span>
          </button>
          <button
            onClick={() => setGenderFilter('STUDENT')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2 select-none active:scale-95 shrink-0 ${
              genderFilter === 'STUDENT'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-900/40'
                : 'bg-surface text-sky-300/80 border border-sky-900/40 hover:text-sky-300 hover:border-sky-600/60'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-sky-300 shrink-0" />
            <span>Student Category</span>
          </button>
          <button
            onClick={() => setGenderFilter('ALUMNI')}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2 select-none active:scale-95 shrink-0 ${
              genderFilter === 'ALUMNI'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                : 'bg-surface text-emerald-300/80 border border-emerald-900/40 hover:text-emerald-300 hover:border-emerald-600/60'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span>Alumni Category</span>
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col md:flex-row gap-2.5 sm:gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search player by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-chess-border rounded-md pl-10 pr-4 py-2.5 min-h-[42px] text-sm text-white
                         focus:outline-none focus:border-primary transition-colors placeholder:text-text-muted"
            />
          </div>

          <div className="flex flex-row gap-2.5 flex-1">
            <div className="flex-1 relative">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full bg-surface border border-chess-border rounded-md pl-8 pr-7 py-2.5 min-h-[42px] text-xs sm:text-sm text-white
                           focus:outline-none focus:border-primary transition-colors cursor-pointer appearance-none truncate"
              >
                <option value="">All Depts</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <Building className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted text-[10px]">
                ▼
              </div>
            </div>

            <div className="flex-1 relative">
              <select
                value={facultyFilter}
                onChange={(e) => setFacultyFilter(e.target.value)}
                className="w-full bg-surface border border-chess-border rounded-md pl-8 pr-7 py-2.5 min-h-[42px] text-xs sm:text-sm text-white
                           focus:outline-none focus:border-primary transition-colors cursor-pointer appearance-none truncate"
              >
                <option value="">All Faculties</option>
                {faculties.map((fac) => (
                  <option key={fac} value={fac}>{fac}</option>
                ))}
              </select>
              <Filter className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted text-[10px]">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Mobile View: Card List (< md) */}
        <div className="block md:hidden space-y-2.5 mb-6">
          {loading ? (
            <div className="p-10 text-center bg-surface border border-chess-border rounded-lg">
              <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            </div>
          ) : players.length === 0 ? (
            <div className="p-10 text-center text-text-muted bg-surface border border-chess-border rounded-lg text-sm">
              No players found for this filter.
            </div>
          ) : (
            players.map((entry) => {
              const player = entry.player;
              const isCurrentUser = profile?.id === player.id;
              const isImmortal = player.is_immortal || player.fca_id === 'FCA-ETERNAL';
              const activeTitleKey = isImmortal ? 'FET' : player.earned_title;
              const titleConfig = TITLE_CONFIG[activeTitleKey];

              const avatarUrl = isImmortal ? (player.avatar_url || '/chisom-howell.jpeg') : player.avatar_url;
              const department = isImmortal ? 'Software Eng.' : (player.department || '-');

              return (
                <div
                  key={player.id}
                  id={`leaderboard-card-${player.id}`}
                  onClick={() => navigate(`/profile/${player.id}`)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative active:scale-[0.99] ${
                    isCurrentUser
                      ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(234,179,8,0.15)] ring-1 ring-primary'
                      : 'bg-surface border-chess-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Rank + Avatar + Name */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-6 shrink-0 text-center">
                        {getRankBadge(entry.rank)}
                      </div>

                      <div className={`w-10 h-10 rounded-full overflow-hidden bg-[#161512] border shrink-0 flex items-center justify-center ${
                        isCurrentUser ? 'border-primary shadow-[0_0_8px_rgba(234,179,8,0.3)]' : 'border-chess-border'
                      }`}>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={player.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4.5 h-4.5 text-text-muted" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-white text-sm truncate max-w-[130px] sm:max-w-[200px]">
                            {player.full_name}
                          </span>
                          {isCurrentUser && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black tracking-wider bg-primary text-black uppercase font-mono shadow-sm">
                              YOU
                            </span>
                          )}
                          {player.is_alumni && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 inline-flex items-center gap-0.5 shadow-sm">
                              🎓 ALUMNI
                            </span>
                          )}
                          {activeTitleKey !== 'NONE' && (
                            <span className={`px-1.5 py-0.2 rounded text-[9px] tracking-wider font-extrabold ${titleConfig.bg}`}>
                              {titleConfig.tag}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted flex-wrap">
                          <span className="truncate max-w-[110px]">{department}</span>
                          <span>•</span>
                          {player.gender === 'FEMALE' ? (
                            <span className="text-[10px] font-bold text-rose-300 inline-flex items-center gap-0.5">♀ Female</span>
                          ) : player.gender === 'MALE' ? (
                            <span className="text-[10px] font-bold text-sky-300 inline-flex items-center gap-0.5">♂ Male</span>
                          ) : (
                            <span className="text-[10px] text-text-muted opacity-50">-</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Elo Rating */}
                    <div className="text-right shrink-0">
                      <div className={`tracking-tight ${getEloColorClass(entry.rank, isImmortal)}`}>
                        {isImmortal ? '3000+' : entry.elo}
                      </div>
                      <div className="text-[10px] text-text-muted font-medium font-mono">
                        {isImmortal ? '∞ games' : `${entry.games} games`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full 7-column Table (>= md) */}
        <div className="hidden md:block bg-surface border border-chess-border rounded-lg shadow-card overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-[#1E1C18] border-b border-chess-border text-text-muted text-xs uppercase tracking-wider font-semibold">
                  <th className="p-3 sm:p-4 w-14 text-center">Rank</th>
                  <th className="p-3 sm:p-4">Player</th>
                  <th className="p-4 text-center">Gender</th>
                  <th className="p-4 text-center">Platforms</th>
                  <th className="p-4">Dept / Faculty</th>
                  <th className="p-4 text-center">Games</th>
                  <th className="p-4 text-right">Rating (Elo)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-chess-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center">
                      <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : players.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-text-muted">
                      No players found for this filter.
                    </td>
                  </tr>
                ) : (
                  players.map((entry) => {
                    const player = entry.player;
                    const isCurrentUser = profile?.id === player.id;
                    const isImmortal = player.is_immortal || player.fca_id === 'FCA-ETERNAL';
                    const activeTitleKey = isImmortal ? 'FET' : player.earned_title;
                    const titleConfig = TITLE_CONFIG[activeTitleKey];

                    const avatarUrl = isImmortal ? (player.avatar_url || '/chisom-howell.jpeg') : player.avatar_url;
                    const department = isImmortal ? 'Software Engineering' : (player.department || '-');
                    const faculty = isImmortal ? 'SICT' : (player.faculty || '-');
                    const lichessUser = isImmortal ? (player.lichess_username || 'strengthofLSB') : player.lichess_username;

                    return (
                      <tr
                        key={player.id}
                        id={`leaderboard-row-${player.id}`}
                        className={`transition-colors cursor-pointer ${
                          isCurrentUser
                            ? 'bg-primary/15 hover:bg-primary/25 border-l-4 border-l-primary shadow-[0_0_15px_rgba(234,179,8,0.15)] relative font-medium'
                            : 'hover:bg-[#2E2B27]'
                        }`}
                        onClick={() => navigate(`/profile/${player.id}`)}
                      >
                        <td className="p-4 text-center align-middle">
                          <div className="flex justify-center">
                            {getRankBadge(entry.rank)}
                          </div>
                        </td>

                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full overflow-hidden bg-[#161512] border flex items-center justify-center flex-shrink-0 ${
                              isCurrentUser ? 'border-primary shadow-[0_0_8px_rgba(234,179,8,0.3)]' : 'border-chess-border'
                            }`}>
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={player.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 text-text-muted" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-white text-sm">{player.full_name}</span>
                                {isCurrentUser && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider bg-primary text-black uppercase font-mono shadow-md inline-flex items-center gap-1">
                                    YOU
                                  </span>
                                )}
                                {player.is_alumni && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 inline-flex items-center gap-1 shadow-sm">
                                    🎓 ALUMNI
                                  </span>
                                )}
                                {activeTitleKey !== 'NONE' && (
                                  <span className={`px-2 py-0.5 rounded text-[10px] tracking-wider ${titleConfig.bg}`}>
                                    {titleConfig.tag}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-text-muted">
                                {activeTitleKey !== 'NONE' ? titleConfig.label : 'Unrated Player'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 align-middle text-center">
                          {player.gender === 'FEMALE' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-950/90 text-rose-300 border border-rose-500/60 inline-flex items-center gap-1 shadow-sm">
                              ♀ Female
                            </span>
                          ) : player.gender === 'MALE' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-950/90 text-sky-300 border border-sky-500/60 inline-flex items-center gap-1 shadow-sm">
                              ♂ Male
                            </span>
                          ) : (
                            <span className="text-xs text-text-muted opacity-40">-</span>
                          )}
                        </td>

                        <td className="p-4 align-middle text-center">
                          <div className="flex items-center justify-center gap-2.5 text-text-muted">
                            {lichessUser && (
                              <svg viewBox='-2 -2 54 54' xmlns='http://www.w3.org/2000/svg' className="w-4 h-4"><path fill='currentColor' stroke='currentColor' strokeLinejoin='round'
                                d='M38.956.5c-3.53.418-6.452.902-9.286 2.984C5.534 1.786-.692 18.533.68 29.364 3.493 50.214 31.918 55.785 41.329 41.7c-7.444 7.696-19.276 8.752-28.323 3.084C3.959 39.116-.506 27.392 4.683 17.567 9.873 7.742 18.996 4.535 29.03 6.405c2.43-1.418 5.225-3.22 7.655-3.187l-1.694 4.86 12.752 21.37c-.439 5.654-5.459 6.112-5.459 6.112-.574-1.47-1.634-2.942-4.842-6.036-3.207-3.094-17.465-10.177-15.788-16.207-2.001 6.967 10.311 14.152 14.04 17.663 3.73 3.51 5.426 6.04 5.795 6.756 0 0 9.392-2.504 7.838-8.927L37.4 7.171z' /></svg>
                            )}
                            {player.chesscom_username && (
                              <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg" baseProfile="tiny-ps" version="1.2" className="w-4 h-4">
                                <g transform="translate(7.136 -.188)">
                                  <clipPath id="a"><path transform="matrix(1 0 0 -1 0 45)" d="M25.773 12.567c-7.338 5.595-6.523 10.45-6.616 12.447h4.474c.523.971.788 1.871.788 2.993l-5.072 3.341a7.011 7.011 0 0 1 2.912 5.691 7.029 7.029 0 0 1-4.393 6.517c-.814.33-6.56-18.542-6.56-18.542a41.217 41.217 0 0 1-.023-1.679c0-1.874 4.607-1.59 4.362-3.247-.368-2.476-.445-4.356-2.577-10.306-1.44-4.015-11.035 0-11.72-1.97C.87 6.44.616 4.901.616 3.245c0-.177.386-2.833 14.617-2.833 14.23 0 14.614 2.656 14.614 2.833 0 4.036-1.507 7.363-4.075 9.321" fillRule="evenodd" /></clipPath>
                                  <g clipPath="url(#a)"><path d="M -4.383 -3.56 L 34.847 -3.56 L 34.847 49.587 L -4.383 49.587 L -4.383 -3.56 Z" fill="#5D9948" /></g>
                                  <clipPath id="c"><path transform="matrix(1 0 0 -1 0 45)" d="M14.974 10.057c.79 3.6 1.493 7.437 1.92 9.734.532 2.868-3.821 3.38-5.608 3.644-.082-2.448-.765-6.424-6.593-10.867-1.572-1.2-2.743-2.91-3.418-4.982C2.848 6.819 4.949 6.36 8.184 6.36c2.077 0 5.923-.25 6.79 3.696" fillRule="evenodd" /></clipPath>
                                  <g clipPath="url(#c)"><path d="M -3.725 16.565 L 21.938 16.565 L 21.938 43.643 L -3.725 43.643 L -3.725 16.565 Z" fill="#81B64C" /></g>
                                  <clipPath id="e"><path transform="matrix(1 0 0 -1 0 45)" d="M18.03 25.014c.688 1.79.6 2.993.6 2.993l-2.873 3.341c3.054 1.304 4.893 3.755 4.893 6.61a7.013 7.013 0 0 1-2.766 5.59 7.027 7.027 0 0 1-9.679-6.508 7.014 7.014 0 0 1 2.912-5.692l-5.072-3.34c0-1.122.265-2.022.79-2.994H18.03Z" fillRule="evenodd" /></clipPath>
                                  <g clipPath="url(#e)"><path d="M 1.045 -4.066 L 25.65 -4.066 L 25.65 24.986 L 1.045 24.986 L 1.045 -4.066 Z" fill="#81B64C" /></g>
                                  <clipPath id="g"><path transform="matrix(1 0 0 -1 0 45)" d="M14.828 42.633c4.053-.629-1.863-5.33-3.73-5.108-1.777.21-.069 5.7 3.73 5.108" fillRule="evenodd" /></clipPath>
                                  <g clipPath="url(#g)"><path d="M 5.393 -2.678 L 21.218 -2.678 L 21.218 12.482 L 5.393 12.482 L 5.393 -2.678 Z" fill="#B2E068" /></g>
                                </g>
                              </svg>
                            )}
                            {!lichessUser && !player.chesscom_username && (
                              <span className="text-xs opacity-50">-</span>
                            )}
                          </div>
                        </td>

                        <td className="p-4 align-middle">
                          <span className="text-text-muted text-xs">
                            {department} / {faculty}
                          </span>
                        </td>

                        <td className="p-4 align-middle text-center">
                          <span className="text-text-muted font-semibold text-xs font-mono">
                            {isImmortal ? '∞' : entry.games}
                          </span>
                        </td>

                        <td className="p-4 align-middle text-right">
                          <span className={`tracking-tight ${getEloColorClass(entry.rank, isImmortal)}`}>
                            {isImmortal ? '3000+' : entry.elo}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-[#1E1C18] border-t border-chess-border p-3 px-4 flex items-center justify-between text-xs text-text-muted">
            <span>Showing verified active players</span>
            <span>Total: {players.length}</span>
          </div>
        </div>

        {/* Footer info for mobile */}
        <div className="block md:hidden text-center text-xs text-text-muted py-2">
          <span>Showing {players.length} verified players</span>
        </div>

      </div>
    </div>
  );
}

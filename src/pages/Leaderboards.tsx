import { useEffect, useState } from 'react';
import { Search, Star, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TITLE_CONFIG, MODE_LABELS, type Profile, type GameMode, type LeaderboardEntry } from '../types';

const MODES: GameMode[] = ['BLITZ', 'RAPID', 'BULLET', 'CLASSICAL'];

export default function Leaderboards() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<GameMode>('BLITZ');
  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('');

  const [departments, setDepartments] = useState<string[]>([]);
  const [faculties, setFaculties] = useState<string[]>([]);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('status', 'APPROVED')
        .order('is_immortal', { ascending: false })
        .order(`${mode.toLowerCase()}_elo`, { ascending: false });

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
            peak_elo: player[`${mode.toLowerCase()}_peak_elo` as keyof Profile] as number,
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
  }, [mode, departmentFilter, facultyFilter, searchQuery]);

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

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Star className="w-4 h-4 text-purple-400 fill-purple-400" />;
    if (rank === 1) return <span className="text-yellow-400 font-bold text-base">1</span>;
    if (rank === 2) return <span className="text-gray-300 font-bold text-base">2</span>;
    if (rank === 3) return <span className="text-amber-600 font-bold text-base">3</span>;
    return <span className="text-text-muted font-semibold text-sm">{rank}</span>;
  };

  return (
    <div className="min-h-screen px-4 md:px-6 pt-24 pb-16">
      <div className="max-w-6xl mx-auto">

        {/* Header Area */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Global Rankings</h1>
            <p className="text-text-muted text-sm">Real-time Elo tracking across all verified FCA formats.</p>
          </div>

          {/* Game Modes Segmented Selector */}
          <div className="flex bg-[#161512] border border-chess-border p-1 rounded-lg w-fit overflow-x-auto">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-2 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap
                  ${mode === m
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted hover:text-white hover:bg-[#262421]'
                  }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search player by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-chess-border rounded-md pl-10 pr-4 py-2.5 text-sm text-white
                         focus:outline-none focus:border-primary transition-colors placeholder:text-text-muted"
            />
          </div>

          <div className="flex-1 md:max-w-xs relative">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full bg-surface border border-chess-border rounded-md px-4 py-2.5 text-sm text-white
                         focus:outline-none focus:border-primary transition-colors cursor-pointer appearance-none"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
              ▼
            </div>
          </div>

          <div className="flex-1 md:max-w-xs relative">
            <select
              value={facultyFilter}
              onChange={(e) => setFacultyFilter(e.target.value)}
              className="w-full bg-surface border border-chess-border rounded-md px-4 py-2.5 text-sm text-white
                         focus:outline-none focus:border-primary transition-colors cursor-pointer appearance-none"
            >
              <option value="">All Faculties</option>
              {faculties.map((fac) => (
                <option key={fac} value={fac}>{fac}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
              ▼
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-surface border border-chess-border rounded-lg shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-[#1E1C18] border-b border-chess-border text-text-muted text-xs uppercase tracking-wider font-semibold">
                  <th className="p-4 w-16 text-center">Rank</th>
                  <th className="p-4">Player</th>
                  <th className="p-4 text-center">Platforms</th>
                  <th className="p-4">Dept / Faculty</th>
                  <th className="p-4 text-center">Games</th>
                  <th className="p-4 text-right">Rating (Elo)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-chess-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center">
                      <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : players.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-text-muted">
                      No players found for this filter.
                    </td>
                  </tr>
                ) : (
                  players.map((entry) => {
                    const player = entry.player;
                    const isImmortal = player.is_immortal;
                    const activeTitleKey = isImmortal ? 'FET' : player.earned_title;
                    const titleConfig = TITLE_CONFIG[activeTitleKey];

                    return (
                      <tr key={player.id} className="hover:bg-[#2E2B27] transition-colors cursor-pointer" onClick={() => navigate(`/profile/${player.id}`)}>
                        <td className="p-4 text-center align-middle">
                          <div className="flex justify-center">
                            {getRankIcon(entry.rank)}
                          </div>
                        </td>

                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-[#161512] border border-chess-border flex items-center justify-center flex-shrink-0">
                              {player.avatar_url ? (
                                <img src={player.avatar_url} alt={player.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 text-text-muted" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">{player.full_name}</span>
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
                          <div className="flex items-center justify-center gap-2.5 text-text-muted">
                            {player.lichess_username && (
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
                            {!player.lichess_username && !player.chesscom_username && (
                              <span className="text-xs opacity-50">-</span>
                            )}
                          </div>
                        </td>

                        <td className="p-4 align-middle">
                          <span className="text-text-muted text-xs">
                            {player.department || '-'} / {player.faculty || '-'}
                          </span>
                        </td>

                        <td className="p-4 align-middle text-center">
                          <span className="text-text-muted font-semibold text-xs font-mono">
                            {isImmortal ? '∞' : entry.games}
                          </span>
                        </td>

                        <td className="p-4 align-middle text-right">
                          <span className={`font-bold text-lg tracking-tight
                            ${isImmortal ? 'text-purple-400' : 'text-primary'}`}>
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

      </div>
    </div>
  );
}

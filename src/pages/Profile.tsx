import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  User, Edit3, Camera,
  AlertTriangle, History,
  Zap, Clock, Rocket, Landmark, TrendingUp, ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import {
  TITLE_CONFIG, MODE_LABELS,
  type Profile as ProfileType, type GameMode, type Game
} from '../types';
import PlayerStats from '../components/PlayerStats';
import { FUTO_FACULTIES } from '../data/futoData';
import { extractLichessGameId } from '../lib/lichess';

const MODES: GameMode[] = ['BLITZ', 'RAPID', 'BULLET', 'CLASSICAL'];
const MODE_ICONS: Record<GameMode, React.ReactNode> = {
  BLITZ: <Zap className="w-4 h-4 text-primary" />,
  RAPID: <Clock className="w-4 h-4 text-primary" />,
  BULLET: <Rocket className="w-4 h-4 text-primary" />,
  CLASSICAL: <Landmark className="w-4 h-4 text-primary" />
};

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { profile: authProfile, refreshProfile } = useAuth();
  const [player, setPlayer] = useState<ProfileType | null>(null);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    bio: '',
    phone: '',
    lichess_username: '',
    chesscom_username: '',
    department: '',
    faculty: '',
  });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = authProfile?.id === id;

  useEffect(() => {
    async function fetchProfile() {
      if (!id) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
      setPlayer(data);
      if (data) {
        setEditForm({
          full_name: data.full_name,
          bio: data.bio || '',
          phone: data.phone || '',
          lichess_username: data.lichess_username || '',
          chesscom_username: data.chesscom_username || '',
          department: data.department,
          faculty: data.faculty,
        });

        const { data: gamesData } = await supabase
          .from('games')
          .select(`
            *,
            white_player:profiles!white_player_id(id, full_name),
            black_player:profiles!black_player_id(id, full_name)
          `)
          .or(`white_player_id.eq.${id},black_player_id.eq.${id}`)
          .order('created_at', { ascending: false });

        if (gamesData) {
          setAllGames(gamesData as unknown as Game[]);
          setRecentGames(gamesData.slice(0, 10) as unknown as Game[]);
        }
      }
      setLoading(false);
    }
    fetchProfile();
  }, [id]);

  function startEditing() {
    if (!player) return;
    setEditForm({
      full_name: player.full_name,
      bio: player.bio || '',
      phone: player.phone || '',
      lichess_username: player.lichess_username || '',
      chesscom_username: player.chesscom_username || '',
      department: player.department,
      faculty: player.faculty,
    });
    setEditing(true);
  }

  async function saveProfile() {
    if (!player) return;
    setSaving(true);
    await supabase.from('profiles').update({
      full_name: editForm.full_name,
      bio: editForm.bio,
      phone: editForm.phone,
      lichess_username: editForm.lichess_username || null,
      chesscom_username: editForm.chesscom_username || null,
      department: editForm.department,
      faculty: editForm.faculty,
    }).eq('id', player.id);
    const { data } = await supabase.from('profiles').select('*').eq('id', player.id).single();
    setPlayer(data);
    setEditing(false);
    setSaving(false);
    if (isOwnProfile) await refreshProfile();
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !player) return;

    setAvatarUploading(true);
    try {
      // 1. Delete former avatar files in Supabase storage for this user
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(player.id);

      if (existingFiles && existingFiles.length > 0) {
        const filesToRemove = existingFiles.map((f) => `${player.id}/${f.name}`);
        await supabase.storage.from('avatars').remove(filesToRemove);
      }

      // 2. Upload new avatar image
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${player.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true, cacheControl: '3600' });

      if (uploadError) throw uploadError;

      // 3. Get public URL with timestamp cache buster
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // 4. Update profile in database
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', player.id);
      const { data } = await supabase.from('profiles').select('*').eq('id', player.id).single();
      setPlayer(data);
      if (isOwnProfile) await refreshProfile();
    } catch (err) {
      console.error('Failed to update avatar:', err);
    } finally {
      setAvatarUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="bg-surface border border-chess-border p-8 text-center max-w-md rounded-lg shadow-card">
          <User className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <h1 className="font-bold text-xl mb-2 text-white">Player Not Found</h1>
          <p className="text-text-muted text-sm">This profile does not exist.</p>
        </div>
      </div>
    );
  }

  const activeTitleKey = player.is_immortal ? 'FET' : player.earned_title;
  const titleConfig = TITLE_CONFIG[activeTitleKey];

  return (
    <div className="min-h-screen px-4 md:px-6 pt-24 pb-16">
      <div className="max-w-5xl mx-auto">

        {/* Profile Card Header */}
        <div className="bg-surface border border-chess-border p-6 md:p-8 rounded-lg shadow-card mb-8 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar Container */}
          <div className="relative group flex-shrink-0">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden bg-[#161512] border-2 border-chess-border flex items-center justify-center relative cursor-pointer"
              onClick={() => isOwnProfile && fileInputRef.current?.click()}>
              {avatarUploading ? (
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : player.avatar_url ? (
                <img src={player.avatar_url} alt={player.full_name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-14 h-14 text-text-muted" />
              )}
              {isOwnProfile && !avatarUploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              )}
            </div>

            {/* Title Badge */}
            {activeTitleKey !== 'NONE' && (
              <div className="absolute -bottom-1 -right-1">
                <span className={`px-2.5 py-0.5 rounded text-xs tracking-wider shadow-md ${titleConfig.bg}`}>
                  {titleConfig.tag}
                </span>
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </div>

          {/* Player Info Details */}
          <div className="flex-1 text-center md:text-left w-full">
            {editing ? (
              <div className="mb-4 space-y-3">
                <input
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="input-field text-2xl font-bold mb-2"
                />
                <div className="flex gap-2">
                  <select
                    value={editForm.faculty}
                    onChange={(e) => setEditForm({ ...editForm, faculty: e.target.value, department: '' })}
                    className="input-field text-xs w-1/2 cursor-pointer appearance-none"
                  >
                    <option value="">Select School/Faculty...</option>
                    {FUTO_FACULTIES.map((fac) => (
                      <option key={fac.code} value={fac.code}>{fac.code} - {fac.name}</option>
                    ))}
                  </select>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="input-field text-xs w-1/2 cursor-pointer appearance-none"
                    disabled={!editForm.faculty}
                  >
                    <option value="">{editForm.faculty ? 'Select Department...' : 'First Select Faculty...'}</option>
                    {FUTO_FACULTIES.find(f => f.code === editForm.faculty)?.departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row items-center gap-3 mb-1">
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white">{player.full_name}</h1>
                  {player.status === 'PENDING' && (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-800 text-xs font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5" /> Unverified
                    </span>
                  )}
                </div>
                <p className="text-text-muted text-sm mb-5">
                  {player.department} &bull; {player.faculty}
                </p>
              </>
            )}

            {/* Platform Accounts */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              {editing ? (
                <div className="flex gap-2 w-full max-w-md">
                  <input
                    value={editForm.lichess_username}
                    onChange={(e) => setEditForm({ ...editForm, lichess_username: e.target.value })}
                    className="input-field text-xs flex-1"
                    placeholder="Lichess Username"
                  />
                  <input
                    value={editForm.chesscom_username}
                    onChange={(e) => setEditForm({ ...editForm, chesscom_username: e.target.value })}
                    className="input-field text-xs flex-1"
                    placeholder="Chess.com Username"
                  />
                </div>
              ) : (
                <>
                  {player.lichess_username && (
                    <a href={`https://lichess.org/@/${player.lichess_username}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#161512] border border-chess-border hover:border-primary/50 transition-colors text-xs">
                      <svg viewBox='-2 -2 54 54' xmlns='http://www.w3.org/2000/svg' className="w-4 h-4 text-white"><path fill='currentColor' stroke='currentColor' strokeLinejoin='round' d='M38.956.5c-3.53.418-6.452.902-9.286 2.984C5.534 1.786-.692 18.533.68 29.364 3.493 50.214 31.918 55.785 41.329 41.7c-7.444 7.696-19.276 8.752-28.323 3.084C3.959 39.116-.506 27.392 4.683 17.567 9.873 7.742 18.996 4.535 29.03 6.405c2.43-1.418 5.225-3.22 7.655-3.187l-1.694 4.86 12.752 21.37c-.439 5.654-5.459 6.112-5.459 6.112-.574-1.47-1.634-2.942-4.842-6.036-3.207-3.094-17.465-10.177-15.788-16.207-2.001 6.967 10.311 14.152 14.04 17.663 3.73 3.51 5.426 6.04 5.795 6.756 0 0 9.392-2.504 7.838-8.927L37.4 7.171z' /></svg>
                      <span className="text-text-muted">Lichess:</span>
                      <span className="text-white font-medium">{player.lichess_username}</span>
                    </a>
                  )}
                  {player.chesscom_username && (
                    <a href={`https://chess.com/member/${player.chesscom_username}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#161512] border border-chess-border hover:border-primary/50 transition-colors text-xs">
                      <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg" baseProfile="tiny-ps" version="1.2" className="w-4 h-4">
                        <g transform="translate(7.136 -.188)">
                          <clipPath id="prof_a"><path transform="matrix(1 0 0 -1 0 45)" d="M25.773 12.567c-7.338 5.595-6.523 10.45-6.616 12.447h4.474c.523.971.788 1.871.788 2.993l-5.072 3.341a7.011 7.011 0 0 1 2.912 5.691 7.029 7.029 0 0 1-4.393 6.517c-.814.33-6.56-18.542-6.56-18.542a41.217 41.217 0 0 1-.023-1.679c0-1.874 4.607-1.59 4.362-3.247-.368-2.476-.445-4.356-2.577-10.306-1.44-4.015-11.035 0-11.72-1.97C.87 6.44.616 4.901.616 3.245c0-.177.386-2.833 14.617-2.833 14.23 0 14.614 2.656 14.614 2.833 0 4.036-1.507 7.363-4.075 9.321" fillRule="evenodd" /></clipPath>
                          <g clipPath="url(#prof_a)"><path d="M -4.383 -3.56 L 34.847 -3.56 L 34.847 49.587 L -4.383 49.587 L -4.383 -3.56 Z" fill="#5D9948" /></g>
                          <clipPath id="prof_c"><path transform="matrix(1 0 0 -1 0 45)" d="M14.974 10.057c.79 3.6 1.493 7.437 1.92 9.734.532 2.868-3.821 3.38-5.608 3.644-.082-2.448-.765-6.424-6.593-10.867-1.572-1.2-2.743-2.91-3.418-4.982C2.848 6.819 4.949 6.36 8.184 6.36c2.077 0 5.923-.25 6.79 3.696" fillRule="evenodd" /></clipPath>
                          <g clipPath="url(#prof_c)"><path d="M -3.725 16.565 L 21.938 16.565 L 21.938 43.643 L -3.725 43.643 L -3.725 16.565 Z" fill="#81B64C" /></g>
                          <clipPath id="prof_e"><path transform="matrix(1 0 0 -1 0 45)" d="M18.03 25.014c.688 1.79.6 2.993.6 2.993l-2.873 3.341c3.054 1.304 4.893 3.755 4.893 6.61a7.013 7.013 0 0 1-2.766 5.59 7.027 7.027 0 0 1-9.679-6.508 7.014 7.014 0 0 1 2.912-5.692l-5.072-3.34c0-1.122.265-2.022.79-2.994H18.03Z" fillRule="evenodd" /></clipPath>
                          <g clipPath="url(#prof_e)"><path d="M 1.045 -4.066 L 25.65 -4.066 L 25.65 24.986 L 1.045 24.986 L 1.045 -4.066 Z" fill="#81B64C" /></g>
                          <clipPath id="prof_g"><path transform="matrix(1 0 0 -1 0 45)" d="M14.828 42.633c4.053-.629-1.863-5.33-3.73-5.108-1.777.21-.069 5.7 3.73 5.108" fillRule="evenodd" /></clipPath>
                          <g clipPath="url(#prof_g)"><path d="M 5.393 -2.678 L 21.218 -2.678 L 21.218 12.482 L 5.393 12.482 L 5.393 -2.678 Z" fill="#B2E068" /></g>
                        </g>
                      </svg>
                      <span className="text-text-muted">Chess.com:</span>
                      <span className="text-white font-medium">{player.chesscom_username}</span>
                    </a>
                  )}
                </>
              )}
            </div>

            {/* Edit Actions */}
            {isOwnProfile && (
              <div className="mt-5 flex justify-center md:justify-start gap-3">
                {editing ? (
                  <>
                    <button onClick={saveProfile} disabled={saving} className="btn-primary py-2 px-5 text-xs">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button onClick={() => setEditing(false)} className="btn-secondary py-2 px-5 text-xs">Cancel</button>
                  </>
                ) : (
                  <button onClick={startEditing} className="btn-secondary py-2 px-4 text-xs flex items-center gap-2">
                    <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 4 Mode Ratings Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {MODES.map((mode) => {
            const elo = player[`${mode.toLowerCase()}_elo` as keyof ProfileType] as number;
            const peak = player[`${mode.toLowerCase()}_peak_elo` as keyof ProfileType] as number;
            const isPeakHigher = peak > elo;

            return (
              <div key={mode} className="bg-surface border border-chess-border p-5 rounded-lg shadow-card hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  {MODE_ICONS[mode]}
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{MODE_LABELS[mode]}</span>
                </div>
                <div className="text-3xl font-extrabold text-white mb-1">{elo}</div>
                <div className={`text-xs font-medium flex items-center gap-1 ${isPeakHigher ? 'text-primary' : 'text-text-muted'}`}>
                  {isPeakHigher ? <TrendingUp className="w-3 h-3" /> : <span className="w-3 text-center">-</span>}
                  Peak: {peak}
                </div>
              </div>
            );
          })}
        </div>

        {/* Super Stats Component */}
        {allGames.length > 0 && player && (
          <PlayerStats games={allGames} playerId={player.id} />
        )}

        {/* Match History Table */}
        <div className="mb-4 flex items-center gap-2.5">
          <History className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-extrabold text-white">Recent Match History</h2>
        </div>

        <div className="bg-surface border border-chess-border rounded-lg shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-[#1E1C18] border-b border-chess-border text-text-muted text-xs uppercase tracking-wider font-semibold">
                  <th className="p-4">Date</th>
                  <th className="p-4">White</th>
                  <th className="p-4">Black</th>
                  <th className="p-4 text-center">Result</th>
                  <th className="p-4 text-center">Elo Chg</th>
                  <th className="p-4">Event</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-chess-border">
                {recentGames.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-text-muted italic">
                      No recent games found.
                    </td>
                  </tr>
                ) : (
                  recentGames.map((game) => {
                    const isWhite = game.white_player_id === player.id;
                    const resultColor =
                      (isWhite && game.result === 1) || (!isWhite && game.result === 0) ? 'bg-primary/20 text-primary border border-primary/30' :
                        (isWhite && game.result === 0) || (!isWhite && game.result === 1) ? 'bg-red-950/50 text-red-400 border border-red-800' :
                          'bg-gray-800 text-gray-300 border border-gray-700';

                    const resultText = game.result === 1 ? '1 - 0' : game.result === 0 ? '0 - 1' : '½ - ½';

                    return (
                      <tr key={game.id} className="hover:bg-[#2E2B27] transition-colors">
                        <td className="p-4 text-text-muted text-xs font-mono">
                          {new Date(game.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className={`p-4 ${isWhite ? 'text-white font-bold' : 'text-text-muted'}`}>
                          {game.white_player?.full_name || 'Unknown'}
                        </td>
                        <td className={`p-4 ${!isWhite ? 'text-white font-bold' : 'text-text-muted'}`}>
                          {game.black_player?.full_name || 'Unknown'}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${resultColor}`}>
                            {resultText}
                          </span>
                        </td>
                        <td className="p-4 text-center text-text-muted font-mono text-xs">
                          -
                        </td>
                        <td className="p-4 text-text-muted text-xs flex items-center justify-between gap-2">
                          <span className="truncate max-w-[140px]">{game.event_name.replace(/\s*\[[a-zA-Z0-9]{8,12}\]/, '')}</span>
                          {(() => {
                            const gId = extractLichessGameId(game);
                            const lUrl = game.external_url || (gId ? `https://lichess.org/${gId}` : null);
                            return lUrl ? (
                              <a href={lUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-[11px] font-medium ml-2">
                                <span>Lichess</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : null;
                          })()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

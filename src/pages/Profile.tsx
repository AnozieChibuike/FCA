import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { calculateElo, getKFactor } from '../lib/elo';
import { type Profile as ProfileType, type Game } from '../types';
import PlayerStats from '../components/PlayerStats';
import ChesscomVerifyModal from '../components/ChesscomVerifyModal';

import ProfileHeader from '../components/profile/ProfileHeader';
import ModeRatingsGrid from '../components/profile/ModeRatingsGrid';
import MatchHistoryTable from '../components/profile/MatchHistoryTable';
import { LichessAccountModal, ChesscomAccountModal } from '../components/profile/AccountModals';

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { profile: authProfile, refreshProfile } = useAuth();
  const [player, setPlayer] = useState<ProfileType | null>(null);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [gamesPage, setGamesPage] = useState(1);
  const GAMES_PER_PAGE = 10;

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
  const [showLichessModal, setShowLichessModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showChesscomVerifyModal, setShowChesscomVerifyModal] = useState(false);
  const [showChesscomDetailModal, setShowChesscomDetailModal] = useState(false);
  const [disconnectingChesscom, setDisconnectingChesscom] = useState(false);

  const isOwnProfile = authProfile?.id === id;

  const enrichedGames = useMemo(() => {
    if (!player || allGames.length === 0) return [];

    const sorted = [...allGames].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const runningElo: Record<string, number> = {};
    const runningGamesCount: Record<string, number> = {};
    const runningPeak: Record<string, number> = {};

    const map = new Map<
      string,
      {
        eloBefore: number;
        eloAfter: number;
        eloDiff: number;
        oppEloBefore: number;
        oppEloAfter: number;
        peakElo: number;
      }
    >();

    for (const g of sorted) {
      const isWhite = g.white_player_id === player.id;
      const userId = player.id;
      const oppId = isWhite ? g.black_player_id : g.white_player_id;
      const modeKey = `${userId}_${g.mode}`;
      const oppModeKey = `${oppId}_${g.mode}`;

      const uElo = runningElo[modeKey] ?? 1200;
      const oElo = runningElo[oppModeKey] ?? 1200;

      const uGames = runningGamesCount[modeKey] ?? 0;
      const oGames = runningGamesCount[oppModeKey] ?? 0;

      const uPeak = runningPeak[modeKey] ?? uElo;

      const scoreU = isWhite ? g.result : 1 - g.result;

      const kU = getKFactor(uGames);
      const kO = getKFactor(oGames);

      const { newA: calcNewU, newB: calcNewO } = calculateElo(uElo, oElo, scoreU, kU, kO);

      const eloBefore = isWhite ? (g.white_elo_before ?? uElo) : (g.black_elo_before ?? uElo);
      const eloAfter = isWhite ? (g.white_elo_after ?? calcNewU) : (g.black_elo_after ?? calcNewU);
      const eloDiff = eloAfter - eloBefore;

      const oppEloBefore = isWhite ? (g.black_elo_before ?? oElo) : (g.white_elo_before ?? oElo);
      const oppEloAfter = isWhite ? (g.black_elo_after ?? calcNewO) : (g.white_elo_after ?? calcNewO);

      const nextPeak = Math.max(uPeak, eloAfter);

      map.set(g.id, {
        eloBefore,
        eloAfter,
        eloDiff,
        oppEloBefore,
        oppEloAfter,
        peakElo: nextPeak,
      });

      runningElo[modeKey] = eloAfter;
      runningGamesCount[modeKey] = uGames + 1;
      runningPeak[modeKey] = nextPeak;

      runningElo[oppModeKey] = oppEloAfter;
      runningGamesCount[oppModeKey] = oGames + 1;
      runningPeak[oppModeKey] = Math.max(runningPeak[oppModeKey] ?? oppEloBefore, oppEloAfter);
    }

    return allGames.map((g) => ({
      ...g,
      stats: map.get(g.id) || {
        eloBefore: 1200,
        eloAfter: 1200,
        eloDiff: 0,
        oppEloBefore: 1200,
        oppEloAfter: 1200,
        peakElo: 1200,
      },
    }));
  }, [allGames, player]);

  const totalGamesPages = Math.ceil(enrichedGames.length / GAMES_PER_PAGE) || 1;
  const currentGamesPage = Math.min(gamesPage, totalGamesPages);
  const startIndex = (currentGamesPage - 1) * GAMES_PER_PAGE;
  const paginatedGames = enrichedGames.slice(startIndex, startIndex + GAMES_PER_PAGE);

  useEffect(() => {
    async function fetchProfile() {
      if (!id) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
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
          setGamesPage(1);
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
    await supabase
      .from('profiles')
      .update({
        full_name: editForm.full_name,
        bio: editForm.bio,
        phone: editForm.phone,
        lichess_username: editForm.lichess_username || null,
        chesscom_username: editForm.chesscom_username || null,
        department: editForm.department,
        faculty: editForm.faculty,
      })
      .eq('id', player.id);

    const { data } = await supabase.from('profiles').select('*').eq('id', player.id).maybeSingle();
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
      const { data: existingFiles } = await supabase.storage.from('avatars').list(player.id);

      if (existingFiles && existingFiles.length > 0) {
        const filesToRemove = existingFiles.map((f) => `${player.id}/${f.name}`);
        await supabase.storage.from('avatars').remove(filesToRemove);
      }

      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${player.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true, cacheControl: '3600' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', player.id);
      const { data } = await supabase.from('profiles').select('*').eq('id', player.id).maybeSingle();
      setPlayer(data);
      if (isOwnProfile) await refreshProfile();
    } catch (err) {
      console.error('Failed to update avatar:', err);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleDisconnectLichess() {
    if (!player || !isOwnProfile) return;
    setDisconnecting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ lichess_username: null })
        .eq('id', player.id);

      if (error) throw error;

      setPlayer({ ...player, lichess_username: null });
      setShowLichessModal(false);
      await refreshProfile();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to disconnect account.');
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleDisconnectChesscom() {
    if (!player || !isOwnProfile) return;
    setDisconnectingChesscom(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ chesscom_username: null })
        .eq('id', player.id);

      if (error) throw error;

      setPlayer({ ...player, chesscom_username: null });
      setShowChesscomDetailModal(false);
      await refreshProfile();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to disconnect Chess.com account.');
    } finally {
      setDisconnectingChesscom(false);
    }
  }

  async function handleChesscomSuccess(username: string) {
    if (!player || !isOwnProfile) return;
    const { error } = await supabase
      .from('profiles')
      .update({ chesscom_username: username })
      .eq('id', player.id);

    if (!error) {
      setPlayer({ ...player, chesscom_username: username });
      await refreshProfile();
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

  const displayLichess = player.is_immortal || player.fca_id === 'FCA-ETERNAL'
    ? (player.lichess_username || 'strengthofLSB')
    : player.lichess_username;

  return (
    <div className="min-h-screen px-3 sm:px-6 pt-20 sm:pt-28 pb-12 sm:pb-16 max-w-5xl mx-auto">
      {/* Profile Header Component */}
      <ProfileHeader
        player={player}
        isOwnProfile={isOwnProfile}
        editing={editing}
        saving={saving}
        avatarUploading={avatarUploading}
        editForm={editForm}
        setEditForm={setEditForm}
        onStartEditing={startEditing}
        onSaveProfile={saveProfile}
        onCancelEditing={() => setEditing(false)}
        onAvatarUpload={handleAvatarUpload}
        onShowLichessModal={() => setShowLichessModal(true)}
        onShowChesscomVerifyModal={() => setShowChesscomVerifyModal(true)}
        onShowChesscomDetailModal={() => setShowChesscomDetailModal(true)}
      />

      {/* 4 Mode Ratings Grid */}
      <ModeRatingsGrid player={player} />

      {/* Super Stats Analytics */}
      {allGames.length > 0 && player && (
        <PlayerStats games={allGames} playerId={player.id} />
      )}

      {/* Match History Table & Cards */}
      <MatchHistoryTable
        player={player}
        allGames={allGames}
        paginatedGames={paginatedGames}
        currentGamesPage={currentGamesPage}
        totalGamesPages={totalGamesPages}
        startIndex={startIndex}
        gamesPerPage={GAMES_PER_PAGE}
        onPageChange={(page) => setGamesPage(page)}
      />

      {/* Lichess Account Interactive Popup Modal */}
      {showLichessModal && displayLichess && (
        <LichessAccountModal
          username={displayLichess}
          isOwnProfile={isOwnProfile}
          disconnecting={disconnecting}
          onClose={() => setShowLichessModal(false)}
          onDisconnect={handleDisconnectLichess}
        />
      )}

      {/* Chess.com Account Interactive Popup Modal */}
      {showChesscomDetailModal && player.chesscom_username && (
        <ChesscomAccountModal
          username={player.chesscom_username}
          isOwnProfile={isOwnProfile}
          disconnecting={disconnectingChesscom}
          onClose={() => setShowChesscomDetailModal(false)}
          onDisconnect={handleDisconnectChesscom}
        />
      )}

      {/* Chess.com Verification Modal */}
      {showChesscomVerifyModal && isOwnProfile && (
        <ChesscomVerifyModal
          isOpen={showChesscomVerifyModal}
          onClose={() => setShowChesscomVerifyModal(false)}
          onSuccess={handleChesscomSuccess}
        />
      )}
    </div>
  );
}

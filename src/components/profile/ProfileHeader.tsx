import React, { useRef } from 'react';
import { User, Edit3, Camera, ExternalLink, AlertTriangle } from 'lucide-react';
import { TITLE_CONFIG, type Profile as ProfileType } from '../../types';
import { FUTO_FACULTIES } from '../../data/futoData';
import { initiateLichessOAuth } from '../../lib/lichessOAuth';
import { LichessIcon } from './AccountModals';
import { ChesscomIcon } from '../ChesscomVerifyModal';

interface ProfileHeaderProps {
  player: ProfileType;
  isOwnProfile: boolean;
  editing: boolean;
  saving: boolean;
  avatarUploading: boolean;
  editForm: {
    full_name: string;
    bio: string;
    phone: string;
    gender: string;
    is_alumni: boolean;
    lichess_username: string;
    chesscom_username: string;
    department: string;
    faculty: string;
  };
  setEditForm: React.Dispatch<React.SetStateAction<{
    full_name: string;
    bio: string;
    phone: string;
    gender: string;
    is_alumni: boolean;
    lichess_username: string;
    chesscom_username: string;
    department: string;
    faculty: string;
  }>>;
  onStartEditing: () => void;
  onSaveProfile: () => void;
  onCancelEditing: () => void;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onShowLichessModal: () => void;
  onShowChesscomVerifyModal: () => void;
  onShowChesscomDetailModal: () => void;
}

export default function ProfileHeader({
  player,
  isOwnProfile,
  editing,
  saving,
  avatarUploading,
  editForm,
  setEditForm,
  onStartEditing,
  onSaveProfile,
  onCancelEditing,
  onAvatarUpload,
  onShowLichessModal,
  onShowChesscomVerifyModal,
  onShowChesscomDetailModal,
}: ProfileHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isImmortal = player.is_immortal || player.fca_id === 'FCA-ETERNAL';
  const activeTitleKey = isImmortal ? 'FET' : player.earned_title;
  const titleConfig = TITLE_CONFIG[activeTitleKey];

  const displayAvatar = isImmortal ? (player.avatar_url || '/chisom-howell.jpeg') : player.avatar_url;
  const displayDept = isImmortal ? (player.department && player.department !== 'FUTO Chess Association' ? player.department : 'Software Engineering') : player.department;
  const displayFaculty = isImmortal ? (player.faculty && player.faculty !== 'FUTO' ? player.faculty : 'SICT') : player.faculty;
  const displayBio = isImmortal
    ? (player.bio && !player.bio.includes('founder') ? player.bio : 'A notable and remarkably skilled chess player in FCA history. Remembered for his sharp tactical mind, competitive drive, and passion for chess. Forever in our hearts.')
    : player.bio;
  const displayLichess = isImmortal ? (player.lichess_username || 'strengthofLSB') : player.lichess_username;

  return (
    <div className="bg-surface border border-chess-border p-4 sm:p-6 md:p-8 rounded-lg shadow-card mb-6 sm:mb-8 flex flex-col md:flex-row items-center md:items-start gap-5 sm:gap-6">
      {/* Avatar Container */}
      <div className="relative group shrink-0">
        <div
          className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden bg-[#161512] border-2 border-chess-border flex items-center justify-center relative cursor-pointer"
          onClick={() => isOwnProfile && fileInputRef.current?.click()}
        >
          {avatarUploading ? (
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : displayAvatar ? (
            <img src={displayAvatar} alt={player.full_name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-12 h-12 sm:w-14 sm:h-14 text-text-muted" />
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
            <span className={`px-2 sm:px-2.5 py-0.5 rounded text-[10px] sm:text-xs tracking-wider shadow-md font-bold ${titleConfig.bg}`}>
              {titleConfig.tag}
            </span>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" onChange={onAvatarUpload} className="hidden" />
      </div>

      {/* Player Info Details */}
      <div className="flex-1 text-center md:text-left w-full min-w-0">
        {editing ? (
          <div className="mb-4 space-y-3">
            <input
              value={editForm.full_name}
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              className="input-field text-lg sm:text-2xl font-bold mb-2"
              placeholder="Full Name"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={editForm.faculty}
                onChange={(e) => setEditForm({ ...editForm, faculty: e.target.value, department: '' })}
                className="input-field text-xs w-full sm:w-1/3 cursor-pointer appearance-none"
              >
                <option value="">Select School/Faculty...</option>
                {FUTO_FACULTIES.map((fac) => (
                  <option key={fac.code} value={fac.code}>{fac.code} - {fac.name}</option>
                ))}
              </select>
              <select
                value={editForm.department}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                className="input-field text-xs w-full sm:w-1/3 cursor-pointer appearance-none"
                disabled={!editForm.faculty}
              >
                <option value="">{editForm.faculty ? 'Select Department...' : 'First Select Faculty...'}</option>
                {FUTO_FACULTIES.find(f => f.code === editForm.faculty)?.departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <select
                value={editForm.gender}
                onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                className="input-field text-xs w-full sm:w-1/3 cursor-pointer appearance-none"
              >
                <option value="">Gender (Unspecified)</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="edit_is_alumni"
                checked={editForm.is_alumni}
                onChange={(e) => setEditForm({ ...editForm, is_alumni: e.target.checked })}
                className="w-4 h-4 rounded bg-surface border-chess-border text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="edit_is_alumni" className="text-xs font-semibold text-white cursor-pointer select-none">
                🎓 FUTO Alumni Status
              </label>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="font-extrabold text-2xl sm:text-3xl text-white mb-1 flex items-center justify-center md:justify-start gap-2 flex-wrap">
              <span>{player.full_name}</span>
              {player.is_alumni && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 inline-flex items-center gap-1 shadow-sm">
                  🎓 Alumni
                </span>
              )}
              {player.gender === 'FEMALE' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-950/90 text-rose-300 border border-rose-500/60 inline-flex items-center gap-1 shadow-sm">
                  ♀ Female
                </span>
              )}
              {player.gender === 'MALE' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-sky-950/90 text-sky-300 border border-sky-500/60 inline-flex items-center gap-1 shadow-sm">
                  ♂ Male
                </span>
              )}
              {!player.gender && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#161512] text-amber-400/90 border border-amber-500/30 inline-flex items-center gap-1">
                  Gender: Unspecified
                </span>
              )}
            </h1>
            <p className="text-text-muted text-xs sm:text-sm mb-3 font-medium">
              {displayDept} · {displayFaculty}
            </p>

            {isOwnProfile && !player.gender && (
              <div className="mb-4 p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-sm">
                <div className="flex items-center gap-2 text-left">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Your gender is currently unset. Set your gender in profile settings to be ranked in category leaderboards.</span>
                </div>
                <button
                  type="button"
                  onClick={onStartEditing}
                  className="px-3 py-1 rounded bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-colors shrink-0 cursor-pointer shadow active:scale-95"
                >
                  Set Gender
                </button>
              </div>
            )}
          </div>
        )}

        {displayBio && !editing && (
          <p className="text-text-muted text-xs sm:text-sm leading-relaxed mb-4 max-w-2xl">{displayBio}</p>
        )}

        {/* Chess Handles */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-3 text-xs">
          {editing ? (
            <div className="w-full space-y-2">
              <input
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Short bio..."
                className="input-field text-xs"
              />
              <div className="p-3 rounded bg-[#161512] border border-chess-border text-xs text-left">
                <p className="text-text-muted mb-1 font-semibold">Lichess Verification</p>
                <p className="text-emerald-400 font-mono mb-2">
                  {displayLichess ? `@${displayLichess} (Verified)` : 'No Lichess Account Connected'}
                </p>
                <button
                  type="button"
                  onClick={() => initiateLichessOAuth(`/profile/${player.id}`)}
                  className="btn-secondary py-1.5 px-3 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {displayLichess ? 'Reconnect Lichess via OAuth' : 'Connect Lichess via OAuth'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 w-full">
              {displayLichess ? (
                <button
                  type="button"
                  onClick={onShowLichessModal}
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-[#161512] border border-chess-border text-white text-xs font-semibold shadow-sm hover:border-primary/60 transition-all cursor-pointer active:scale-95"
                  title="Click to view details or disconnect"
                >
                  <LichessIcon className="w-4 h-4 text-white shrink-0" />
                  <span>@{displayLichess}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => isOwnProfile && initiateLichessOAuth(`/profile/${player.id}`)}
                  className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-[#161512] border border-chess-border text-xs font-semibold transition-all shadow-sm ${
                    isOwnProfile ? 'hover:border-primary/60 hover:text-white cursor-pointer active:scale-95' : 'cursor-default'
                  }`}
                >
                  <LichessIcon className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-text-muted">
                    Lichess: <span className="text-amber-400 font-bold">Not Connected</span>
                  </span>
                </button>
              )}

              {player.chesscom_username ? (
                <button
                  type="button"
                  onClick={onShowChesscomDetailModal}
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-[#161512] border border-chess-border text-white text-xs font-semibold shadow-sm hover:border-primary/60 transition-all cursor-pointer active:scale-95"
                  title="Click to view details or disconnect"
                >
                  <ChesscomIcon className="w-4 h-4 shrink-0" />
                  <span>@{player.chesscom_username}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => isOwnProfile && onShowChesscomVerifyModal()}
                  className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-[#161512] border border-chess-border text-xs font-semibold transition-all shadow-sm ${
                    isOwnProfile ? 'hover:border-primary/60 hover:text-white cursor-pointer active:scale-95' : 'cursor-default'
                  }`}
                >
                  <ChesscomIcon className="w-4 h-4 opacity-50 shrink-0" />
                  <span className="text-text-muted">
                    Chess.com: <span className="text-amber-400 font-bold">Not Connected</span>
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Edit Actions */}
        {isOwnProfile && (
          <div className="mt-4 sm:mt-5 flex justify-center md:justify-start gap-3">
            {editing ? (
              <>
                <button onClick={onSaveProfile} disabled={saving} className="btn-primary py-2 px-5 text-xs">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={onCancelEditing} className="btn-secondary py-2 px-5 text-xs">
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={onStartEditing} className="btn-secondary py-2 px-4 text-xs flex items-center gap-2">
                <Edit3 className="w-3.5 h-3.5" /> Edit Profile
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

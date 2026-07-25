import { X, ExternalLink, LogOut } from 'lucide-react';
import { ChesscomIcon } from '../ChesscomVerifyModal';

export function LichessIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="-2 -2 54 54" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="currentColor"
        stroke="currentColor"
        strokeLinejoin="round"
        d="M38.956.5c-3.53.418-6.452.902-9.286 2.984C5.534 1.786-.692 18.533.68 29.364 3.493 50.214 31.918 55.785 41.329 41.7c-7.444 7.696-19.276 8.752-28.323 3.084C3.959 39.116-.506 27.392 4.683 17.567 9.873 7.742 18.996 4.535 29.03 6.405c2.43-1.418 5.225-3.22 7.655-3.187l-1.694 4.86 12.752 21.37c-.439 5.654-5.459 6.112-5.459 6.112-.574-1.47-1.634-2.942-4.842-6.036-3.207-3.094-17.465-10.177-15.788-16.207-2.001 6.967 10.311 14.152 14.04 17.663 3.73 3.51 5.426 6.04 5.795 6.756 0 0 9.392-2.504 7.838-8.927L37.4 7.171z"
      />
    </svg>
  );
}

interface LichessModalProps {
  username: string;
  isOwnProfile: boolean;
  disconnecting: boolean;
  onClose: () => void;
  onDisconnect: () => void;
}

export function LichessAccountModal({
  username,
  isOwnProfile,
  disconnecting,
  onClose,
  onDisconnect
}: LichessModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-card p-6 max-w-sm w-full border border-chess-border text-center shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-text-muted hover:text-white p-1 rounded-md cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-full bg-[#161512] border border-chess-border flex items-center justify-center mx-auto mb-3 shadow-lg">
          <LichessIcon className="w-7 h-7 text-white" />
        </div>

        <h3 className="font-heading text-lg text-white mb-0.5">Lichess Account</h3>
        <p className="text-white font-mono text-base font-bold mb-5">@{username}</p>

        <div className="space-y-2.5">
          <a
            href={`https://lichess.org/@/${username}`}
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
            className="w-full btn-primary py-3 text-xs font-bold flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            View Profile on Lichess.org
          </a>

          {isOwnProfile && (
            <button
              onClick={onDisconnect}
              disabled={disconnecting}
              className="w-full py-2.5 px-4 rounded-lg bg-red-950/80 border border-red-600/50 text-red-300 text-xs font-bold hover:bg-red-900 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              {disconnecting ? 'Disconnecting...' : 'Disconnect Lichess Account'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ChesscomModalProps {
  username: string;
  isOwnProfile: boolean;
  disconnecting: boolean;
  onClose: () => void;
  onDisconnect: () => void;
}

export function ChesscomAccountModal({
  username,
  isOwnProfile,
  disconnecting,
  onClose,
  onDisconnect
}: ChesscomModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-card p-6 max-w-sm w-full border border-chess-border text-center shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-text-muted hover:text-white p-1 rounded-md cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-full bg-[#161512] border border-chess-border flex items-center justify-center mx-auto mb-3 shadow-lg">
          <ChesscomIcon className="w-7 h-7" />
        </div>

        <h3 className="font-heading text-lg text-white mb-0.5">Chess.com Account</h3>
        <p className="text-white font-mono text-base font-bold mb-5">@{username}</p>

        <div className="space-y-2.5">
          <a
            href={`https://chess.com/member/${username}`}
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
            className="w-full btn-primary py-3 text-xs font-bold flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            View Profile on Chess.com
          </a>

          {isOwnProfile && (
            <button
              onClick={onDisconnect}
              disabled={disconnecting}
              className="w-full py-2.5 px-4 rounded-lg bg-red-950/80 border border-red-600/50 text-red-300 text-xs font-bold hover:bg-red-900 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              {disconnecting ? 'Disconnecting...' : 'Disconnect Chess.com Account'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

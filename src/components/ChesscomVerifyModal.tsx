import { useState, useEffect } from 'react';
import {
  X, CheckCircle, ExternalLink, Copy, Check, Loader2, AlertTriangle, ShieldCheck
} from 'lucide-react';
import {
  generateChesscomVerificationCode,
  verifyChesscomOwnership,
  type ChesscomPlayer
} from '../lib/chesscom';

interface ChesscomVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (username: string) => Promise<void> | void;
  initialUsername?: string | null;
}

export const ChesscomIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(7.136 -.188)">
      <clipPath id="ch_a">
        <path transform="matrix(1 0 0 -1 0 45)" d="M25.773 12.567c-7.338 5.595-6.523 10.45-6.616 12.447h4.474c.523.971.788 1.871.788 2.993l-5.072 3.341a7.011 7.011 0 0 1 2.912 5.691 7.029 7.029 0 0 1-4.393 6.517c-.814.33-6.56-18.542-6.56-18.542a41.217 41.217 0 0 1-.023-1.679c0-1.874 4.607-1.59 4.362-3.247-.368-2.476-.445-4.356-2.577-10.306-1.44-4.015-11.035 0-11.72-1.97C.87 6.44.616 4.901.616 3.245c0-.177.386-2.833 14.617-2.833 14.23 0 14.614 2.656 14.614 2.833 0 4.036-1.507 7.363-4.075 9.321" fillRule="evenodd" />
      </clipPath>
      <g clipPath="url(#ch_a)"><path d="M -4.383 -3.56 L 34.847 -3.56 L 34.847 49.587 L -4.383 49.587 L -4.383 -3.56 Z" fill="#5D9948" /></g>
      <clipPath id="ch_c">
        <path transform="matrix(1 0 0 -1 0 45)" d="M14.974 10.057c.79 3.6 1.493 7.437 1.92 9.734.532 2.868-3.821 3.38-5.608 3.644-.082-2.448-.765-6.424-6.593-10.867-1.572-1.2-2.743-2.91-3.418-4.982C2.848 6.819 4.949 6.36 8.184 6.36c2.077 0 5.923-.25 6.79 3.696" fillRule="evenodd" />
      </clipPath>
      <g clipPath="url(#ch_c)"><path d="M -3.725 16.565 L 21.938 16.565 L 21.938 43.643 L -3.725 43.643 L -3.725 16.565 Z" fill="#81B64C" /></g>
      <clipPath id="ch_e">
        <path transform="matrix(1 0 0 -1 0 45)" d="M18.03 25.014c.688 1.79.6 2.993.6 2.993l-2.873 3.341c3.054 1.304 4.893 3.755 4.893 6.61a7.013 7.013 0 0 1-2.766 5.59 7.027 7.027 0 0 1-9.679-6.508 7.014 7.014 0 0 1 2.912-5.692l-5.072-3.34c0-1.122.265-2.022.79-2.994H18.03Z" fillRule="evenodd" />
      </clipPath>
      <g clipPath="url(#ch_e)"><path d="M 1.045 -4.066 L 25.65 -4.066 L 25.65 24.986 L 1.045 24.986 L 1.045 -4.066 Z" fill="#81B64C" /></g>
      <clipPath id="ch_g">
        <path transform="matrix(1 0 0 -1 0 45)" d="M14.828 42.633c4.053-.629-1.863-5.33-3.73-5.108-1.777.21-.069 5.7 3.73 5.108" fillRule="evenodd" />
      </clipPath>
      <g clipPath="url(#ch_g)"><path d="M 5.393 -2.678 L 21.218 -2.678 L 21.218 12.482 L 5.393 12.482 L 5.393 -2.678 Z" fill="#B2E068" /></g>
    </g>
  </svg>
);

export default function ChesscomVerifyModal({
  isOpen,
  onClose,
  onSuccess,
  initialUsername = '',
}: ChesscomVerifyModalProps) {
  const [username, setUsername] = useState(initialUsername || '');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifiedPlayer, setVerifiedPlayer] = useState<ChesscomPlayer | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCode(generateChesscomVerificationCode());
      setError('');
      setVerifiedPlayer(null);
      if (initialUsername) setUsername(initialUsername);
    }
  }, [isOpen, initialUsername]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyCode = async () => {
    if (!username.trim()) {
      setError('Please enter your Chess.com username.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await verifyChesscomOwnership(username, code);
      if (res.verified) {
        setVerifiedPlayer(res.player);
        await onSuccess(res.player.username);
        setTimeout(() => onClose(), 1200);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="glass-card p-6 sm:p-7 max-w-md w-full border border-chess-border shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-white p-1 rounded-md cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-[#161512] border border-chess-border flex items-center justify-center flex-shrink-0">
            <ChesscomIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading text-lg text-white">Verify Chess.com Ownership</h3>
            <p className="text-text-muted text-xs">Confirm ownership of your official Chess.com account</p>
          </div>
        </div>

        {/* Form Body */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">
              Chess.com Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Hikaru"
              className="input-field text-sm"
              disabled={loading || !!verifiedPlayer}
            />
          </div>

          <div className="space-y-3.5 bg-[#161512] p-4 rounded-lg border border-chess-border text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted font-semibold">Your Verification Code:</span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-primary hover:underline font-bold cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="p-2.5 rounded bg-surface border border-chess-border text-center font-mono text-base font-bold tracking-wider text-white select-all">
              {code}
            </div>

            <ol className="list-decimal list-inside space-y-1.5 text-text-muted leading-relaxed">
              <li>Copy the verification code above.</li>
              <li>
                Open your{' '}
                <a
                  href="https://www.chess.com/settings/profile"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5"
                >
                  Chess.com Profile Settings <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Paste code into your <strong>Location</strong> or <strong>Bio</strong> field and click Save.</li>
              <li>Click <strong>Verify Ownership</strong> below.</li>
            </ol>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-cta text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-cta flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {verifiedPlayer && (
            <div className="p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-white">Verified Chess.com Player!</p>
                <p className="font-mono">@{verifiedPlayer.username}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-surface border border-chess-border text-text-muted text-xs font-semibold hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleVerifyCode}
              disabled={loading || !!verifiedPlayer}
              className="flex-1 btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              Verify Ownership
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

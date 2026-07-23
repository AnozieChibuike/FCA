import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleLichessOAuthCallback } from '../lib/lichessOAuth';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function LichessCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying Lichess authentication...');
  const isProcessing = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setStatus('error');
      setMessage(`Lichess authorization denied: ${searchParams.get('error_description') || errorParam}`);
      return;
    }

    if (!code || !state) {
      // If already processed once, do not show error on re-render
      if (isProcessing.current) return;
      setStatus('error');
      setMessage('Missing authorization code or state. Please try connecting again.');
      return;
    }

    if (isProcessing.current) return;
    isProcessing.current = true;

    async function processOAuth() {
      try {
        const result = await handleLichessOAuthCallback(code!, state!);

        // Clean the URL query params after token exchange completes successfully
        window.history.replaceState({}, document.title, window.location.pathname);

        // Fetch session to check current user if profile hasn't loaded yet
        const { data: sessionData } = await supabase.auth.getSession();
        const currentUserId = sessionData?.session?.user?.id || profile?.id;

        if (currentUserId) {
          const { error: updateErr } = await supabase
            .from('profiles')
            .update({ lichess_username: result.username })
            .eq('id', currentUserId);

          if (updateErr) {
            throw new Error(`Failed to update profile: ${updateErr.message}`);
          }
          await refreshProfile();
        } else {
          // Store pending verified username for new registration flow
          sessionStorage.setItem('fca_pending_lichess_username', result.username);
        }

        setStatus('success');
        setMessage(`Successfully verified Lichess account: @${result.username}`);

        setTimeout(() => {
          const dest = result.returnPath || (currentUserId ? `/profile/${currentUserId}` : '/join');
          window.location.href = dest;
        }, 800);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Failed to complete Lichess verification.');
      }
    }

    processOAuth();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-24 pb-12">
      <div className="glass-card p-8 rounded-lg shadow-card w-full max-w-md text-center">
        {status === 'loading' && (
          <div>
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Connecting Lichess Account</h2>
            <p className="text-text-muted text-sm">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Verification Successful!</h2>
            <p className="text-emerald-400 text-sm font-medium mb-4">{message}</p>
            <p className="text-text-muted text-xs">Redirecting you back...</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <AlertTriangle className="w-12 h-12 text-cta mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Verification Failed</h2>
            <p className="text-cta text-sm mb-6">{message}</p>
            <button
              onClick={() => navigate('/profile')}
              className="btn-primary w-full text-sm font-bold py-2.5"
            >
              Return to Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

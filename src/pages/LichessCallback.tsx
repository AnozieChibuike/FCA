import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { handleLichessOAuthCallback, initiateLichessOAuth, stashPendingLichess } from '../lib/lichessOAuth';
import { linkLichessToken } from '../lib/onboarding';
import { LichessIcon } from '../components/ui/icons';
import { Card, Spinner } from '../components/ui/misc';

type State =
  | { kind: 'working'; text: string }
  | { kind: 'linked'; username: string; missing: number; back: string }
  | { kind: 'needs-account'; username: string }
  | { kind: 'error'; text: string };

export default function LichessCallback() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [state, setState] = useState<State>({ kind: 'working', text: 'Checking your Lichess sign-in…' });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get('error')) {
      setState({ kind: 'error', text: params.get('error_description') || 'Lichess access was denied.' });
      return;
    }
    (async () => {
      try {
        const result = await handleLichessOAuthCallback();
        window.history.replaceState({}, document.title, window.location.pathname);
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          stashPendingLichess(result.token, result.username);
          setState({ kind: 'needs-account', username: result.username });
          return;
        }
        setState({ kind: 'working', text: `Linking @${result.username} to your FCA account…` });
        const linked = await linkLichessToken(result.token);
        await refreshProfile();
        setState({ kind: 'linked', username: linked.username, missing: linked.missingGames, back: result.returnPath });
      } catch (e) {
        setState({ kind: 'error', text: e instanceof Error ? e.message : 'Could not connect Lichess.' });
      }
    })();
  }, [refreshProfile]);

  return (
    <div className="page flex max-w-md flex-col py-10">
      <Card className="p-6 text-center">
        {state.kind === 'working' && (
          <>
            <Spinner className="mx-auto h-10 w-10" />
            <p className="mt-4 text-sm text-text-muted">{state.text}</p>
          </>
        )}
        {state.kind === 'linked' && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <h1 className="mt-3 text-xl font-extrabold text-white">Lichess connected</h1>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-white"><LichessIcon className="h-4 w-4" /> @{state.username}</p>
            <p className="mt-3 text-sm text-text-muted">
              {state.missing > 0
                ? `We found ${state.missing} past FCA arena game${state.missing === 1 ? '' : 's'} you played. An arbiter will approve them and your rating will update.`
                : 'Your next Titled Tuesday games will be rated automatically.'}
            </p>
            <button onClick={() => navigate(state.back || '/profile')} className="btn-primary mt-5 w-full">Continue</button>
          </>
        )}
        {state.kind === 'needs-account' && (
          <>
            <LichessIcon className="mx-auto h-12 w-12 text-white" />
            <h1 className="mt-3 text-xl font-extrabold text-white">@{state.username} verified</h1>
            <p className="mt-2 text-sm text-text-muted">Create your FCA account (or sign in) and we'll link this Lichess account automatically.</p>
            <div className="mt-5 space-y-2">
              <Link to="/join" className="btn-primary w-full">Create my FCA account</Link>
              <Link to="/login" className="btn-secondary w-full">I already have an account</Link>
            </div>
          </>
        )}
        {state.kind === 'error' && (
          <>
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-400" />
            <h1 className="mt-3 text-xl font-extrabold text-white">Couldn't connect Lichess</h1>
            <p className="mt-2 text-sm text-text-muted">{state.text}</p>
            <div className="mt-5 space-y-2">
              <button onClick={() => initiateLichessOAuth('/profile')} className="btn-primary w-full">Try again</button>
              <Link to="/profile" className="btn-secondary w-full">Back to my profile</Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

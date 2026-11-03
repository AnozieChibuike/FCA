import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, AlertTriangle, LogIn, Mail } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { linkPendingLichess } from '../lib/onboarding';
import { Card, Spinner } from '../components/ui/misc';
import Sheet from '../components/ui/Sheet';
import { useToast } from '../components/ui/Toast';
import fcaLogo from '../assets/logo-128.png';

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const next = params.get('next');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error: err } = await signIn(email, password);
    if (err) {
      setBusy(false);
      setError(/invalid/i.test(err.message) ? 'Wrong email or password.' : err.message);
      return;
    }
    try {
      const linked = await linkPendingLichess();
      if (linked) toast(`Lichess @${linked.username} connected`);
    } catch (e2) {
      toast(e2 instanceof Error ? e2.message : 'Could not link Lichess', 'error');
    }
    setBusy(false);
    navigate(next && next.startsWith('/') ? next : '/');
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    await supabase.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setResetSent(true);
  }

  return (
    <div className="page flex max-w-md flex-col py-8">
      <div className="mb-6 text-center">
        <img src={fcaLogo} alt="" className="mx-auto mb-3 h-12 w-12 object-contain" />
        <h1 className="text-2xl font-extrabold text-white">Welcome back</h1>
        <p className="mt-1 text-sm text-text-muted">Sign in to your FCA account</p>
      </div>
      <Card className="p-4 sm:p-6">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="field-label">Email</span>
            <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoCapitalize="none" required />
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted">Password</span>
              <button type="button" onClick={() => { setResetEmail(email); setResetSent(false); setForgotOpen(true); }} className="text-xs font-semibold text-primary">Forgot password?</button>
            </span>
            <span className="relative block">
              <input className="input-field !pr-12" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-text-muted" aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>
          <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? <Spinner className="h-4 w-4" /> : <><LogIn className="h-4 w-4" /> Sign in</>}</button>
        </form>
      </Card>
      <p className="mt-5 text-center text-sm text-text-muted">
        New to FCA? <Link to="/join" className="font-semibold text-primary">Create an account</Link>
      </p>

      <Sheet open={forgotOpen} onClose={() => setForgotOpen(false)} title="Reset your password">
        {resetSent ? (
          <div className="space-y-3 text-sm">
            <p className="flex items-start gap-2 text-white"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> If an account exists for {resetEmail}, a reset link is on its way. Check spam too.</p>
            <p className="text-text-muted">No email after a few minutes? Message an FCA admin on WhatsApp — they can send you a reset link directly from the console.</p>
          </div>
        ) : (
          <form onSubmit={sendReset} className="space-y-4">
            <label className="block">
              <span className="field-label">Your account email</span>
              <input className="input-field" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required autoCapitalize="none" />
            </label>
            <button className="btn-primary w-full" type="submit">Send reset link</button>
          </form>
        )}
      </Sheet>
    </div>
  );
}

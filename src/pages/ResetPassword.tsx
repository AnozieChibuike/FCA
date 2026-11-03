import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, AlertTriangle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Card, PageLoader, Spinner } from '../components/ui/misc';
import { useToast } from '../components/ui/Toast';

export default function ResetPassword() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(err.message);
    toast('Password updated');
    navigate('/profile');
  }

  if (loading) return <PageLoader />;

  return (
    <div className="page flex max-w-md flex-col py-8">
      <Card className="p-5 sm:p-6">
        <KeyRound className="h-8 w-8 text-primary" />
        <h1 className="mt-3 text-xl font-extrabold text-white">Choose a new password</h1>
        {!session ? (
          <div className="mt-3 space-y-3 text-sm">
            <p className="flex items-start gap-2 text-rose-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> This reset link is invalid or has expired.</p>
            <p className="text-text-muted">Request a new one from the sign-in page, or ask an FCA admin to send you a fresh link.</p>
            <Link to="/login" className="btn-secondary w-full">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            {error && <p className="text-sm text-rose-300">{error}</p>}
            <label className="block">
              <span className="field-label">New password</span>
              <input className="input-field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </label>
            <label className="block">
              <span className="field-label">Confirm new password</span>
              <input className="input-field" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </label>
            <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? <Spinner className="h-4 w-4" /> : 'Save password'}</button>
          </form>
        )}
      </Card>
    </div>
  );
}

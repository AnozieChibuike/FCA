import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck, AlertTriangle, CheckCircle2, Gift } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { FUTO_FACULTIES } from '../data/futoData';
import { readPendingLichess } from '../lib/lichessOAuth';
import { clearReferral, linkPendingLichess, rememberReferral, storedReferral } from '../lib/onboarding';
import { LichessIcon } from '../components/ui/icons';
import { Card, PageLoader, Spinner } from '../components/ui/misc';
import { useToast } from '../components/ui/Toast';
import fcaLogo from '../assets/logo-128.png';

interface InviteInfo { role: 'ADMIN' | 'ARBITER'; valid: boolean; reason: string | null }

export default function Join() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { profile, loading, signUp, refreshProfile } = useAuth();
  const inviteToken = params.get('invite');
  const [invite, setInvite] = useState<InviteInfo | null | 'missing'>(null);
  const [referrer, setReferrer] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const pendingLichess = readPendingLichess();
  const [form, setForm] = useState({
    full_name: '', faculty: '', department: '', reg_number: '', gender: '', is_alumni: false, phone: '',
    email: '', password: '', confirm: '',
  });

  useEffect(() => {
    rememberReferral(params.get('ref'));
    const code = storedReferral();
    if (code) {
      supabase.from('profiles').select('full_name').eq('fca_id', code).maybeSingle().then(({ data }) => setReferrer(data?.full_name ?? null));
    }
  }, [params]);

  useEffect(() => {
    if (!inviteToken) return;
    supabase.rpc('get_invite', { p_token: inviteToken }).then(({ data, error: e }) => {
      const row = Array.isArray(data) ? data[0] : data;
      setInvite(e || !row ? 'missing' : (row as InviteInfo));
    });
  }, [inviteToken]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value });
  const faculty = FUTO_FACULTIES.find((f) => f.code === form.faculty);

  async function acceptInvite() {
    if (!inviteToken) return;
    setBusy(true);
    const { data, error: e } = await supabase.rpc('redeem_invite', { p_token: inviteToken });
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }
    await refreshProfile();
    toast(`You're now an FCA ${String(data).toLowerCase()}`);
    navigate('/admin');
  }

  function next(e: React.FormEvent) {
    e.preventDefault();
    if (form.full_name.trim().split(/\s+/).length < 2) return setError('Please enter your full name (first and last).');
    if (!form.faculty || !form.department) return setError('Pick your faculty and department.');
    if (!form.is_alumni && form.reg_number.trim().length < 5) return setError('Enter your registration number.');
    setError('');
    setStep(2);
    window.scrollTo({ top: 0 });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError('Enter a valid email address.');
    if (form.password.length < 8) return setError('Use at least 8 characters for your password.');
    if (form.password !== form.confirm) return setError("Passwords don't match.");
    setError('');
    setBusy(true);
    const { error: e2 } = await signUp(form.email, form.password, {
      full_name: form.full_name.trim(),
      faculty: form.faculty,
      department: form.department,
      reg_number: form.reg_number.trim() || (form.is_alumni ? 'ALUMNI' : 'N/A'),
      gender: form.gender || null,
      is_alumni: form.is_alumni,
      phone: form.phone.trim() || null,
      invite_token: inviteToken && invite && invite !== 'missing' && invite.valid ? inviteToken : null,
      ref: storedReferral(),
    });
    if (e2) {
      setBusy(false);
      setError(/registered|already/i.test(e2.message) ? 'This email already has an account. Sign in instead.' : e2.message);
      return;
    }
    clearReferral();
    try {
      const linked = await linkPendingLichess();
      if (linked) toast(`Lichess @${linked.username} connected`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not link Lichess — try again from your profile', 'error');
    }
    await refreshProfile();
    setBusy(false);
    navigate('/welcome');
  }

  if (loading) return <PageLoader />;

  // Signed-in visitors: accept an invite, or they're already in.
  if (profile) {
    return (
      <div className="page flex max-w-md flex-col items-center py-10 text-center">
        {inviteToken && invite && invite !== 'missing' && invite.valid ? (
          <Card className="w-full p-6">
            <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-3 text-xl font-extrabold text-white">Become an FCA {invite.role === 'ADMIN' ? 'admin' : 'arbiter'}</h1>
            <p className="mt-1 text-sm text-text-muted">You're signed in as {profile.full_name}. Accept to get {invite.role === 'ADMIN' ? 'admin' : 'arbiter'} access on this account.</p>
            {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
            <button onClick={acceptInvite} disabled={busy} className="btn-primary mt-5 w-full">{busy ? <Spinner className="h-4 w-4" /> : 'Accept invite'}</button>
          </Card>
        ) : (
          <Card className="w-full p-6">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-3 text-xl font-extrabold text-white">You're already a member</h1>
            {inviteToken && <p className="mt-1 text-sm text-rose-300">This invite link {invite === 'missing' ? 'is not valid' : invite && !invite.valid ? `is ${invite.reason}` : 'could not be checked'}.</p>}
            <Link to={`/profile/${profile.id}`} className="btn-primary mt-5 w-full">Go to my profile</Link>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="page max-w-lg py-6">
      <div className="mb-6 text-center">
        <img src={fcaLogo} alt="" className="mx-auto mb-3 h-12 w-12 object-contain" />
        <h1 className="text-2xl font-extrabold text-white">Join FCA Rated</h1>
        <p className="mt-1 text-sm text-text-muted">Free for FUTO students and alumni. Takes about a minute.</p>
      </div>

      {inviteToken && invite && (
        invite !== 'missing' && invite.valid ? (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-3.5 text-sm text-white">
            <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
            You're invited as an FCA <b>{invite.role === 'ADMIN' ? 'admin' : 'arbiter'}</b>. Your account is approved instantly.
          </div>
        ) : (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-sm text-rose-100">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
            This invite link {invite === 'missing' ? 'is not valid' : `is ${invite.reason}`}. You can still join as a player — ask an admin for a new link.
          </div>
        )
      )}
      {referrer && !inviteToken && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-chess-border bg-surface p-3.5 text-sm text-white">
          <Gift className="h-5 w-5 shrink-0 text-primary" /> {referrer} invited you to FCA.
        </div>
      )}
      {pendingLichess && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-chess-border bg-surface p-3.5 text-sm text-white">
          <LichessIcon className="h-5 w-5 shrink-0" /> Lichess <b>@{pendingLichess.username}</b> is verified and will be linked when you finish.
        </div>
      )}

      <div className="mb-4 flex items-center gap-2 text-xs font-semibold">
        {['About you', 'Your account'].map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full ${step > i ? 'bg-primary text-white' : 'bg-white/10 text-text-muted'}`}>{i + 1}</span>
            <span className={step === i + 1 ? 'text-white' : 'text-text-muted'}>{label}</span>
            {i === 0 && <span className="h-px flex-1 bg-chess-border" />}
          </div>
        ))}
      </div>

      <Card className="p-4 sm:p-6">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error} {error.includes('Sign in') && <Link to="/login" className="font-bold underline">Sign in</Link>}</span>
          </div>
        )}
        {step === 1 ? (
          <form onSubmit={next} className="space-y-4" noValidate>
            <label className="block">
              <span className="field-label">Full name</span>
              <input className="input-field" value={form.full_name} onChange={set('full_name')} autoComplete="name" placeholder="e.g. Chidera Okafor" />
            </label>
            <label className="block">
              <span className="field-label">Faculty / school</span>
              <select className="input-field" value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value, department: '' })}>
                <option value="">Select…</option>
                {FUTO_FACULTIES.map((f) => <option key={f.code} value={f.code}>{f.code} — {f.name.replace(/\s*\(.*\)$/, '')}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="field-label">Department</span>
              <select className="input-field" value={form.department} onChange={set('department')} disabled={!faculty}>
                <option value="">{faculty ? 'Select…' : 'Pick a faculty first'}</option>
                {faculty?.departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-chess-border bg-[#1E1C18] px-3.5">
              <span className="text-sm font-semibold text-white">I'm a FUTO alumnus/alumna</span>
              <input type="checkbox" className="h-5 w-5 accent-[#81B64C]" checked={form.is_alumni} onChange={set('is_alumni')} />
            </label>
            <label className="block">
              <span className="field-label">Registration number{form.is_alumni ? ' (optional)' : ''}</span>
              <input className="input-field" value={form.reg_number} onChange={set('reg_number')} inputMode="numeric" placeholder="e.g. 20221234567" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="field-label">Gender</span>
                <select className="input-field" value={form.gender} onChange={set('gender')}>
                  <option value="">Prefer not to say</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </label>
              <label className="block">
                <span className="field-label">Phone (optional)</span>
                <input className="input-field" value={form.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" placeholder="080…" />
              </label>
            </div>
            <p className="text-xs text-text-muted">Your phone and registration number are only visible to FCA admins.</p>
            <button type="submit" className="btn-primary w-full">Continue <ArrowRight className="h-4 w-4" /></button>
          </form>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <label className="block">
              <span className="field-label">Email</span>
              <input className="input-field" type="email" value={form.email} onChange={set('email')} autoComplete="email" autoCapitalize="none" placeholder="you@example.com" />
            </label>
            <label className="block">
              <span className="field-label">Password</span>
              <span className="relative block">
                <input className="input-field !pr-12" type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} autoComplete="new-password" placeholder="At least 8 characters" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-text-muted" aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>
            <label className="block">
              <span className="field-label">Confirm password</span>
              <input className="input-field" type={showPw ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setStep(1); setError(''); }} className="btn-secondary"><ArrowLeft className="h-4 w-4" /></button>
              <button type="submit" disabled={busy} className="btn-primary flex-1">{busy ? <Spinner className="h-4 w-4" /> : 'Create my account'}</button>
            </div>
            <p className="text-center text-xs text-text-muted">Next you'll connect Lichess so your arena games are rated.</p>
          </form>
        )}
      </Card>

      <p className="mt-5 text-center text-sm text-text-muted">
        Already a member? <Link to={`/login${inviteToken ? `?next=${encodeURIComponent(`/join?invite=${inviteToken}`)}` : ''}`} className="font-semibold text-primary">Sign in</Link>
      </p>
    </div>
  );
}

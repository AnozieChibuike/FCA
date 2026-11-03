import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, CheckCircle2, XCircle, KeyRound, RefreshCw, ShieldCheck, Shield, ExternalLink, Copy, Phone, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { errorMessage, fetchProfiles, invokeFca } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { copyText, whatsappShareUrl } from '../../lib/share';
import { formatDate, timeAgo } from '../../lib/format';
import type { PlayerStatus, Profile } from '../../types';
import { totalGames } from '../../types';
import { Avatar, TitleBadge } from '../../components/ui/Avatar';
import { LichessIcon, WhatsappIcon } from '../../components/ui/icons';
import { Card, Chip, EmptyState, Skeleton, Spinner } from '../../components/ui/misc';
import Sheet from '../../components/ui/Sheet';
import { useToast } from '../../components/ui/Toast';

interface Contact { id: string; email: string | null; phone: string | null; reg_number: string | null; last_sign_in_at: string | null }
type Filter = 'ALL' | PlayerStatus | 'NO_LICHESS' | 'STAFF';

function waNumber(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234')) return digits;
  if (digits.startsWith('0') && digits.length === 11) return `234${digits.slice(1)}`;
  return digits.length >= 10 ? digits : null;
}

export default function AdminMembers() {
  const toast = useToast();
  const { isAdmin, profile: me } = useAuth();
  const [params, setParams] = useSearchParams();
  const filter = (params.get('status') as Filter) || 'ALL';
  const [members, setMembers] = useState<Profile[] | null>(null);
  const [contacts, setContacts] = useState<Map<string, Contact>>(new Map());
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Profile | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);

  async function load() {
    const [list, c] = await Promise.all([fetchProfiles(), supabase.rpc('admin_members')]);
    setMembers(list.filter((p) => !p.is_immortal).sort((a, b) => b.created_at.localeCompare(a.created_at)));
    setContacts(new Map(((c.data ?? []) as Contact[]).map((x) => [x.id, x])));
  }
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const m = members ?? [];
    return {
      ALL: m.length,
      PENDING: m.filter((p) => p.status === 'PENDING').length,
      APPROVED: m.filter((p) => p.status === 'APPROVED').length,
      REJECTED: m.filter((p) => p.status === 'REJECTED').length,
      NO_LICHESS: m.filter((p) => !p.lichess_username).length,
      STAFF: m.filter((p) => p.is_admin || p.is_arbiter).length,
    };
  }, [members]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (members ?? [])
      .filter((p) => filter === 'ALL' || (filter === 'NO_LICHESS' ? !p.lichess_username : filter === 'STAFF' ? p.is_admin || p.is_arbiter : p.status === filter))
      .filter((p) => {
        if (!q) return true;
        const c = contacts.get(p.id);
        return [p.full_name, p.fca_id, p.lichess_username, p.department, c?.email, c?.reg_number].some((v) => (v ?? '').toLowerCase().includes(q));
      });
  }, [members, contacts, filter, query]);

  if (!isAdmin) return <Card><EmptyState title="Admins only" /></Card>;

  async function update(p: Profile, patch: Partial<Profile>, done: string) {
    setBusy(p.id);
    const { error } = await supabase.from('profiles').update(patch).eq('id', p.id);
    setBusy(null);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast(done);
    setOpen((o) => (o && o.id === p.id ? { ...o, ...patch } : o));
    load();
  }

  async function approveAll() {
    const ids = (members ?? []).filter((p) => p.status === 'PENDING').map((p) => p.id);
    if (!ids.length || !confirm(`Approve all ${ids.length} pending members?`)) return;
    setBusy('all');
    const { error } = await supabase.from('profiles').update({ status: 'APPROVED' }).in('id', ids);
    setBusy(null);
    if (error) toast(error.message, 'error');
    else { toast(`Approved ${ids.length} members`); load(); }
  }

  async function makeResetLink(p: Profile) {
    setBusy(`reset-${p.id}`);
    try {
      const r = await invokeFca<{ link: string | null }>('reset_link', { profileId: p.id, redirectTo: `${window.location.origin}/reset-password` });
      setResetLink(r.link);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function resync(p: Profile) {
    setBusy(`resync-${p.id}`);
    try {
      const r = await invokeFca<{ missing: number }>('resync', { playerId: p.id });
      toast(r.missing ? `${r.missing} missing games queued in Imports` : 'No missing games for this member', r.missing ? 'success' : 'info');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  }

  const c = open ? contacts.get(open.id) : undefined;
  const wa = waNumber(c?.phone ?? null);

  return (
    <div>
      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {([['ALL', 'All'], ['PENDING', 'Pending'], ['APPROVED', 'Approved'], ['REJECTED', 'Rejected'], ['NO_LICHESS', 'No Lichess'], ['STAFF', 'Staff']] as Array<[Filter, string]>).map(([v, label]) => (
          <Chip key={v} active={filter === v} onClick={() => setParams(v === 'ALL' ? {} : { status: v }, { replace: true })}>
            {label} · {counts[v]}
          </Chip>
        ))}
      </div>
      <div className="mb-3 flex gap-2">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input className="input-field !pl-10" placeholder="Name, email, FCA ID, reg number…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        {counts.PENDING > 0 && (
          <button onClick={approveAll} disabled={busy === 'all'} className="btn-primary shrink-0">{busy === 'all' ? <Spinner className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}<span className="hidden sm:inline">Approve all</span></button>
        )}
      </div>

      {!members ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div> : shown.length === 0 ? (
        <Card><EmptyState title="No members match" /></Card>
      ) : (
        <Card className="divide-y divide-chess-border overflow-hidden">
          {shown.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
              <button onClick={() => { setOpen(p); setResetLink(null); }} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <Avatar src={p.avatar_url} name={p.full_name} size="sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-semibold text-white">{p.full_name}</span>
                    <TitleBadge title={p.earned_title} />
                    {p.is_admin && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                    {p.is_arbiter && !p.is_admin && <Shield className="h-3.5 w-3.5 text-sky-400" />}
                  </div>
                  <div className="truncate text-xs text-text-muted">
                    {p.department} · {p.lichess_username ? `@${p.lichess_username}` : 'no Lichess'} · joined {timeAgo(p.created_at)}
                  </div>
                </div>
              </button>
              {p.status === 'PENDING' ? (
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => update(p, { status: 'APPROVED' }, `${p.full_name} approved`)} disabled={busy === p.id} className="btn-primary !min-h-[36px] !px-2.5" aria-label="Approve"><CheckCircle2 className="h-4 w-4" /></button>
                  <button onClick={() => update(p, { status: 'REJECTED' }, `${p.full_name} rejected`)} disabled={busy === p.id} className="btn-secondary !min-h-[36px] !px-2.5" aria-label="Reject"><XCircle className="h-4 w-4" /></button>
                </div>
              ) : (
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${p.status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>{p.status}</span>
              )}
            </div>
          ))}
        </Card>
      )}

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.full_name ?? ''}>
        {open && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <Avatar src={open.avatar_url} name={open.full_name} size="lg" />
              <div className="min-w-0">
                <div className="text-white">{open.fca_id} · {open.status}</div>
                <div className="text-text-muted">{open.department} · {open.faculty}</div>
                <div className="text-text-muted">{totalGames(open)} rated games · joined {formatDate(open.created_at)}</div>
              </div>
            </div>
            <dl className="space-y-2 rounded-xl bg-[#1E1C18] p-3">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-text-muted" /><dd className="min-w-0 flex-1 truncate text-white">{c?.email ?? '—'}</dd>{c?.email && <button onClick={() => copyText(c.email!).then(() => toast('Email copied'))} className="text-text-muted" aria-label="Copy email"><Copy className="h-4 w-4" /></button>}</div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-text-muted" /><dd className="flex-1 text-white">{c?.phone ?? '—'}</dd>{wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" aria-label="WhatsApp"><WhatsappIcon className="h-4 w-4 text-[#25D366]" /></a>}</div>
              <div className="flex items-center gap-2"><span className="w-4 text-center text-xs font-bold text-text-muted">#</span><dd className="flex-1 text-white">Reg: {c?.reg_number ?? '—'}</dd></div>
              <div className="flex items-center gap-2"><LichessIcon className="h-4 w-4 text-text-muted" /><dd className="flex-1 text-white">{open.lichess_username ? `@${open.lichess_username}` : 'Not linked'}</dd></div>
              <div className="text-xs text-text-muted">Last sign-in: {c?.last_sign_in_at ? timeAgo(c.last_sign_in_at) : 'never'}</div>
            </dl>

            <div className="grid grid-cols-2 gap-2">
              {open.status !== 'APPROVED' && <button onClick={() => update(open, { status: 'APPROVED' }, 'Approved')} className="btn-primary"><CheckCircle2 className="h-4 w-4" /> Approve</button>}
              {open.status !== 'REJECTED' && <button onClick={() => confirm('Revoke membership?') && update(open, { status: 'REJECTED' }, 'Membership revoked')} className="btn-secondary"><XCircle className="h-4 w-4" /> {open.status === 'APPROVED' ? 'Revoke' : 'Reject'}</button>}
              <button onClick={() => update(open, { is_arbiter: !open.is_arbiter }, open.is_arbiter ? 'Arbiter role removed' : 'Now an arbiter')} className="btn-secondary">
                <Shield className="h-4 w-4" /> {open.is_arbiter ? 'Remove arbiter' : 'Make arbiter'}
              </button>
              <button
                disabled={open.id === me?.id}
                onClick={() => confirm(open.is_admin ? 'Remove admin access?' : `Give ${open.full_name} full admin access?`) && update(open, { is_admin: !open.is_admin }, open.is_admin ? 'Admin removed' : 'Now an admin')}
                className="btn-secondary"
              >
                <ShieldCheck className="h-4 w-4" /> {open.is_admin ? 'Remove admin' : 'Make admin'}
              </button>
              {open.lichess_username && (
                <button onClick={() => resync(open)} disabled={busy === `resync-${open.id}`} className="btn-secondary">
                  {busy === `resync-${open.id}` ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />} Resync games
                </button>
              )}
              <button onClick={() => makeResetLink(open)} disabled={busy === `reset-${open.id}`} className="btn-secondary">
                {busy === `reset-${open.id}` ? <Spinner className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />} Reset link
              </button>
            </div>

            {resetLink && (
              <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/10 p-3">
                <p className="text-xs text-white">Send this one-time link to {open.full_name.split(' ')[0]}. It lets them set a new password.</p>
                <div className="flex gap-2">
                  <button onClick={() => copyText(resetLink).then(() => toast('Link copied'))} className="btn-secondary flex-1"><Copy className="h-4 w-4" /> Copy</button>
                  <a
                    href={wa ? `https://wa.me/${wa}?text=${encodeURIComponent(`Hi! Here's your FCA password reset link: ${resetLink}`)}` : whatsappShareUrl(`Your FCA password reset link: ${resetLink}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary flex-1"
                  >
                    <WhatsappIcon className="h-4 w-4" /> WhatsApp
                  </a>
                </div>
              </div>
            )}

            <Link to={`/profile/${open.id}`} className="btn-ghost w-full"><ExternalLink className="h-4 w-4" /> Open profile</Link>
          </div>
        )}
      </Sheet>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Copy, Trash2, Link2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { copyText, siteUrl, whatsappShareUrl } from '../../lib/share';
import { formatDateTime, timeAgo } from '../../lib/format';
import type { InviteLink, InviteRole } from '../../types';
import { Avatar } from '../../components/ui/Avatar';
import { WhatsappIcon } from '../../components/ui/icons';
import { Card, EmptyState, SectionHeader, Segmented, Spinner } from '../../components/ui/misc';
import { useToast } from '../../components/ui/Toast';

interface Redemption { invite_id: string; redeemed_at: string; profile: { id: string; full_name: string; avatar_url: string | null } | null }

function secureToken() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => alphabet[b % alphabet.length]).join('');
}

export default function AdminInvites() {
  const toast = useToast();
  const { isAdmin, profile } = useAuth();
  const [links, setLinks] = useState<InviteLink[] | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [role, setRole] = useState<InviteRole>('ARBITER');
  const [hours, setHours] = useState(72);
  const [uses, setUses] = useState(1);
  const [creating, setCreating] = useState(false);

  async function load() {
    const [l, r] = await Promise.all([
      supabase.from('invite_links').select('*').order('created_at', { ascending: false }),
      supabase.from('invite_redemptions').select('invite_id, redeemed_at, profile:profiles!profile_id(id, full_name, avatar_url)').order('redeemed_at', { ascending: false }),
    ]);
    setLinks((l.data ?? []) as InviteLink[]);
    setRedemptions((r.data ?? []) as unknown as Redemption[]);
  }
  useEffect(() => { load(); }, []);

  if (!isAdmin) return <Card><EmptyState title="Admins only" /></Card>;

  const url = (token: string) => siteUrl(`/join?invite=${token}`);
  const message = (l: InviteLink) => `You're invited to be an FCA ${l.role === 'ADMIN' ? 'admin' : 'arbiter'} on FCA Rated. Sign up (or sign in) with this link: ${url(l.token)}`;

  async function create() {
    setCreating(true);
    const { error } = await supabase.from('invite_links').insert({
      token: secureToken(),
      role,
      created_by: profile!.id,
      expires_at: new Date(Date.now() + hours * 3_600_000).toISOString(),
      max_uses: uses,
    });
    setCreating(false);
    if (error) toast(error.message, 'error');
    else { toast('Invite link created'); load(); }
  }

  async function toggle(l: InviteLink) {
    await supabase.from('invite_links').update({ is_active: !l.is_active }).eq('id', l.id);
    load();
  }

  async function remove(l: InviteLink) {
    if (!confirm('Delete this invite link?')) return;
    await supabase.from('invite_links').delete().eq('id', l.id);
    load();
  }

  return (
    <div className="space-y-6">
      <section>
        <SectionHeader title="Create an invite" subtitle="For arbiters and admins. Players just use the normal sign-up or a member's referral link." />
        <Card className="space-y-4 p-4">
          <div>
            <span className="field-label">Role</span>
            <Segmented value={role} onChange={setRole} options={[{ value: 'ARBITER', label: 'Arbiter' }, { value: 'ADMIN', label: 'Admin' }]} />
            <p className="mt-1.5 text-xs text-text-muted">{role === 'ARBITER' ? 'Arbiters approve imports, log OTB games and fix results.' : 'Admins can do everything, including roles and member approvals.'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="field-label">Expires after</span>
              <select className="input-field" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
                {[[24, '1 day'], [72, '3 days'], [168, '1 week'], [720, '30 days']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="field-label">Uses</span>
              <select className="input-field" value={uses} onChange={(e) => setUses(Number(e.target.value))}>
                {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
          <button onClick={create} disabled={creating} className="btn-primary w-full">{creating ? <Spinner className="h-4 w-4" /> : <><Plus className="h-4 w-4" /> Create link</>}</button>
        </Card>
      </section>

      <section>
        <SectionHeader title="Invite links" />
        <div className="space-y-2.5">
          {!links ? <div className="flex justify-center py-8"><Spinner /></div> : links.length === 0 ? <Card><EmptyState icon={Link2} title="No invite links yet" /></Card> : links.map((l) => {
            const expired = new Date(l.expires_at) < new Date();
            const used = l.used_count >= l.max_uses;
            const live = l.is_active && !expired && !used;
            const who = redemptions.filter((r) => r.invite_id === l.id);
            return (
              <Card key={l.id} className={`p-3.5 ${live ? '' : 'opacity-70'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className={`rounded px-1.5 py-0.5 font-bold ${l.role === 'ADMIN' ? 'bg-primary/15 text-primary-light' : 'bg-sky-500/15 text-sky-300'}`}>{l.role}</span>
                      <span className={`rounded px-1.5 py-0.5 font-bold ${live ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-text-muted'}`}>
                        {live ? 'ACTIVE' : !l.is_active ? 'DISABLED' : expired ? 'EXPIRED' : 'USED UP'}
                      </span>
                      <span className="text-text-muted">{l.used_count}/{l.max_uses} used · expires {formatDateTime(l.expires_at)}</span>
                    </div>
                    <div className="mt-1 truncate font-mono text-xs text-text-muted">{url(l.token)}</div>
                  </div>
                  <button onClick={() => remove(l)} className="btn-ghost !min-h-[34px] !px-2" aria-label="Delete link"><Trash2 className="h-4 w-4" /></button>
                </div>
                {who.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {who.map((r) => r.profile && (
                      <Link key={r.profile.id} to={`/profile/${r.profile.id}`} className="flex items-center gap-1.5 rounded-full bg-white/5 py-0.5 pl-0.5 pr-2 text-xs text-white">
                        <Avatar src={r.profile.avatar_url} name={r.profile.full_name} size="xs" /> {r.profile.full_name} · {timeAgo(r.redeemed_at)}
                      </Link>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button disabled={!live} onClick={() => copyText(url(l.token)).then(() => toast('Link copied'))} className="btn-secondary flex-1 !min-h-[38px] text-xs"><Copy className="h-3.5 w-3.5" /> Copy</button>
                  <a aria-disabled={!live} href={live ? whatsappShareUrl(message(l)) : undefined} target="_blank" rel="noreferrer" className={`btn-secondary flex-1 !min-h-[38px] text-xs ${live ? '' : 'pointer-events-none opacity-50'}`}><WhatsappIcon className="h-3.5 w-3.5 text-[#25D366]" /> Send</a>
                  <button onClick={() => toggle(l)} className="btn-ghost !min-h-[38px] text-xs">{l.is_active ? 'Disable' : 'Enable'}</button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

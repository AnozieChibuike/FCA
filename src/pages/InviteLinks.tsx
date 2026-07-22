import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Link2, Plus, Copy, Trash2, Shield, Clock, Users, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { InviteLink, InviteRole } from '../types';

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function InviteLinks() {
  const { isAdmin } = useAuth();
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [newRole, setNewRole] = useState<InviteRole>('ARBITER');
  const [expiryHours, setExpiryHours] = useState(24);
  const [maxUses, setMaxUses] = useState(1);

  useEffect(() => {
    fetchLinks();
  }, []);

  async function fetchLinks() {
    setLoading(true);
    const { data } = await supabase
      .from('invite_links')
      .select('*')
      .order('created_at', { ascending: false });
    setLinks(data || []);
    setLoading(false);
  }

  async function createLink() {
    setCreating(true);
    const token = generateToken();
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();

    await supabase.from('invite_links').insert({
      token,
      role: newRole,
      created_by: (await supabase.auth.getUser()).data.user?.id,
      expires_at: expiresAt,
      max_uses: maxUses,
    });

    await fetchLinks();
    setCreating(false);
  }

  async function deleteLink(id: string) {
    await supabase.from('invite_links').delete().eq('id', id);
    fetchLinks();
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('invite_links').update({ is_active: !current }).eq('id', id);
    fetchLinks();
  }

  function copyLink(token: string, role: InviteRole) {
    const url = `${window.location.origin}/login?invite=${token}&role=${role}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  function isExpired(expiresAt: string) {
    return new Date(expiresAt) < new Date();
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-24">
        <div className="glass-card p-10 text-center max-w-md">
          <Shield className="w-16 h-16 text-cta mx-auto mb-4" />
          <h1 className="font-heading text-2xl tracking-wider mb-3">Access Denied</h1>
          <p className="text-text-muted text-sm mb-6">Admin privileges required.</p>
          <Link to="/" className="btn-primary inline-flex items-center gap-2">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 pt-28 pb-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <Link2 className="w-10 h-10 text-primary mx-auto mb-4" />
          <h1 className="font-heading text-3xl tracking-wider mb-3">Invite Links</h1>
          <p className="text-text-muted">Generate expirable links for Admin and Arbiter roles</p>
        </div>

        <div className="glass-card p-8 mb-8">
          <h2 className="font-heading text-lg tracking-wider mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Create New Invite Link
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as InviteRole)}
                className="input-field cursor-pointer"
              >
                <option value="ARBITER">Arbiter</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-2">Expires After</label>
              <select
                value={expiryHours}
                onChange={(e) => setExpiryHours(Number(e.target.value))}
                className="input-field cursor-pointer"
              >
                <option value={1}>1 Hour</option>
                <option value={6}>6 Hours</option>
                <option value={12}>12 Hours</option>
                <option value={24}>24 Hours</option>
                <option value={48}>48 Hours</option>
                <option value={72}>3 Days</option>
                <option value={168}>7 Days</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-2">Max Uses</label>
              <select
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className="input-field cursor-pointer"
              >
                <option value={1}>1 Use</option>
                <option value={3}>3 Uses</option>
                <option value={5}>5 Uses</option>
                <option value={10}>10 Uses</option>
                <option value={50}>50 Uses</option>
                <option value={999}>Unlimited</option>
              </select>
            </div>
          </div>

          <button
            onClick={createLink}
            disabled={creating}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            Generate Link
          </button>
        </div>

        <div className="glass-card p-8">
          <h2 className="font-heading text-lg tracking-wider mb-6 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Active Links
          </h2>

          {loading ? (
            <div className="text-center py-10">
              <Loader2 className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-10">
              <Link2 className="w-8 h-8 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted text-sm">No invite links created yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((link) => {
                const expired = isExpired(link.expires_at);
                const exhausted = link.used_count >= link.max_uses;
                const inactive = !link.is_active || expired || exhausted;

                return (
                  <div key={link.id} className={`p-4 rounded-xl border transition-all duration-200
                    ${inactive
                      ? 'bg-surface/30 border-primary/10 opacity-60'
                      : 'bg-surface/50 border-primary/20 hover:border-primary/30'
                    }`}>
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                            ${link.role === 'ADMIN' ? 'bg-primary/20 text-primary-light' : 'bg-cta/20 text-cta'}`}>
                            {link.role}
                          </span>
                          {expired && (
                            <span className="px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Expired
                            </span>
                          )}
                          {exhausted && (
                            <span className="px-2 py-0.5 rounded-full bg-cta/20 text-cta text-xs">Exhausted</span>
                          )}
                          {!link.is_active && (
                            <span className="px-2 py-0.5 rounded-full bg-text-muted/20 text-text-muted text-xs">Disabled</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {link.used_count}/{link.max_uses === 999 ? '∞' : link.max_uses} uses
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Expires: {new Date(link.expires_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => copyLink(link.token, link.role)}
                          disabled={inactive}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20
                                     text-primary-light text-xs font-medium hover:bg-primary/20 transition-all duration-200
                                     cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {copied === link.token ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copied === link.token ? 'Copied' : 'Copy Link'}
                        </button>
                        <button
                          onClick={() => toggleActive(link.id, link.is_active)}
                          className="px-3 py-1.5 rounded-lg bg-surface border border-primary/20
                                     text-text-muted text-xs hover:text-text transition-all duration-200 cursor-pointer"
                        >
                          {link.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => deleteLink(link.id)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-cta hover:bg-cta/10
                                     transition-all duration-200 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

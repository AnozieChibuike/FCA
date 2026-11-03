import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchSettings } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Card, EmptyState, SectionHeader, Spinner } from '../../components/ui/misc';
import { useToast } from '../../components/ui/Toast';

export default function AdminSettings() {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [creators, setCreators] = useState('');
  const [filter, setFilter] = useState('');
  const [since, setSince] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings().then((s) => {
      setCreators(Array.isArray(s.lichess_creators) ? (s.lichess_creators as string[]).join(', ') : 'bona-8');
      setFilter(typeof s.arena_name_filter === 'string' ? s.arena_name_filter : '');
      setSince(typeof s.discovery_since === 'string' ? s.discovery_since : '');
      setWhatsapp(typeof s.whatsapp_group_url === 'string' ? s.whatsapp_group_url : '');
      setLoaded(true);
    });
  }, []);

  if (!isAdmin) return <Card><EmptyState title="Admins only" /></Card>;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const rows = [
      { key: 'lichess_creators', value: creators.split(/[,\s]+/).map((c) => c.trim()).filter(Boolean) },
      { key: 'arena_name_filter', value: filter.trim() },
      { key: 'discovery_since', value: since || null },
      { key: 'whatsapp_group_url', value: whatsapp.trim() || null },
    ].map((r) => ({ ...r, updated_at: new Date().toISOString() }));
    setSaving(true);
    const { error } = await supabase.from('app_settings').upsert(rows);
    setSaving(false);
    if (error) toast(error.message, 'error');
    else toast('Settings saved');
  }

  if (!loaded) return <div className="flex justify-center py-10"><Spinner /></div>;

  return (
    <form onSubmit={save} className="space-y-6">
      <section>
        <SectionHeader title="Automatic arena import" subtitle="The sync checks these Lichess accounts every 15 minutes for finished arenas" />
        <Card className="space-y-4 p-4">
          <label className="block">
            <span className="field-label">Lichess accounts that create FCA arenas</span>
            <input className="input-field" value={creators} onChange={(e) => setCreators(e.target.value)} placeholder="bona-8, another-account" autoCapitalize="none" />
          </label>
          <label className="block">
            <span className="field-label">Only arenas whose name contains</span>
            <input className="input-field" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="FCA" />
          </label>
          <label className="block">
            <span className="field-label">Ignore arenas before</span>
            <input type="date" className="input-field" value={since} onChange={(e) => setSince(e.target.value)} />
            <span className="mt-1 block text-xs text-text-muted">Older arenas can still be imported by pasting their link in Imports.</span>
          </label>
        </Card>
      </section>
      <section>
        <SectionHeader title="Community" />
        <Card className="p-4">
          <label className="block">
            <span className="field-label">WhatsApp group invite link</span>
            <input className="input-field" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="https://chat.whatsapp.com/…" autoCapitalize="none" />
            <span className="mt-1 block text-xs text-text-muted">Shown to members in onboarding so they can join the group in one tap.</span>
          </label>
        </Card>
      </section>
      <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">{saving ? <Spinner className="h-4 w-4" /> : <><Save className="h-4 w-4" /> Save settings</>}</button>
    </form>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, CalendarDays, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchSeasons } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, formatDateTime } from '../../lib/format';
import type { GameMode, Season, Tournament } from '../../types';
import { MODES, MODE_LABELS } from '../../types';
import { Card, EmptyState, SectionHeader, Spinner } from '../../components/ui/misc';
import Sheet from '../../components/ui/Sheet';
import { useToast } from '../../components/ui/Toast';

const EVENT_COLUMNS = 'id, title, mode, time_control, start_date, ends_at, location, is_online, description, status, lichess_arena_id, lichess_status, nb_players, rating_cap';

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const EMPTY = { id: '', title: '', mode: 'BLITZ' as GameMode, time_control: '3+0', start: '', minutes: 70, is_online: true, location: 'Lichess', arena: '', rating_cap: '', description: '' };

export default function AdminEvents() {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState<Tournament[] | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [season, setSeason] = useState<{ id: string; name: string; starts_at: string; ends_at: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const since = new Date(Date.now() - 45 * 86_400_000).toISOString();
    const { data } = await supabase.from('tournaments').select(EVENT_COLUMNS).gte('start_date', since).order('start_date', { ascending: false });
    setEvents((data ?? []) as Tournament[]);
    fetchSeasons().then(setSeasons);
  }
  useEffect(() => { load(); }, []);

  function edit(t: Tournament) {
    const minutes = t.ends_at ? Math.round((new Date(t.ends_at).getTime() - new Date(t.start_date).getTime()) / 60_000) : 70;
    setForm({
      id: t.id, title: t.title, mode: t.mode, time_control: t.time_control ?? '', start: toLocalInput(t.start_date), minutes,
      is_online: t.is_online, location: t.location, arena: t.lichess_arena_id ?? '', rating_cap: t.rating_cap ? String(t.rating_cap) : '', description: t.description ?? '',
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.title.trim() || !form.start) {
      toast('Add a title and start time', 'error');
      return;
    }
    const arenaId = form.arena.trim().match(/([A-Za-z0-9]{8})\/?$/)?.[1] ?? null;
    const start = new Date(form.start);
    const payload = {
      title: form.title.trim(),
      mode: form.mode,
      time_control: form.time_control.trim() || null,
      start_date: start.toISOString(),
      ends_at: new Date(start.getTime() + (Number(form.minutes) || 60) * 60_000).toISOString(),
      is_online: form.is_online,
      location: form.is_online ? 'Lichess' : form.location.trim() || 'FUTO campus',
      lichess_arena_id: form.is_online ? arenaId : null,
      rating_cap: form.rating_cap ? Number(form.rating_cap) : null,
      description: form.description.trim(),
      ...(form.id ? {} : { status: 'SCHEDULED' }),
    };
    setSaving(true);
    const { error } = form.id
      ? await supabase.from('tournaments').update(payload).eq('id', form.id)
      : await supabase.from('tournaments').insert(payload);
    setSaving(false);
    if (error) {
      toast(error.message.includes('lichess_arena_id') ? 'That Lichess arena is already linked to another event.' : error.message, 'error');
      return;
    }
    toast(form.id ? 'Event updated' : 'Event scheduled');
    setForm(null);
    load();
  }

  async function remove(t: Tournament) {
    if (!confirm(`Delete "${t.title}"? Rated games stay; they just lose the event link.`)) return;
    const { error } = await supabase.from('tournaments').delete().eq('id', t.id);
    if (error) toast(error.message, 'error');
    else { toast('Event deleted'); load(); }
  }

  async function saveSeason(e: React.FormEvent) {
    e.preventDefault();
    if (!season) return;
    const payload = { name: season.name.trim(), starts_at: season.starts_at, ends_at: season.ends_at };
    const { error } = season.id ? await supabase.from('seasons').update(payload).eq('id', season.id) : await supabase.from('seasons').insert(payload);
    if (error) toast(error.message, 'error');
    else { toast('Season saved'); setSeason(null); load(); }
  }

  return (
    <div className="space-y-6">
      <section>
        <SectionHeader
          title="Events"
          subtitle="Arenas created by your Lichess accounts appear here automatically"
          action={<button onClick={() => setForm({ ...EMPTY })} className="btn-primary !min-h-[38px] !px-3 text-sm"><Plus className="h-4 w-4" /> New</button>}
        />
        <Card className="divide-y divide-chess-border overflow-hidden">
          {!events ? <div className="flex justify-center py-8"><Spinner /></div> : events.length === 0 ? <EmptyState icon={CalendarDays} title="No recent events" /> : events.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
              <div className="min-w-0 flex-1">
                <Link to={`/events/${t.id}`} className="block truncate font-semibold text-white hover:text-primary-light">{t.title}</Link>
                <div className="truncate text-xs text-text-muted">
                  {formatDateTime(t.start_date)} · {MODE_LABELS[t.mode]} {t.time_control ?? ''} · {t.status.toLowerCase()}{t.lichess_arena_id ? ' · Lichess linked' : ''}
                </div>
              </div>
              <button onClick={() => edit(t)} className="btn-ghost !px-2" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
              {isAdmin && <button onClick={() => remove(t)} className="btn-ghost !px-2" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>}
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionHeader
          title={<span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-yellow-400" /> Seasons</span>}
          subtitle="Season points add up every arena finish in the date range"
          action={isAdmin ? <button onClick={() => setSeason({ id: '', name: '', starts_at: '', ends_at: '' })} className="btn-secondary !min-h-[38px] !px-3 text-sm"><Plus className="h-4 w-4" /> New</button> : undefined}
        />
        <Card className="divide-y divide-chess-border overflow-hidden">
          {seasons.length === 0 ? <EmptyState title="No seasons" /> : seasons.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-white">{s.name}</div>
                <div className="text-xs text-text-muted">{formatDate(s.starts_at)} – {formatDate(s.ends_at)}</div>
              </div>
              {isAdmin && <button onClick={() => setSeason({ id: s.id, name: s.name, starts_at: s.starts_at, ends_at: s.ends_at })} className="btn-ghost !px-2" aria-label="Edit season"><Pencil className="h-4 w-4" /></button>}
            </div>
          ))}
        </Card>
      </section>

      <Sheet
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? 'Edit event' : 'Schedule event'}
        footer={<button form="event-form" type="submit" disabled={saving} className="btn-primary w-full">{saving ? <Spinner className="h-4 w-4" /> : 'Save event'}</button>}
      >
        {form && (
          <form id="event-form" onSubmit={save} className="space-y-4">
            <label className="block"><span className="field-label">Title</span><input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="FCA TITLED TUESDAY | #NOVEMBER10" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="field-label">Starts</span><input type="datetime-local" className="input-field" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></label>
              <label className="block"><span className="field-label">Length (min)</span><input type="number" min={10} className="input-field" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })} /></label>
              <label className="block">
                <span className="field-label">Rating mode</span>
                <select className="input-field" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as GameMode })}>
                  {MODES.map((m) => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
                </select>
              </label>
              <label className="block"><span className="field-label">Time control</span><input className="input-field" value={form.time_control} onChange={(e) => setForm({ ...form, time_control: e.target.value })} placeholder="3+0" /></label>
            </div>
            <label className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-chess-border bg-[#1E1C18] px-3.5">
              <span className="text-sm font-semibold text-white">Online on Lichess</span>
              <input type="checkbox" className="h-5 w-5 accent-[#81B64C]" checked={form.is_online} onChange={(e) => setForm({ ...form, is_online: e.target.checked })} />
            </label>
            {form.is_online ? (
              <label className="block"><span className="field-label">Lichess arena link (optional)</span><input className="input-field" value={form.arena} onChange={(e) => setForm({ ...form, arena: e.target.value })} placeholder="lichess.org/tournament/…" autoCapitalize="none" /></label>
            ) : (
              <label className="block"><span className="field-label">Venue</span><input className="input-field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="SEET hall" /></label>
            )}
            <label className="block"><span className="field-label">Rating cap (beginner events, optional)</span><input type="number" className="input-field" value={form.rating_cap} onChange={(e) => setForm({ ...form, rating_cap: e.target.value })} placeholder="e.g. 1300" /></label>
            <label className="block"><span className="field-label">Description</span><textarea className="input-field min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Prizes, rules, venue details…" /></label>
          </form>
        )}
      </Sheet>

      <Sheet open={!!season} onClose={() => setSeason(null)} title={season?.id ? 'Edit season' : 'New season'} footer={<button form="season-form" type="submit" className="btn-primary w-full">Save season</button>}>
        {season && (
          <form id="season-form" onSubmit={saveSeason} className="space-y-4">
            <label className="block"><span className="field-label">Name</span><input className="input-field" value={season.name} onChange={(e) => setSeason({ ...season, name: e.target.value })} placeholder="Season 2 · Rain semester" required /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="field-label">Starts</span><input type="date" className="input-field" value={season.starts_at} onChange={(e) => setSeason({ ...season, starts_at: e.target.value })} required /></label>
              <label className="block"><span className="field-label">Ends</span><input type="date" className="input-field" value={season.ends_at} onChange={(e) => setSeason({ ...season, ends_at: e.target.value })} required /></label>
            </div>
          </form>
        )}
      </Sheet>
    </div>
  );
}

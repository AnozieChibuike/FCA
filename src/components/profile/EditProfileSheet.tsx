import { useEffect, useRef, useState } from 'react';
import { Camera, Copy, ExternalLink, Unlink, CheckCircle2 } from 'lucide-react';
import type { Profile } from '../../types';
import { FUTO_FACULTIES } from '../../data/futoData';
import { supabase } from '../../lib/supabase';
import { errorMessage, invokeFca } from '../../lib/api';
import { initiateLichessOAuth } from '../../lib/lichessOAuth';
import { CHESSCOM_SETTINGS_URL, confirmChesscomVerification, startChesscomVerification } from '../../lib/chesscom';
import { copyText } from '../../lib/share';
import { useAuth } from '../../lib/auth';
import Sheet from '../ui/Sheet';
import { Avatar } from '../ui/Avatar';
import { ChesscomIcon, LichessIcon } from '../ui/icons';
import { Spinner } from '../ui/misc';
import { useToast } from '../ui/Toast';

/** Square-crop and shrink to 512px JPEG before upload (phones produce 4MB+ photos). */
async function compressImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('That file is not an image we can read.'));
      i.src = url;
    });
    const side = Math.min(img.width, img.height);
    const size = Math.min(512, side);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.getContext('2d')!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process image'))), 'image/jpeg', 0.86));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function EditProfileSheet({ player, open, onClose, onSaved }: {
  player: Profile; open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const { refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    full_name: player.full_name,
    bio: player.bio ?? '',
    faculty: player.faculty === 'N/A' ? '' : player.faculty,
    department: player.department === 'N/A' ? '' : player.department,
    gender: player.gender ?? '',
    is_alumni: !!player.is_alumni,
    phone: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatar, setAvatar] = useState(player.avatar_url);
  // Only write phone back if we managed to read it (or the member typed one), so a failed read never wipes it.
  const [phoneKnown, setPhoneKnown] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm((f) => ({
      ...f,
      full_name: player.full_name,
      bio: player.bio ?? '',
      faculty: player.faculty === 'N/A' ? '' : player.faculty,
      department: player.department === 'N/A' ? '' : player.department,
      gender: player.gender ?? '',
      is_alumni: !!player.is_alumni,
    }));
    setAvatar(player.avatar_url);
    supabase.rpc('my_private_profile').then(({ data, error }) => {
      if (error) return;
      const row = Array.isArray(data) ? data[0] : data;
      setForm((f) => ({ ...f, phone: row?.phone ?? '' }));
      setPhoneKnown(true);
    });
  }, [open, player]);

  const knownFaculty = FUTO_FACULTIES.find((f) => f.code === form.faculty);

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const blob = await compressImage(file);
      const { data: existing } = await supabase.storage.from('avatars').list(player.id);
      if (existing?.length) await supabase.storage.from('avatars').remove(existing.map((f) => `${player.id}/${f.name}`));
      const path = `${player.id}/avatar-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' });
      if (error) throw error;
      const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      const { error: updErr } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', player.id);
      if (updErr) throw updErr;
      setAvatar(url);
      toast('Photo updated');
      onSaved();
      refreshProfile();
    } catch (err) {
      toast(errorMessage(err, 'Upload failed'), 'error');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (form.full_name.trim().length < 2) {
      toast('Please enter your full name', 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name.trim(),
      bio: form.bio.trim(),
      faculty: form.faculty || 'N/A',
      department: form.department || 'N/A',
      gender: form.gender || null,
      is_alumni: form.is_alumni,
      ...(phoneKnown ? { phone: form.phone.trim() || null } : {}),
    }).eq('id', player.id);
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast('Profile saved');
    onSaved();
    refreshProfile();
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit profile"
      footer={(
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? <Spinner className="h-4 w-4" /> : 'Save changes'}</button>
        </div>
      )}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <button onClick={() => fileRef.current?.click()} className="relative" aria-label="Change photo" disabled={uploading}>
            <Avatar src={avatar} name={form.full_name} size="xl" />
            <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface bg-primary text-white">
              {uploading ? <Spinner className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
            </span>
          </button>
          <div className="text-sm text-text-muted">A clear photo helps members recognise you at OTB events.</div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
        </div>

        <label className="block">
          <span className="field-label">Full name</span>
          <input className="input-field" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} maxLength={80} />
        </label>
        <label className="block">
          <span className="field-label">Bio</span>
          <textarea className="input-field min-h-[84px]" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={240} placeholder="Favourite opening, chess hero, anything…" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Faculty / school</span>
            <select className="input-field" value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value, department: '' })}>
              <option value="">Select…</option>
              {FUTO_FACULTIES.map((f) => <option key={f.code} value={f.code}>{f.code} — {f.name.replace(/\s*\(.*\)$/, '')}</option>)}
              {form.faculty && !knownFaculty && <option value={form.faculty}>{form.faculty}</option>}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Department</span>
            <select className="input-field" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} disabled={!form.faculty}>
              <option value="">{form.faculty ? 'Select…' : 'Pick a faculty first'}</option>
              {knownFaculty?.departments.map((d) => <option key={d} value={d}>{d}</option>)}
              {form.department && !knownFaculty?.departments.includes(form.department) && <option value={form.department}>{form.department}</option>}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Gender</span>
            <select className="input-field" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">Prefer not to say</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </label>
          <label className="block">
            <span className="field-label">Phone (only admins see this)</span>
            <input className="input-field" inputMode="tel" value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); setPhoneKnown(true); }} placeholder="080…" maxLength={30} />
          </label>
        </div>
        <label className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-chess-border bg-[#1E1C18] px-3.5">
          <span className="text-sm font-semibold text-white">I'm a FUTO alumnus/alumna</span>
          <input type="checkbox" className="h-5 w-5 accent-[#81B64C]" checked={form.is_alumni} onChange={(e) => setForm({ ...form, is_alumni: e.target.checked })} />
        </label>

        <Connections player={player} onChanged={() => { onSaved(); refreshProfile(); }} />
      </div>
    </Sheet>
  );
}

export function Connections({ player, onChanged }: { player: Profile; onChanged: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [ccUser, setCcUser] = useState('');
  const [ccCode, setCcCode] = useState<string | null>(null);

  async function unlink(platform: 'lichess' | 'chesscom') {
    if (!confirm(platform === 'lichess' ? 'Disconnect Lichess? Your future arena games will not be rated until you reconnect.' : 'Disconnect Chess.com?')) return;
    setBusy(platform);
    try {
      await invokeFca('unlink_account', { platform });
      toast('Disconnected');
      onChanged();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function startCc() {
    setBusy('cc-start');
    try {
      const r = await startChesscomVerification(ccUser);
      setCcCode(r.code);
      setCcUser(r.username);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function verifyCc() {
    setBusy('cc-verify');
    try {
      const r = await confirmChesscomVerification();
      toast(`Chess.com @${r.username} connected`);
      setCcCode(null);
      onChanged();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-white">Connected accounts</h3>
      <div className="rounded-xl border border-chess-border bg-[#1E1C18] p-3.5">
        <div className="flex items-center gap-3">
          <LichessIcon className="h-6 w-6 text-white" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white">Lichess {player.lichess_username && <CheckCircle2 className="ml-1 inline h-4 w-4 text-primary" />}</div>
            <div className="truncate text-xs text-text-muted">{player.lichess_username ? `@${player.lichess_username} · arena games are rated` : 'Required for rated arena games'}</div>
          </div>
          {player.lichess_username ? (
            <button onClick={() => unlink('lichess')} disabled={busy === 'lichess'} className="btn-ghost !px-2" aria-label="Disconnect Lichess"><Unlink className="h-4 w-4" /></button>
          ) : (
            <button onClick={() => initiateLichessOAuth(`/profile/${player.id}`)} className="btn-primary !min-h-[38px] !px-3 !py-1.5 text-xs">Connect</button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-chess-border bg-[#1E1C18] p-3.5">
        <div className="flex items-center gap-3">
          <ChesscomIcon className="h-6 w-6" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white">Chess.com {player.chesscom_username && <CheckCircle2 className="ml-1 inline h-4 w-4 text-primary" />}</div>
            <div className="truncate text-xs text-text-muted">{player.chesscom_username ? `@${player.chesscom_username}` : 'Optional · shows on your profile'}</div>
          </div>
          {player.chesscom_username && (
            <button onClick={() => unlink('chesscom')} disabled={busy === 'chesscom'} className="btn-ghost !px-2" aria-label="Disconnect Chess.com"><Unlink className="h-4 w-4" /></button>
          )}
        </div>
        {!player.chesscom_username && (
          ccCode ? (
            <div className="mt-3 space-y-2.5 text-sm">
              <p className="text-text-muted">1. Copy this code. 2. Paste it in the <b className="text-white">Location</b> field of your Chess.com profile and save. 3. Tap Verify.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-black/40 px-3 py-2 text-center font-mono text-base font-bold tracking-wider text-primary">{ccCode}</code>
                <button onClick={() => copyText(ccCode).then(() => toast('Code copied'))} className="btn-secondary !px-3" aria-label="Copy code"><Copy className="h-4 w-4" /></button>
              </div>
              <div className="flex gap-2">
                <a href={CHESSCOM_SETTINGS_URL} target="_blank" rel="noreferrer" className="btn-secondary flex-1"><ExternalLink className="h-4 w-4" /> Open Chess.com</a>
                <button onClick={verifyCc} disabled={busy === 'cc-verify'} className="btn-primary flex-1">{busy === 'cc-verify' ? <Spinner className="h-4 w-4" /> : 'Verify'}</button>
              </div>
              <p className="text-xs text-text-muted">You can remove the code from your Location after you're verified.</p>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <input className="input-field !min-h-[42px]" placeholder="Chess.com username" value={ccUser} onChange={(e) => setCcUser(e.target.value)} autoCapitalize="none" autoCorrect="off" />
              <button onClick={startCc} disabled={!ccUser.trim() || busy === 'cc-start'} className="btn-secondary shrink-0">{busy === 'cc-start' ? <Spinner className="h-4 w-4" /> : 'Link'}</button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

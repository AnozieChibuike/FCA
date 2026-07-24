import { useState } from 'react';
import { X, Calendar, MapPin, Globe, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { GameMode } from '../types';

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTournamentModal({ isOpen, onClose, onSuccess }: CreateTournamentModalProps) {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<GameMode | 'CUSTOM'>('BLITZ');
  const [customTc, setCustomTc] = useState('');
  const [startDate, setStartDate] = useState('');
  const [location, setLocation] = useState('Maracana');
  const [isOnline, setIsOnline] = useState(false);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a tournament title.');
      return;
    }
    if (!startDate) {
      setError('Please select a tournament date & time.');
      return;
    }

    setLoading(true);
    setError('');

    const effectiveMode: GameMode = mode === 'CUSTOM' ? 'BLITZ' : mode;
    const tcLabel = mode === 'CUSTOM' ? (customTc.trim() || 'Multi-TC') : mode;

    try {
      const payload: Record<string, any> = {
        title: title.trim(),
        mode: effectiveMode,
        time_control: tcLabel,
        start_date: new Date(startDate).toISOString(),
        location: isOnline ? 'Lichess Online' : location.trim() || 'FUTO Campus',
        is_online: isOnline,
        description: description.trim(),
        status: 'SCHEDULED',
      };

      const { error: insertErr } = await supabase.from('tournaments').insert(payload);

      if (insertErr) {
        // Fallback if time_control column is missing from DB schema
        delete payload.time_control;
        const { error: fallbackErr } = await supabase.from('tournaments').insert(payload);
        if (fallbackErr) throw fallbackErr;
      }

      onSuccess();
      onClose();
      // Reset form
      setTitle('');
      setStartDate('');
      setDescription('');
      setCustomTc('');
      setMode('BLITZ');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tournament.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-chess-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-chess-border flex items-center justify-between bg-[#161512]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Create & Schedule Tournament
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-surface text-text-muted hover:text-white border border-chess-border cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/80 border border-red-500/40 text-red-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
              Tournament Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., FCA Blitz Masters 2026"
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
                Time Control Format
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="input-field cursor-pointer"
              >
                <option value="BLITZ">⚡ Blitz</option>
                <option value="RAPID">🔥 Rapid</option>
                <option value="CLASSICAL">⏳ Classical</option>
                <option value="BULLET">🚀 Bullet</option>
                <option value="CUSTOM">🔀 Custom / Multi-TC</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          {mode === 'CUSTOM' && (
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
                Custom Time Control / Description
              </label>
              <input
                type="text"
                value={customTc}
                onChange={(e) => setCustomTc(e.target.value)}
                placeholder="e.g., 3+0, 5+0 Blitz or Multi-TC Arena"
                className="input-field"
                required
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                Location / Venue
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs text-primary font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOnline}
                  onChange={(e) => {
                    setIsOnline(e.target.checked);
                    if (e.target.checked) setLocation('Lichess Online');
                  }}
                  className="rounded border-chess-border bg-[#161512] text-primary focus:ring-0"
                />
                <Globe className="w-3 h-3" />
                <span>Online Event</span>
              </label>
            </div>

            {!isOnline ? (
              <div className="relative">
                <MapPin className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., SEET Arena or SICT Hall 2"
                  className="input-field pl-9"
                />
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-[#161512] border border-chess-border text-xs text-text-muted flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <span>Event will take place online on Lichess.org</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Open to all undergraduate students. Swiss 5 rounds."
              rows={3}
              className="input-field resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-chess-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface border border-chess-border text-text-muted text-xs hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Save & Schedule Tournament
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

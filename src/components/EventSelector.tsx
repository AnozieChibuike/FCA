import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, List, Swords } from 'lucide-react';

interface EventSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
  placeholder?: string;
}

export default function EventSelector({
  value,
  onChange,
  label = 'Event Name',
  id = 'event-selector',
  placeholder = 'e.g., FUTO Blitz Arena Week 1',
}: EventSelectorProps) {
  const [existingEvents, setExistingEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      const { data } = await supabase.from('games').select('event_name');
      if (data) {
        const eventsSet = new Set<string>();
        // Always include default "Challenge"
        eventsSet.add('Challenge');

        data.forEach((g) => {
          if (g.event_name) {
            // Clean out Lichess IDs like [abc12345]
            const clean = g.event_name.replace(/\s*\[[a-zA-Z0-9]{8,12}\]/, '').trim();
            if (clean) eventsSet.add(clean);
          }
        });

        setExistingEvents(Array.from(eventsSet));
      }
    } catch (err) {
      console.error('Failed to fetch past events:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__CREATE_NEW__') {
      setIsCustom(true);
      onChange('');
    } else {
      setIsCustom(false);
      onChange(val);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-xs font-bold text-text-muted uppercase tracking-wider">
          {label}
        </label>
        <button
          type="button"
          onClick={() => {
            setIsCustom(!isCustom);
            onChange('');
          }}
          className="text-xs text-primary hover:text-primary-light flex items-center gap-1 font-medium transition-colors cursor-pointer"
        >
          {isCustom ? (
            <>
              <List className="w-3.5 h-3.5" />
              <span>Select Existing Event</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Event</span>
            </>
          )}
        </button>
      </div>

      {!isCustom ? (
        <div className="relative">
          <select
            id={id}
            value={value}
            onChange={handleSelectChange}
            disabled={loading}
            className="input-field text-sm cursor-pointer pr-8"
          >
            <option value="" disabled>
              {loading ? 'Loading events...' : '-- Select Tournament or Event --'}
            </option>
            <option value="Challenge" className="font-semibold text-emerald-400">
              ⚔️ Challenge (Approved 1-on-1 Match)
            </option>
            <optgroup label="Past Campus Tournaments & Events">
              {existingEvents
                .filter((ev) => ev !== 'Challenge')
                .map((event) => (
                  <option key={event} value={event}>
                    🏆 {event}
                  </option>
                ))}
            </optgroup>
            <option value="__CREATE_NEW__" className="text-primary font-bold">
              ➕ + Create New Event / Custom Name...
            </option>
          </select>
        </div>
      ) : (
        <div className="space-y-1">
          <input
            id={id}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="input-field text-sm"
            placeholder={placeholder}
            autoFocus
          />
          <p className="text-[11px] text-text-muted">
            Enter a unique name for your new tournament or event.
          </p>
        </div>
      )}

      {value === 'Challenge' && (
        <p className="text-[11px] text-emerald-400/90 flex items-center gap-1 font-medium mt-1">
          <Swords className="w-3 h-3" />
          Selected for official 1-on-1 head-to-head rated matches.
        </p>
      )}
    </div>
  );
}

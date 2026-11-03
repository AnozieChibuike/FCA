import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../ui/Avatar';
import Sheet from '../ui/Sheet';

export interface PickablePlayer {
  id: string;
  full_name: string;
  avatar_url: string | null;
  lichess_username: string | null;
  department: string;
}

let cache: PickablePlayer[] | null = null;

export function usePickablePlayers() {
  const [players, setPlayers] = useState<PickablePlayer[]>(cache ?? []);
  useEffect(() => {
    if (cache) return;
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, lichess_username, department')
      .eq('is_immortal', false)
      .order('full_name')
      .then(({ data }) => {
        cache = (data ?? []) as PickablePlayer[];
        setPlayers(cache);
      });
  }, []);
  return players;
}

export default function PlayerPicker({ label, value, onChange, exclude }: {
  label: string; value: string | null; onChange: (id: string | null) => void; exclude?: string | null;
}) {
  const players = usePickablePlayers();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = players.find((p) => p.id === value) ?? null;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players
      .filter((p) => p.id !== exclude)
      .filter((p) => !q || p.full_name.toLowerCase().includes(q) || (p.lichess_username ?? '').toLowerCase().includes(q))
      .slice(0, 40);
  }, [players, query, exclude]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="input-field flex items-center gap-2.5 text-left">
        {selected ? (
          <>
            <Avatar src={selected.avatar_url} name={selected.full_name} size="xs" />
            <span className="min-w-0 flex-1 truncate">{selected.full_name}</span>
          </>
        ) : <span className="flex-1 text-text-muted">{label}</span>}
        <ChevronDown className="h-4 w-4 text-text-muted" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input autoFocus className="input-field !pl-10" placeholder="Search by name or Lichess" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <ul className="divide-y divide-chess-border">
          {shown.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => { onChange(p.id); setOpen(false); setQuery(''); }} className="flex w-full items-center gap-3 py-2.5 text-left">
                <Avatar src={p.avatar_url} name={p.full_name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{p.full_name}</span>
                  <span className="block truncate text-xs text-text-muted">{p.lichess_username ? `@${p.lichess_username} · ` : ''}{p.department}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}

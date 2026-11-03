import { Link } from 'react-router-dom';
import { TITLE_CONFIG, type FcaTitle } from '../../types';
import { initials } from '../../lib/format';

const SIZES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-24 h-24 text-2xl sm:w-28 sm:h-28',
} as const;

export function Avatar({ src, name, size = 'md', ring, className = '' }: {
  src?: string | null; name?: string | null; size?: keyof typeof SIZES; ring?: string; className?: string;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1E1C18] font-bold text-text-muted border ${ring ?? 'border-chess-border'} ${SIZES[size]} ${className}`}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}

export function TitleBadge({ title, className = '' }: { title?: FcaTitle | null; className?: string }) {
  if (!title || title === 'NONE') return null;
  const cfg = TITLE_CONFIG[title];
  return (
    <span title={cfg.label} className={`inline-flex items-center rounded px-1.5 py-px text-[10px] font-extrabold tracking-wider ${cfg.bg} ${className}`}>
      {cfg.tag}
    </span>
  );
}

export function PlayerChip({ id, name, avatar, title, sub, size = 'sm' }: {
  id?: string | null; name: string; avatar?: string | null; title?: FcaTitle | null; sub?: string; size?: 'xs' | 'sm' | 'md';
}) {
  const body = (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar src={avatar} name={name} size={size} />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-semibold text-white">{name}</span>
          <TitleBadge title={title} />
        </span>
        {sub && <span className="block truncate text-xs text-text-muted">{sub}</span>}
      </span>
    </span>
  );
  if (!id) return body;
  return (
    <Link to={`/profile/${id}`} className="min-w-0 hover:opacity-90">
      {body}
    </Link>
  );
}

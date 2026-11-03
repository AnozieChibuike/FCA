// Dates are shown in the viewer's own timezone (almost everyone is on WAT anyway).

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', opts);
}

export function formatTime(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '';
  return `${formatDate(iso, { weekday: 'short', day: 'numeric', month: 'short' })} · ${formatTime(iso)}`;
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  const label = mins < 1 ? 'just now'
    : mins < 60 ? `${mins}m`
    : hours < 24 ? `${hours}h`
    : days < 30 ? `${days}d`
    : formatDate(iso, { day: 'numeric', month: 'short' });
  if (label === 'just now' || days >= 30) return label;
  return diff >= 0 ? `${label} ago` : `in ${label}`;
}

export function countdownParts(target: string | number | Date) {
  const ms = Math.max(0, new Date(target).getTime() - Date.now());
  return {
    done: ms === 0,
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms % 86_400_000) / 3_600_000),
    minutes: Math.floor((ms % 3_600_000) / 60_000),
    seconds: Math.floor((ms % 60_000) / 1000),
  };
}

export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export function signed(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}

export function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${n}`;
}

export function firstName(name: string | null | undefined) {
  return (name ?? '').trim().split(/\s+/)[0] || 'Member';
}

/** "FCA TITLED TUESDAY | #OCTOBER27" -> "Titled Tuesday · Oct 27" style short label for tight spaces. */
export function shortEventName(title: string) {
  const t = title.replace(/^FCA\s+/i, '').replace(/\s*\|\s*#.*$/, '').trim();
  return t ? t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : title;
}

export function initials(name: string | null | undefined) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

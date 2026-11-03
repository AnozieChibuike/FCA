import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Shield, LogOut, User, Share2, Info, Heart, Swords, ChevronRight, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { initiateLichessOAuth } from '../../lib/lichessOAuth';
import { inviteUrl, shareLink } from '../../lib/share';
import { Avatar, TitleBadge } from '../ui/Avatar';
import Sheet from '../ui/Sheet';
import { useToast } from '../ui/Toast';
import fcaLogo from '../../assets/logo-128.png';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/events', label: 'Events' },
  { to: '/leaderboards', label: 'Rankings' },
  { to: '/achievements', label: 'Badges' },
  { to: '/about', label: 'About' },
];

/** Pending approvals + imports, so staff see at a glance that something needs them. */
export function useStaffAttention() {
  const { isStaff, isAdmin } = useAuth();
  const location = useLocation();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!isStaff) return;
    let cancelled = false;
    (async () => {
      const [imports, members] = await Promise.all([
        supabase.from('arena_imports').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
        isAdmin
          ? supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'PENDING')
          : Promise.resolve({ count: 0 }),
      ]);
      if (!cancelled) setCount((imports.count ?? 0) + (members.count ?? 0));
    })();
    return () => { cancelled = true; };
  }, [isStaff, isAdmin, location.pathname]);
  return isStaff ? count : 0;
}

export default function TopBar() {
  const { profile, isStaff, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const attention = useStaffAttention();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    navigate('/');
  }

  async function shareInvite() {
    if (!profile) return;
    const outcome = await shareLink({
      title: 'Join FCA Rated',
      text: `Play rated chess with the FUTO Chess Association. Sign up with my link:`,
      url: inviteUrl(profile.fca_id),
    });
    if (outcome === 'copied') toast('Invite link copied');
  }

  const needsLichess = profile && !profile.lichess_username && !profile.is_immortal;

  return (
    <>
      <header className="pt-safe sticky top-0 z-50 border-b border-chess-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2" aria-label="FCA Rated home">
            <img src={fcaLogo} alt="" className="h-8 w-8 object-contain" />
            <span className="text-base font-extrabold tracking-wide text-white">FCA <span className="text-primary">Rated</span></span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${isActive ? 'bg-surface-hover text-white' : 'text-text-muted hover:text-white'}`}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            {isStaff && (
              <Link
                to="/admin"
                className="relative flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-text-muted hover:bg-white/5 hover:text-white"
                aria-label={attention ? `Admin console, ${attention} need attention` : 'Admin console'}
              >
                <Shield className="h-5 w-5 text-primary" />
                <span className="hidden lg:inline">Console</span>
                {attention > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {attention > 9 ? '9+' : attention}
                  </span>
                )}
              </Link>
            )}
            {!loading && (profile ? (
              <button
                onClick={() => setMenuOpen(true)}
                className="flex h-10 items-center gap-2 rounded-xl pl-1 pr-1 hover:bg-white/5 sm:pr-2"
                aria-label="Account menu"
              >
                <Avatar src={profile.avatar_url} name={profile.full_name} size="sm" ring={profile.status === 'APPROVED' ? 'border-primary/60' : 'border-amber-500/60'} />
                <span className="hidden max-w-[120px] truncate text-sm font-semibold text-white sm:block">{profile.full_name.split(' ')[0]}</span>
              </button>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">Sign in</Link>
                <Link to="/join" className="btn-primary !min-h-[38px] !px-4 !py-2">Join</Link>
              </>
            ))}
          </div>
        </div>
        {needsLichess && (
          <div className="border-t border-amber-500/20 bg-amber-500/10">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-xs sm:px-6">
              <span className="flex items-center gap-2 text-amber-100">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                Connect Lichess so your arena games count.
              </span>
              <button
                onClick={() => initiateLichessOAuth(`/profile/${profile.id}`)}
                className="shrink-0 rounded-lg bg-amber-400 px-3 py-1.5 font-bold text-black hover:bg-amber-300"
              >
                Connect
              </button>
            </div>
          </div>
        )}
      </header>

      {profile && (
        <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Your account">
          <Link to={`/profile/${profile.id}`} className="mb-4 flex items-center gap-3 rounded-xl border border-chess-border bg-[#1E1C18] p-3 hover:border-primary/40">
            <Avatar src={profile.avatar_url} name={profile.full_name} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-bold text-white">{profile.full_name}</span>
                <TitleBadge title={profile.earned_title} />
              </div>
              <div className="text-xs text-text-muted">{profile.fca_id} · {profile.status === 'APPROVED' ? 'Verified member' : 'Awaiting approval'}</div>
            </div>
            <ChevronRight className="h-5 w-5 text-text-muted" />
          </Link>
          <div className="space-y-1">
            <MenuItem icon={User} label="My profile" to={`/profile/${profile.id}`} />
            <MenuItem icon={Share2} label="Invite friends" onClick={shareInvite} />
            {isStaff && <MenuItem icon={Shield} label="Admin console" to="/admin" badge={attention} />}
            <MenuItem icon={Swords} label="Events & season" to="/events" />
            <MenuItem icon={Info} label="About FCA" to="/about" />
            <MenuItem icon={Heart} label="In memoriam" to="/memorial" />
            <MenuItem icon={LogOut} label="Sign out" onClick={handleSignOut} danger />
          </div>
        </Sheet>
      )}
    </>
  );
}

function MenuItem({ icon: Icon, label, to, onClick, danger, badge }: {
  icon: typeof User; label: string; to?: string; onClick?: () => void; danger?: boolean; badge?: number;
}) {
  const cls = `flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-colors hover:bg-white/5 ${danger ? 'text-rose-300' : 'text-white'}`;
  const inner = (
    <>
      <Icon className={`h-5 w-5 ${danger ? 'text-rose-400' : 'text-text-muted'}`} />
      <span className="flex-1">{label}</span>
      {!!badge && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">{badge}</span>}
    </>
  );
  return to ? <Link to={to} className={cls}>{inner}</Link> : <button onClick={onClick} className={cls}>{inner}</button>;
}

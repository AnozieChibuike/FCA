import { NavLink, Outlet, Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useStaffAttention } from '../../components/layout/TopBar';
import { EmptyState, PageLoader } from '../../components/ui/misc';

export default function AdminLayout() {
  const { isStaff, isAdmin, loading, profile } = useAuth();
  const attention = useStaffAttention();

  if (loading) return <PageLoader />;
  if (!isStaff) {
    return (
      <div className="page">
        <EmptyState
          icon={Shield}
          title="Arbiters and admins only"
          text={profile ? 'Your account does not have console access. Ask an admin for an arbiter invite.' : 'Sign in with an arbiter or admin account.'}
          action={<Link to={profile ? '/' : '/login?next=/admin'} className="btn-secondary">{profile ? 'Go home' : 'Sign in'}</Link>}
        />
      </div>
    );
  }

  const tabs = [
    { to: '/admin', label: 'Overview', end: true },
    { to: '/admin/imports', label: 'Imports' },
    { to: '/admin/games', label: 'Games' },
    ...(isAdmin ? [{ to: '/admin/members', label: 'Members' }] : []),
    { to: '/admin/events', label: 'Events' },
    ...(isAdmin ? [{ to: '/admin/invites', label: 'Invites' }, { to: '/admin/settings', label: 'Settings' }] : []),
  ];

  return (
    <div className="page">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-extrabold text-white">Console</h1>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-semibold text-text-muted">{isAdmin ? 'Admin' : 'Arbiter'}</span>
        {attention > 0 && <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-300">{attention} need attention</span>}
      </div>
      <nav className="no-scrollbar -mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-chess-border px-4 sm:mx-0 sm:px-0" aria-label="Console sections">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `relative shrink-0 whitespace-nowrap px-3 pb-2.5 pt-1 text-sm font-semibold transition-colors ${isActive ? 'text-white after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary' : 'text-text-muted hover:text-white'}`}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}

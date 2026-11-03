import { NavLink } from 'react-router-dom';
import { Home, CalendarDays, Trophy, Medal, User } from 'lucide-react';
import { useAuth } from '../../lib/auth';

export default function BottomNav() {
  const { profile } = useAuth();
  const items = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/events', label: 'Events', icon: CalendarDays },
    { to: '/leaderboards', label: 'Rankings', icon: Trophy },
    { to: '/achievements', label: 'Badges', icon: Medal },
    { to: profile ? `/profile/${profile.id}` : '/join', label: profile ? 'Me' : 'Join', icon: User },
  ];

  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-chess-border bg-background/95 backdrop-blur-md md:hidden"
      aria-label="Main"
    >
      <div className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${isActive ? 'text-primary' : 'text-text-muted active:text-white'}`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

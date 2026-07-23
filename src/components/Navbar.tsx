import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Swords, Shield, LogOut, User, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { initiateLichessOAuth } from '../lib/lichessOAuth';
import { getUserRole, ROLE_CONFIG } from '../types';
import fcaLogo from '../assets/logo.png';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isAdmin, isArbiter, signOut, loading } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
    setIsOpen(false);
  };

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/leaderboards', label: 'Leaderboards' },
    { path: '/about', label: 'About' },
    { path: '/memorial', label: 'In Memoriam' },
  ];

  const userRole = getUserRole(profile);
  const roleConfig = ROLE_CONFIG[userRole];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-chess-border shadow-md">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 cursor-pointer group">
            <img src={fcaLogo} alt="FCA Logo" className="w-8 h-8 object-contain transition-transform group-hover:scale-105 duration-150" />
            <span className="font-bold text-lg tracking-wide text-white">FCA</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3.5 py-2 rounded-md text-sm font-semibold transition-colors duration-150 cursor-pointer
                  ${location.pathname === link.path
                    ? 'bg-[#363431] text-white'
                    : 'text-text-muted hover:text-white hover:bg-[#2A2825]'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {(isAdmin || isArbiter) && (
              <Link
                to="/admin"
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-text-muted
                           hover:text-white hover:bg-[#363431] rounded-md transition-colors duration-150 cursor-pointer"
              >
                <Swords className="w-3.5 h-3.5 text-primary" />
                Arbiter Console
              </Link>
            )}

            {isAdmin && (
              <Link
                to="/admin/dashboard"
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-text-muted
                           hover:text-white hover:bg-[#363431] rounded-md transition-colors duration-150 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-primary" />
                Admin
              </Link>
            )}

            {!loading && (
              <>
                {profile ? (
                  <div className="flex items-center gap-2 pl-2 border-l border-chess-border">
                    <Link
                      to={`/profile/${profile.id}`}
                      className="flex items-center gap-2 px-2.5 py-1.5 text-sm font-medium text-text-muted
                                 hover:text-white hover:bg-[#363431] rounded-md transition-colors duration-150 cursor-pointer"
                    >
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover border border-chess-border" />
                      ) : (
                        <User className="w-4 h-4 text-text-muted" />
                      )}
                      <span className="hidden lg:inline text-white font-semibold">{profile.full_name.split(' ')[0]}</span>
                      {profile.status === 'APPROVED' ? (
                        <CheckCircle className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                      )}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="p-1.5 text-text-muted hover:text-white hover:bg-[#363431] rounded-md
                                 transition-colors duration-150 cursor-pointer"
                      title="Sign out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <Link to="/login" className="btn-primary text-xs py-2 px-4">Sign In</Link>
                )}
              </>
            )}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden min-w-[44px] min-h-[44px] p-2.5 text-text-muted hover:text-white hover:bg-[#2A2825]
                       rounded-lg transition-colors duration-150 cursor-pointer flex items-center justify-center active:scale-95"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden border-t border-chess-border py-3 px-1">
            <div className="flex flex-col gap-1.5">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`px-4 py-3 min-h-[44px] rounded-lg text-base font-semibold transition-colors duration-150 cursor-pointer flex items-center
                    ${location.pathname === link.path
                      ? 'bg-[#363431] text-white'
                      : 'text-text-muted hover:text-white hover:bg-[#2A2825] active:bg-[#363431]'
                    }`}
                >
                  {link.label}
                </Link>
              ))}

              {(isAdmin || isArbiter) && (
                <Link
                  to="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 min-h-[44px] text-base font-semibold text-text-muted hover:text-white hover:bg-[#2A2825] active:bg-[#363431] rounded-lg"
                >
                  <Swords className="w-5 h-5 text-primary" />
                  Arbiter Console
                </Link>
              )}

              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 min-h-[44px] text-base font-semibold text-text-muted hover:text-white hover:bg-[#2A2825] active:bg-[#363431] rounded-lg"
                >
                  <Shield className="w-5 h-5 text-primary" />
                  Admin Dashboard
                </Link>
              )}

              <div className="border-t border-chess-border my-2" />

              {!loading && (
                <>
                  {profile ? (
                    <>
                      <Link
                        to={`/profile/${profile.id}`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 min-h-[44px] text-base font-semibold text-text-muted hover:text-white hover:bg-[#2A2825] active:bg-[#363431] rounded-lg"
                      >
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border border-chess-border" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                        <span className="text-white font-medium">{profile.full_name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${roleConfig.bg} ${roleConfig.color}`}>
                          {roleConfig.label}
                        </span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 min-h-[44px] text-base font-semibold text-text-muted hover:text-white hover:bg-[#2A2825] active:bg-[#363431] rounded-lg w-full text-left cursor-pointer"
                      >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => setIsOpen(false)}
                      className="btn-primary w-full text-base font-bold text-center py-3 min-h-[46px] mt-1"
                    >
                      Sign In
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {profile && !profile.lichess_username && (
        <div className="bg-amber-950/90 border-t border-b border-amber-500/40 px-4 py-2 text-center text-xs text-amber-200 font-medium flex items-center justify-center gap-2 flex-wrap">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span><strong>Action Required:</strong> Connect your official Lichess account via OAuth to qualify for FCA rated matches.</span>
          <button
            onClick={() => initiateLichessOAuth(`/profile/${profile.id}`)}
            className="underline text-white font-bold hover:text-amber-300 ml-1 cursor-pointer"
          >
            Connect Lichess Now →
          </button>
        </div>
      )}
    </nav>
  );
}

import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import fcaLogo from '../../assets/logo-128.png';

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-chess-border bg-[#1A1916]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <div className="mb-2 flex items-center gap-2">
              <img src={fcaLogo} alt="" className="h-7 w-7 object-contain" />
              <span className="font-extrabold text-white">FCA Rated</span>
            </div>
            <p className="text-sm text-text-muted">
              The rating and competition platform of the FUTO Chess Association. Titled Tuesday every week on Lichess.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
            <Link to="/events" className="text-text-muted hover:text-white">Events</Link>
            <Link to="/leaderboards" className="text-text-muted hover:text-white">Rankings</Link>
            <Link to="/achievements" className="text-text-muted hover:text-white">Badges</Link>
            <Link to="/join" className="text-text-muted hover:text-white">Join FCA</Link>
            <Link to="/about" className="text-text-muted hover:text-white">About</Link>
            <Link to="/memorial" className="text-text-muted hover:text-white">In memoriam</Link>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2 border-t border-chess-border pt-4 text-xs text-text-muted sm:flex-row sm:justify-between">
          <span>&copy; {new Date().getFullYear()} FUTO Chess Association</span>
          <span className="flex items-center gap-1">Made with <Heart className="h-3.5 w-3.5 fill-primary text-primary" /> for FCA</span>
        </div>
      </div>
    </footer>
  );
}

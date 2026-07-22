import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import fcaLogo from '../assets/logo.png';

export default function Footer() {
  return (
    <footer className="border-t border-chess-border bg-surface mt-20">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <img src={fcaLogo} alt="FCA Logo" className="w-7 h-7 object-contain" />
              <span className="font-bold text-base tracking-wide text-white">FCA</span>
            </div>
            <p className="text-text-muted text-sm leading-relaxed max-w-md">
              The official rating and competition platform for the FUTO Chess Association.
              Tracking blitz, rapid, bullet, and classical ratings across campus.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm tracking-wide text-white mb-3">Quick Links</h4>
            <div className="flex flex-col gap-2">
              <Link to="/leaderboards" className="text-text-muted text-sm hover:text-white transition-colors duration-150 cursor-pointer">
                Leaderboards
              </Link>
              <Link to="/join" className="text-text-muted text-sm hover:text-white transition-colors duration-150 cursor-pointer">
                Join FCA
              </Link>
              <Link to="/about" className="text-text-muted text-sm hover:text-white transition-colors duration-150 cursor-pointer">
                About
              </Link>
              <Link to="/memorial" className="text-text-muted text-sm hover:text-white transition-colors duration-150 cursor-pointer">
                In Memoriam
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm tracking-wide text-white mb-3">Resources</h4>
            <div className="flex flex-col gap-2">
              <a
                href="https://lichess.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted text-sm hover:text-white transition-colors duration-150 cursor-pointer"
              >
                Lichess
              </a>
              <a
                href="https://chess.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted text-sm hover:text-white transition-colors duration-150 cursor-pointer"
              >
                Chess.com
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-chess-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-text-muted text-xs">
            &copy; {new Date().getFullYear()} FUTO Chess Association. All rights reserved.
          </p>
          <p className="text-text-muted text-xs flex items-center gap-1">
            Made with <Heart className="w-3.5 h-3.5 text-primary fill-primary" /> for FCA
          </p>
        </div>
      </div>
    </footer>
  );
}

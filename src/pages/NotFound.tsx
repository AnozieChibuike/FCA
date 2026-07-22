import { Link } from 'react-router-dom';
import { Home, Trophy, Heart, ArrowLeft } from 'lucide-react';
import fcaLogo from '../assets/logo.png';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-28 pb-16">
      <div className="max-w-xl w-full text-center">
        {/* Animated Badge & Logo */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#262421] border border-chess-border text-white text-xs font-semibold mb-6 shadow-sm">
          <img src={fcaLogo} alt="FCA Logo" className="w-4 h-4 object-contain" />
          <span className="text-amber-400">404 — Illegal Move!</span>
        </div>

        {/* Big 404 Chess Display */}
        <div className="relative mb-8">
          <h1 className="text-8xl md:text-9xl font-extrabold tracking-widest text-[#363431] select-none font-mono">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-2xl bg-surface border border-chess-border flex items-center justify-center shadow-2xl backdrop-blur-md">
              <span className="text-5xl font-black text-white">e9</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
          Square Off The Board!
        </h2>
        <p className="text-text-muted text-sm md:text-base mb-8 max-w-md mx-auto leading-relaxed">
          The page or square you are attempting to move to does not exist on the FCA chessboard.
        </p>

        {/* Navigation Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <Link
            to="/"
            className="p-3.5 rounded-lg bg-surface border border-chess-border hover:border-primary/50 hover:bg-[#2F2C28] transition-all flex flex-col items-center gap-2 group cursor-pointer"
          >
            <Home className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">Home Page</span>
          </Link>

          <Link
            to="/leaderboards"
            className="p-3.5 rounded-lg bg-surface border border-chess-border hover:border-primary/50 hover:bg-[#2F2C28] transition-all flex flex-col items-center gap-2 group cursor-pointer"
          >
            <Trophy className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">Leaderboards</span>
          </Link>

          <Link
            to="/memorial"
            className="p-3.5 rounded-lg bg-surface border border-chess-border hover:border-primary/50 hover:bg-[#2F2C28] transition-all flex flex-col items-center gap-2 group cursor-pointer"
          >
            <Heart className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white">In Memoriam</span>
          </Link>
        </div>

        {/* Go Back Action */}
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#262421] border border-chess-border text-text-muted hover:text-white hover:bg-[#2A2825] text-xs font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Previous Page</span>
        </button>
      </div>
    </div>
  );
}

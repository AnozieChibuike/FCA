import { Link } from 'react-router-dom';

export default function MemorialBanner() {
  return (
    <Link
      to="/memorial"
      className="block glass-card p-4 border-l-4 border-l-purple-500 hover:border-l-purple-400
                 transition-all duration-300 cursor-pointer group"
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <img
            src="/chisom-howell.jpeg"
            alt="Chisom Howell"
            className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/50 shadow-md group-hover:scale-105 transition-transform"
          />
          <span className="absolute -bottom-1 -right-1 fet-shimmer-badge px-1 py-0.2 rounded text-[9px] font-black">
            FET
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-text group-hover:text-primary-light transition-colors duration-200">
            In Memoriam: Chisom Howell
          </p>
          <p className="text-xs text-text-muted flex items-center mt-0.5 gap-1.5">
            <span>Software Engineering (SICT)</span>
            <span>•</span>
            <span className="text-purple-300">@strengthofLSB</span>
          </p>
        </div>
      </div>
    </Link>
  );
}


import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';

export default function MemorialBanner() {
  return (
    <Link
      to="/memorial"
      className="block glass-card p-4 border-l-4 border-l-purple-500 hover:border-l-purple-400
                 transition-all duration-300 cursor-pointer group"
    >
      <div className="flex items-center gap-3">
        <Star className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors duration-200" />
        <div>
          <p className="text-sm font-medium text-text group-hover:text-primary-light transition-colors duration-200">
            In Memoriam: Chisom Howell
          </p>
          <p className="text-xs text-text-muted flex items-center mt-1">
            <span className="fet-shimmer-badge px-1.5 py-0.5 rounded text-[10px] mr-1.5 font-bold">FET</span>
            <span>FCA Eternal — Forever in our hearts</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

import { Star, Heart, Quote } from 'lucide-react';
import { TITLE_CONFIG } from '../types';

export default function Memorial() {
  const eternalConfig = TITLE_CONFIG.FET;

  return (
    <div className="min-h-screen px-6 pt-28 pb-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm mb-6">
            <Star className="w-4 h-4" />
            In Memoriam
          </div>
          <h1 className="font-extrabold text-4xl md:text-5xl tracking-wide mb-4">
            <span className="text-purple-400 font-extrabold">Chisom Howell</span>
          </h1>
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="fet-shimmer-badge px-1.5 py-0.5 rounded title-badge mr-1.5 font-bold">FET</span>
            <span className="text-text-muted text-sm">{eternalConfig.label}</span>
          </div>
        </div>

        <div className="glass-card p-8 border-l-4 border-l-purple-500 mb-8">
          <Quote className="w-8 h-8 text-purple-400/50 mb-4" />
          <p className="text-text text-lg leading-relaxed italic">
            "In every game played, in every move considered, the spirit of Chisom Howell lives on.
            His passion for chess and dedication to the FUTO Chess Association will forever be
            remembered and celebrated."
          </p>
        </div>

        <div className="glass-card p-8 mb-8">
          <h2 className="font-heading text-xl tracking-wider mb-6 flex items-center gap-2">
            <Heart className="w-5 h-5 text-cta" />
            Legacy & Achievements
          </h2>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-medium text-text mb-1">FCA Eternal Title [FET]</h3>
                <p className="text-text-muted text-sm">
                  The highest and most exclusive title in FCA history, reserved solely for Chisom Howell.
                  This title is unattainable by any other player, serving as a permanent tribute to his legacy.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-heading text-sm">2500</span>
              </div>
              <div>
                <h3 className="font-medium text-text mb-1">Immortalized Rating</h3>
                <p className="text-text-muted text-sm">
                  Preserved at 2500 Elo across all formats — Blitz, Rapid, Bullet, and Classical —
                  representing the pinnacle of chess achievement within FCA.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-neon-green/20 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-neon-green" />
              </div>
              <div>
                <h3 className="font-medium text-text mb-1">Protected Profile</h3>
                <p className="text-text-muted text-sm">
                  His profile is database-enforced to be immutable — locked from any modifications
                  or deletions, ensuring his place in FCA history is preserved forever.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-8 text-center border border-purple-500/20">
          <p className="text-text-muted text-sm leading-relaxed max-w-lg mx-auto">
            "Those who light their candle in the darkest hour shall forever be remembered
            as a beacon of light."
          </p>
          <p className="text-purple-400 text-xs mt-4 font-medium">— FCA Memorial</p>
        </div>
      </div>
    </div>
  );
}

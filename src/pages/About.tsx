import { BookOpen, Award, Users, Shield } from 'lucide-react';
import { TITLE_CONFIG } from '../types';

const titleEntries = Object.entries(TITLE_CONFIG).filter(([key]) => key !== 'NONE');

export default function About() {
  return (
    <div className="min-h-screen px-4 sm:px-6 pt-6 sm:pt-10 pb-12 sm:pb-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <BookOpen className="w-9 h-9 sm:w-10 sm:h-10 text-primary mx-auto mb-3 sm:mb-4" />
          <h1 className="font-heading text-2xl sm:text-3xl tracking-wider mb-2 sm:mb-3">About FCA</h1>
          <p className="text-text-muted text-xs sm:text-sm max-w-xl mx-auto">
            The FUTO Chess Association is dedicated to fostering chess excellence
            among students through structured competition and recognition.
          </p>
        </div>

        <div className="glass-card p-5 sm:p-8 mb-6 sm:mb-8">
          <h2 className="font-heading text-lg sm:text-xl tracking-wider mb-4 sm:mb-6 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            FCA Title Progression
          </h2>
          <p className="text-text-muted text-xs sm:text-sm mb-4 sm:mb-6">
            Titles are awarded automatically based on peak Elo thresholds, established games, and tournament finishes achieved in official FCA events. Once earned, titles are held for life.
          </p>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary/20">
                  <th className="text-left py-3 px-4 text-text-muted font-medium">Title</th>
                  <th className="text-left py-3 px-4 text-text-muted font-medium">Tag</th>
                  <th className="text-left py-3 px-4 text-text-muted font-medium">Peak Elo</th>
                  <th className="text-left py-3 px-4 text-text-muted font-medium">Requirements</th>
                  <th className="text-left py-3 px-4 text-text-muted font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {titleEntries.map(([key, config]) => (
                  <tr key={key} className="border-b border-primary/10 hover:bg-surface/30 transition-colors duration-200">
                    <td className="py-3 px-4 font-medium text-text">{config.label}</td>
                    <td className="py-3 px-4">
                      {config.tag === "FET" ? (
                        <span className="fet-shimmer-badge px-1.5 py-0.5 rounded title-badge mr-1.5 font-bold">FET</span>
                      ) : (
                        <span className={`title-badge bg-primary/20 ${config.color}`}>
                          {config.tag}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-text-muted">
                      {config.threshold ? `${config.threshold}+` : 'Reserved'}
                    </td>
                    <td className="py-3 px-4 text-xs text-text-muted">
                      {config.reqText}
                    </td>
                    <td className="py-3 px-4">
                      {key === 'FET' ? (
                        <span className="text-purple-400 text-xs font-medium">Honorary (In Memoriam)</span>
                      ) : (
                        <span className="text-emerald-400 text-xs font-medium">Attainable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="glass-card p-6">
            <Shield className="w-6 h-6 text-primary mb-4" />
            <h3 className="font-heading text-sm tracking-wider mb-3">Club Regulations</h3>
            <ul className="space-y-2 text-text-muted text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">—</span>
                All games must be played under FCA official time controls
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">—</span>
                Ratings are calculated using standard FIDE Elo formulas
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">—</span>
                Players with provisional ratings (under 15 games) use K=40
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">—</span>
                Established players use K=20 for rating calculations
              </li>
            </ul>
          </div>

          <div className="glass-card p-6">
            <Users className="w-6 h-6 text-cta mb-4" />
            <h3 className="font-heading text-sm tracking-wider mb-3">FCA Executive & Notable Figures</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src="/chisom-howell.jpeg"
                  alt="Chisom Howell"
                  className="w-9 h-9 rounded-full object-cover border-2 border-purple-500/50"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-text text-sm font-medium">Chisom Howell</p>
                    <span className="fet-shimmer-badge px-1 py-0.2 rounded text-[9px] font-bold">FET</span>
                  </div>
                  <p className="text-purple-300 text-xs">FCA Eternal • Notable Player (SICT)</p>
                </div>
              </div>
              <p className="text-text-muted text-xs mt-4">
                Executive profiles and contact information available upon request.
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 sm:p-8 mb-6 sm:mb-8">
          <h2 className="font-heading text-xl tracking-wider mb-4">Game Modes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-surface/50">
              <h3 className="font-medium text-text mb-1">Blitz</h3>
              <p className="text-text-muted text-xs">3–5 minute games. Titled Tuesday is 3+0 blitz.</p>
            </div>
            <div className="p-4 rounded-lg bg-surface/50">
              <h3 className="font-medium text-text mb-1">Rapid</h3>
              <p className="text-text-muted text-xs">15+10 time control. Strategic depth with time to think.</p>
            </div>
            <div className="p-4 rounded-lg bg-surface/50">
              <h3 className="font-medium text-text mb-1">Bullet</h3>
              <p className="text-text-muted text-xs">1+0 time control. Pure speed chess.</p>
            </div>
            <div className="p-4 rounded-lg bg-surface/50">
              <h3 className="font-medium text-text mb-1">Classical</h3>
              <p className="text-text-muted text-xs">90+30 time control. Deep positional play.</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 sm:p-8">
          <h2 className="font-heading text-xl tracking-wider mb-4">FAQ</h2>
          <div className="divide-y divide-chess-border">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-white">
                  {q}
                  <span className="text-text-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm text-text-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const FAQ: Array<[string, string]> = [
  ['How do I get an FCA rating?', 'Create a free account, connect your Lichess account, and play the Titled Tuesday arena (every Tuesday, 8:30 PM). Every game you play against another FCA member is rated once an arbiter approves the import.'],
  ['Why is a game missing from my profile?', 'Only games where both players have linked Lichess accounts are rated. If you linked Lichess after playing, the site finds those past games automatically and queues them for an arbiter to approve.'],
  ['When do ratings update?', "The site checks Lichess every 15 minutes. Once an arena finishes it's queued for one-click approval, and ratings, titles and badges update as soon as an arbiter approves it."],
  ['How are titles earned?', 'Titles are awarded automatically once established (25+ rated games) when crossing rating and tournament benchmarks (FCM: 1400 Elo; FM: 1550 Elo; FIM: 1700 Elo + 5 FCA Podiums; FGM: 1800 Elo + 3 FCA Wins). All titles are earned for life.'],
  ['What are badges and season points?', 'Badges reward milestones like win streaks, upsets and Titled Tuesday attendance. Season points come from your finishing position among FCA members in each arena, plus a point for turning up.'],
  ['Can I play over the board?', 'Yes. Arbiters log over-the-board games on campus, and they count towards your rating like online games.'],
  ['I forgot my password', 'Use "Forgot password?" on the sign-in page. If the email doesn\'t arrive, any FCA admin can send you a one-time reset link from the console.'],
];

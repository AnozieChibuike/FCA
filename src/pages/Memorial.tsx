import { Star, Heart, Quote, ExternalLink, Zap, GraduationCap, Shield, Trophy, Swords, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function Memorial() {
  const [copied, setCopied] = useState(false);

  const gamePgn = `[Event "rated bullet game"]
[Site "https://lichess.org/8mfdMMdq"]
[Date "2026.02.11"]
[White "strengthofLSB"]
[Black "StrzemieckiZbigniew"]
[Result "1-0"]
[WhiteElo "2294"]
[BlackElo "2435"]
[BlackTitle "IM"]
[Variant "Standard"]
[TimeControl "60+0"]
[ECO "D31"]
[Opening "Queen's Gambit Declined"]

1. d4 e6 2. c4 d5 3. Nc3 f5 4. Bf4 Nf6 5. e3 c6 6. h4 Bd6 7. Nh3 O-O 8. Bd3 Ne4 9. Qc2 Bxf4 10. Nxf4 Bd7 11. Nd1 Qf6 12. g3 Be8 13. Nc3 Nd7 14. O-O e5 15. dxe5 Nxe5 16. cxd5 Nf3+ 17. Kg2 Nxh4+ 18. gxh4 Qxh4 19. Rh1 Qg4+ 20. Kf1 Qf3 21. Rh3 Qg4 22. Be2 Qg5 23. Nxe4 fxe4 24. Qxe4 Bg6 25. Nxg6 Qxg6 26. Qxg6 hxg6 27. dxc6 bxc6 28. Bc4+ Rf7 29. Rf3 g5 30. Rxf7 Kh7 31. Kg2 Kg6 32. Rh1 Rd8 33. Rc7 Rd6 34. Rxa7 Kf6 35. Be2 Ke5 36. Bf3 Rd2 37. Ra6 Rc2 38. Rxc6 Rxb2 39. Rhc1 Rxa2 40. R1c5# 1-0`;

  const copyPgn = () => {
    navigator.clipboard.writeText(gamePgn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen px-3 sm:px-6 pt-20 sm:pt-28 pb-12 sm:pb-16">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Hero Card / Profile Header */}
        <div className="glass-card p-4 sm:p-8 md:p-10 relative overflow-hidden border-purple-500/30">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 sm:w-40 sm:h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-center gap-5 sm:gap-8 relative z-10">
            {/* Picture Frame */}
            <div className="relative group flex-shrink-0">
              <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20 bg-surface relative">
                <img
                  src="/chisom-howell.jpeg"
                  alt="Chisom Howell playing chess"
                  className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="absolute -bottom-2 -right-2">
                <span className="fet-shimmer-badge px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-md text-[10px] sm:text-xs font-black shadow-lg">FET</span>
              </div>
            </div>

            {/* Profile Info */}
            <div className="text-center md:text-left flex-1 space-y-2.5 sm:space-y-3 w-full">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 sm:py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs select-none">
                <Star className="w-3.5 h-3.5" />
                In Memoriam — FCA Eternal
              </div>

              <h1 className="font-extrabold text-2xl sm:text-4xl md:text-5xl tracking-wide text-white">
                Chisom Howell
              </h1>

              <p className="text-purple-300/90 font-medium text-xs sm:text-base">
                Notable Player & Immortal Legend of FUTO Chess Association
              </p>

              {/* Badges / Chips */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface/80 border border-chess-border text-xs text-text-muted">
                  <GraduationCap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="truncate"><strong className="text-text">SICT</strong> • Software Eng.</span>
                </div>

                <a
                  href="https://lichess.org/@/strengthofLSB"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs text-purple-300 hover:bg-purple-500/20 transition-colors"
                >
                  <span className="font-bold">Lichess:</span>
                  <span>@strengthofLSB</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 flex-shrink-0" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Tribute Quote */}
        <div className="glass-card p-4 sm:p-8 border-l-4 border-l-purple-500">
          <Quote className="w-6 h-6 sm:w-7 sm:h-7 text-purple-400/50 mb-2 sm:mb-3" />
          <p className="text-text text-sm sm:text-lg leading-relaxed italic">
            "In every game played, in every move considered, the spirit of Chisom Howell lives on.
            A truly formidable player with a fierce competitive drive and a sharp tactical mind,
            his passion for chess enriched the FUTO Chess Association and left an indelible mark on all who played against him."
          </p>
        </div>

        {/* Featured Game Section — Chisom vs IM Strzemiecki */}
        <div className="glass-card p-4 sm:p-8 border-2 border-purple-500/30 space-y-4 sm:space-y-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-chess-border pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-1.5">
                <Trophy className="w-3.5 h-3.5" />
                Featured Immortal Game
              </div>
              <h2 className="font-heading text-lg sm:text-2xl text-white tracking-wide flex items-center gap-2">
                The Giant Slayer: Checkmate vs. IM
              </h2>
              <p className="text-text-muted text-xs sm:text-sm mt-0.5">
                One of Chisom's final rated games (Feb 11, 2026) — a 40-move victory over IM Zbigniew Strzemiecki.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={copyPgn}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface/80 border border-chess-border text-xs text-text-muted hover:text-white transition-colors"
                title="Copy Game PGN"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-neon-green" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'PGN Copied' : 'Copy PGN'}</span>
              </button>

              <a
                href="https://lichess.org/8mfdMMdq"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors shadow-md shadow-purple-600/20"
              >
                <span>View on Lichess</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Match Scoreboard */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface/60 border border-chess-border rounded-xl p-3 sm:p-4 text-center">
            {/* White */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-start">
              <img
                src="/chisom-howell.jpeg"
                alt="Chisom Howell"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-purple-500/60 flex-shrink-0"
              />
              <div className="text-left min-w-0">
                <p className="text-white text-xs sm:text-sm font-bold flex items-center gap-1 truncate">
                  strengthofLSB
                  <span className="fet-shimmer-badge px-1 py-0.2 rounded text-[8px] sm:text-[9px]">FET</span>
                </p>
                <p className="text-[11px] sm:text-xs text-text-muted truncate">Chisom Howell (2294)</p>
              </div>
            </div>

            {/* Match Status / Score */}
            <div className="flex flex-col items-center py-0.5 sm:py-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold whitespace-nowrap">
                <Swords className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                1 - 0 (CHECKMATE)
              </div>
              <p className="text-[10px] sm:text-[11px] text-text-muted mt-0.5">1+0 Bullet • Move 40</p>
            </div>

            {/* Black */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <div className="text-right min-w-0">
                <p className="text-white text-xs sm:text-sm font-bold flex items-center justify-end gap-1 truncate">
                  <span className="bg-amber-500/20 text-amber-400 px-1 py-0.2 rounded text-[8px] sm:text-[10px] font-black border border-amber-500/30">IM</span>
                  StrzemieckiZbigniew
                </p>
                <p className="text-[11px] sm:text-xs text-text-muted truncate">IM Strzemiecki (2435)</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-surface border border-chess-border flex items-center justify-center text-text-muted font-bold text-xs flex-shrink-0">
                IM
              </div>
            </div>
          </div>

          {/* Embedded Lichess Interactive Board */}
          <div className="w-full rounded-xl overflow-hidden border border-chess-border shadow-2xl bg-[#161512]">
            <iframe
              src="https://lichess.org/embed/game/8mfdMMdq?theme=dark&bg=dark"
              width="100%"
              height="440"
              frameBorder="0"
              allowTransparency={true}
              className="w-full h-[360px] xs:h-[400px] sm:h-[480px] rounded-xl border-0"
              title="Chisom Howell vs IM Strzemiecki - Lichess Game"
            ></iframe>
          </div>

          {/* Move-by-Move Commentary Highlights */}
          <div className="space-y-3 pt-1">
            <h3 className="text-xs sm:text-sm font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Key Tactical Highlights
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 sm:p-3 rounded-lg bg-surface/50 border border-chess-border space-y-1">
                <span className="text-amber-400 font-mono font-bold">16... Nf3+ 17. Kg2!</span>
                <p className="text-text-muted leading-relaxed text-[11px] sm:text-xs">
                  Refuting Black's aggressive knight sacrifice with cold precision and calm defensive play.
                </p>
              </div>

              <div className="p-2.5 sm:p-3 rounded-lg bg-surface/50 border border-chess-border space-y-1">
                <span className="text-purple-400 font-mono font-bold">19. Rh1! 21. Rh3!</span>
                <p className="text-text-muted leading-relaxed text-[11px] sm:text-xs">
                  Repelling Black's queen attack, seizing open rooks on the h-file, and taking full control.
                </p>
              </div>

              <div className="p-2.5 sm:p-3 rounded-lg bg-surface/50 border border-chess-border space-y-1">
                <span className="text-emerald-400 font-mono font-bold">40. R1c5# (1-0)</span>
                <p className="text-text-muted leading-relaxed text-[11px] sm:text-xs">
                  Delivering a stunning checkmate to seal victory over an International Master.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Legacy & Achievements Grid */}
        <div className="glass-card p-4 sm:p-8 space-y-4 sm:space-y-6">
          <h2 className="font-heading text-lg sm:text-xl tracking-wider flex items-center gap-2 text-white">
            <Heart className="w-5 h-5 text-cta" />
            Legacy, Skill & Tributes
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Tactical Brilliance */}
            <div className="p-4 sm:p-5 rounded-xl bg-surface/40 border border-chess-border hover:border-purple-500/30 transition-colors space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-400">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-text text-sm sm:text-base">Remarkable Player & Competitor</h3>
                  <p className="text-text-muted text-[11px] sm:text-xs">Tactical Mastery on the Board</p>
                </div>
              </div>
              <p className="text-text-muted text-xs sm:text-sm leading-relaxed">
                Chisom was widely recognized across FCA as a remarkably skilled chess player. His games were marked by courageous decision-making, deep calculation, and an exceptional fighting spirit that challenged even the strongest opponents.
              </p>
            </div>

            {/* FCA Eternal Title */}
            <div className="p-4 sm:p-5 rounded-xl bg-surface/40 border border-chess-border hover:border-purple-500/30 transition-colors space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 text-purple-400">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-text text-sm sm:text-base">FCA Eternal Title [FET]</h3>
                  <p className="text-text-muted text-[11px] sm:text-xs">Sole Reserved Title</p>
                </div>
              </div>
              <p className="text-text-muted text-xs sm:text-sm leading-relaxed">
                The highest and most exclusive title in FCA history, created solely for Chisom Howell. This title is unattainable by any other player, serving as a permanent tribute to his memory and contributions.
              </p>
            </div>

            {/* Immortalized Rating */}
            <div className="p-4 sm:p-5 rounded-xl bg-surface/40 border border-chess-border hover:border-purple-500/30 transition-colors space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-heading font-bold text-xs sm:text-sm">
                  2500
                </div>
                <div>
                  <h3 className="font-semibold text-text text-sm sm:text-base">Immortalized Peak Rating</h3>
                  <p className="text-text-muted text-[11px] sm:text-xs">2500 Elo Across All Formats</p>
                </div>
              </div>
              <p className="text-text-muted text-xs sm:text-sm leading-relaxed">
                His rating is permanently set at 2500 Elo across Blitz, Rapid, Bullet, and Classical formats — representing elite chess performance and honor within the association.
              </p>
            </div>

            {/* Academic & Online Identity */}
            <div className="p-4 sm:p-5 rounded-xl bg-surface/40 border border-chess-border hover:border-purple-500/30 transition-colors space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-neon-green/20 flex items-center justify-center flex-shrink-0 text-neon-green">
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-text text-sm sm:text-base">SICT Scholar & Lichess Competitor</h3>
                  <p className="text-text-muted text-[11px] sm:text-xs">Software Engineering • @strengthofLSB</p>
                </div>
              </div>
              <p className="text-text-muted text-xs sm:text-sm leading-relaxed">
                A Software Engineering student in the School of Information & Communication Technology (SICT), Chisom actively represented his passion online under the handle <strong className="text-purple-300">@strengthofLSB</strong>.
              </p>
            </div>

          </div>
        </div>

        {/* Protected Profile Banner */}
        <div className="glass-card p-5 sm:p-6 text-center border border-purple-500/20 space-y-2.5 sm:space-y-3">
          <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-purple-400 mx-auto" />
          <p className="text-text-muted text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">
            "Those who light their candle in the darkest hour shall forever be remembered as a beacon of light."
          </p>
          <p className="text-purple-400 text-[11px] sm:text-xs font-semibold uppercase tracking-wider">— FCA Memorial Registry</p>
        </div>

      </div>
    </div>
  );
}




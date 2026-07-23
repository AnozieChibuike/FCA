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
    <div className="min-h-screen px-4 sm:px-6 pt-24 sm:pt-28 pb-12 sm:pb-16">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Hero Card / Profile Header */}
        <div className="glass-card p-6 sm:p-10 relative overflow-hidden border-purple-500/30">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8 relative z-10">
            {/* Picture Frame */}
            <div className="relative group flex-shrink-0">
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20 bg-surface relative">
                <img
                  src="/chisom-howell.jpeg"
                  alt="Chisom Howell playing chess"
                  className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="absolute -bottom-2 -right-2">
                <span className="fet-shimmer-badge px-3 py-1 rounded-md text-xs font-black shadow-lg">FET</span>
              </div>
            </div>

            {/* Profile Info */}
            <div className="text-center md:text-left flex-1 space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs select-none">
                <Star className="w-3.5 h-3.5" />
                In Memoriam — FCA Eternal
              </div>

              <h1 className="font-extrabold text-3xl sm:text-5xl tracking-wide text-white">
                Chisom Howell
              </h1>

              <p className="text-purple-300/90 font-medium text-sm sm:text-base">
                Notable Player & Immortal Legend of FUTO Chess Association
              </p>

              {/* Badges / Chips */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface/80 border border-chess-border text-xs text-text-muted">
                  <GraduationCap className="w-3.5 h-3.5 text-primary" />
                  <span><strong className="text-text">SICT</strong> • Software Engineering</span>
                </div>

                <a
                  href="https://lichess.org/@/strengthofLSB"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs text-purple-300 hover:bg-purple-500/20 transition-colors"
                >
                  <span className="font-bold">Lichess:</span>
                  <span>@strengthofLSB</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Tribute Quote */}
        <div className="glass-card p-6 sm:p-8 border-l-4 border-l-purple-500">
          <Quote className="w-7 h-7 text-purple-400/50 mb-3" />
          <p className="text-text text-base sm:text-lg leading-relaxed italic">
            "In every game played, in every move considered, the spirit of Chisom Howell lives on.
            A truly formidable player with a fierce competitive drive and a sharp tactical mind,
            his passion for chess enriched the FUTO Chess Association and left an indelible mark on all who played against him."
          </p>
        </div>

        {/* Featured Game Section — Chisom vs IM Strzemiecki */}
        <div className="glass-card p-6 sm:p-8 border-2 border-purple-500/30 space-y-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-chess-border pb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <Trophy className="w-3.5 h-3.5" />
                Featured Immortal Game
              </div>
              <h2 className="font-heading text-xl sm:text-2xl text-white tracking-wide flex items-center gap-2">
                The Giant Slayer: Checkmate vs. International Master
              </h2>
              <p className="text-text-muted text-xs sm:text-sm mt-1">
                One of Chisom's final rated games (Feb 11, 2026) — a brilliant 40-move victory over IM Zbigniew Strzemiecki.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={copyPgn}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface/80 border border-chess-border text-xs text-text-muted hover:text-white transition-colors"
                title="Copy Game PGN"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-neon-green" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'PGN Copied' : 'Copy PGN'}</span>
              </button>

              <a
                href="https://lichess.org/8mfdMMdq"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors shadow-md shadow-purple-600/20"
              >
                <span>View on Lichess</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Match Scoreboard */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-surface/60 border border-chess-border rounded-xl p-4 text-center items-center">
            {/* White */}
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <img
                src="/chisom-howell.jpeg"
                alt="Chisom Howell"
                className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/60"
              />
              <div className="text-left">
                <p className="text-white text-sm font-bold flex items-center gap-1.5">
                  strengthofLSB
                  <span className="fet-shimmer-badge px-1 py-0.2 rounded text-[9px]">FET</span>
                </p>
                <p className="text-xs text-text-muted">Chisom Howell • 2294 Elo</p>
              </div>
            </div>

            {/* Match Status / Score */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <Swords className="w-3.5 h-3.5" />
                1 - 0 (CHECKMATE)
              </div>
              <p className="text-[11px] text-text-muted">1+0 Rated Bullet • Move 40</p>
            </div>

            {/* Black */}
            <div className="flex items-center justify-center sm:justify-end gap-3">
              <div className="text-right sm:text-right">
                <p className="text-white text-sm font-bold flex items-center justify-end gap-1.5">
                  <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded text-[10px] font-black border border-amber-500/30">IM</span>
                  StrzemieckiZbigniew
                </p>
                <p className="text-xs text-text-muted">IM Zbigniew Strzemiecki • 2435 Elo</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-surface border border-chess-border flex items-center justify-center text-text-muted font-bold text-xs">
                IM
              </div>
            </div>
          </div>

          {/* Embedded Lichess Interactive Board */}
          <div className="w-full rounded-xl overflow-hidden border border-chess-border shadow-2xl bg-[#161512]">
            <iframe
              src="https://lichess.org/embed/game/8mfdMMdq?theme=dark&bg=dark"
              width="100%"
              height="480"
              frameBorder="0"
              allowTransparency={true}
              className="w-full min-h-[440px] sm:min-h-[480px] rounded-xl"
              title="Chisom Howell vs IM Strzemiecki - Lichess Game"
            ></iframe>
          </div>

          {/* Move-by-Move Commentary Highlights */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold text-purple-300 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Key Tactical Highlights
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-surface/50 border border-chess-border space-y-1">
                <span className="text-amber-400 font-mono font-bold">16... Nf3+ 17. Kg2!</span>
                <p className="text-text-muted leading-relaxed">
                  Refuting Black's aggressive knight sacrifice with cold precision and calm defensive play.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-surface/50 border border-chess-border space-y-1">
                <span className="text-purple-400 font-mono font-bold">19. Rh1! 21. Rh3!</span>
                <p className="text-text-muted leading-relaxed">
                  Repelling Black's queen attack, seizing open rooks on the h-file, and taking full control.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-surface/50 border border-chess-border space-y-1">
                <span className="text-emerald-400 font-mono font-bold">40. R1c5# (1-0)</span>
                <p className="text-text-muted leading-relaxed">
                  Delivering a stunning checkmate to seal victory over an International Master.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Legacy & Achievements Grid */}
        <div className="glass-card p-6 sm:p-8 space-y-6">
          <h2 className="font-heading text-xl tracking-wider flex items-center gap-2 text-white">
            <Heart className="w-5 h-5 text-cta" />
            Legacy, Skill & Tributes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Tactical Brilliance */}
            <div className="p-5 rounded-xl bg-surface/40 border border-chess-border hover:border-purple-500/30 transition-colors space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-text text-base">Remarkable Player & Competitor</h3>
                  <p className="text-text-muted text-xs">Tactical Mastery on the Board</p>
                </div>
              </div>
              <p className="text-text-muted text-sm leading-relaxed">
                Chisom was widely recognized across FCA as a remarkably skilled chess player. His games were marked by courageous decision-making, deep calculation, and an exceptional fighting spirit that challenged even the strongest opponents.
              </p>
            </div>

            {/* FCA Eternal Title */}
            <div className="p-5 rounded-xl bg-surface/40 border border-chess-border hover:border-purple-500/30 transition-colors space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 text-purple-400">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-text text-base">FCA Eternal Title [FET]</h3>
                  <p className="text-text-muted text-xs">Sole Reserved Title</p>
                </div>
              </div>
              <p className="text-text-muted text-sm leading-relaxed">
                The highest and most exclusive title in FCA history, created solely for Chisom Howell. This title is unattainable by any other player, serving as a permanent tribute to his memory and contributions.
              </p>
            </div>

            {/* Immortalized Rating */}
            <div className="p-5 rounded-xl bg-surface/40 border border-chess-border hover:border-purple-500/30 transition-colors space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-heading font-bold text-sm">
                  2500
                </div>
                <div>
                  <h3 className="font-semibold text-text text-base">Immortalized Peak Rating</h3>
                  <p className="text-text-muted text-xs">2500 Elo Across All Formats</p>
                </div>
              </div>
              <p className="text-text-muted text-sm leading-relaxed">
                His rating is permanently set at 2500 Elo across Blitz, Rapid, Bullet, and Classical formats — representing elite chess performance and honor within the association.
              </p>
            </div>

            {/* Academic & Online Identity */}
            <div className="p-5 rounded-xl bg-surface/40 border border-chess-border hover:border-purple-500/30 transition-colors space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-neon-green/20 flex items-center justify-center flex-shrink-0 text-neon-green">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-text text-base">SICT Scholar & Lichess Competitor</h3>
                  <p className="text-text-muted text-xs">Software Engineering • @strengthofLSB</p>
                </div>
              </div>
              <p className="text-text-muted text-sm leading-relaxed">
                A Software Engineering student in the School of Information & Communication Technology (SICT), Chisom actively represented his passion online under the handle <strong className="text-purple-300">@strengthofLSB</strong>.
              </p>
            </div>

          </div>
        </div>

        {/* Protected Profile Banner */}
        <div className="glass-card p-6 text-center border border-purple-500/20 space-y-3">
          <Shield className="w-8 h-8 text-purple-400 mx-auto" />
          <p className="text-text-muted text-sm leading-relaxed max-w-xl mx-auto">
            "Those who light their candle in the darkest hour shall forever be remembered as a beacon of light."
          </p>
          <p className="text-purple-400 text-xs font-semibold uppercase tracking-wider">— FCA Memorial Registry</p>
        </div>

      </div>
    </div>
  );
}



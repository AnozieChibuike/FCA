import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Swords, Upload, AlertTriangle, CheckCircle, XCircle, Loader2,
  Shield, ArrowLeft, ArrowRight, Crown,
  ExternalLink, History, RefreshCw, Check, Trophy
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { fetchAndPreviewArena, commitArenaImport, extractLichessGameId } from '../lib/lichess';
import { calculateElo, getKFactor, getTitleForRating } from '../lib/elo';
import type { PreviewGame, ArenaImportReport, Game, Profile, GameMode } from '../types';

type Step = 'form' | 'preview' | 'confirming' | 'done';
type ConsoleTab = 'arena' | 'otb';

export default function AdminConsole() {
  const { isAdmin, isArbiter, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<ConsoleTab>('arena');

  // Lichess Arena Importer State
  const [arenaId, setArenaId] = useState('');
  const [eventName, setEventName] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [previewGames, setPreviewGames] = useState<PreviewGame[]>([]);
  const [linked, setLinked] = useState<string[]>([]);
  const [unlinked, setUnlinked] = useState<string[]>([]);
  const [totalRaw, setTotalRaw] = useState(0);
  const [alreadyImportedCount, setAlreadyImportedCount] = useState(0);

  const [commitReport, setCommitReport] = useState<ArenaImportReport | null>(null);

  // OTB Logging State
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [otbWhiteId, setOtbWhiteId] = useState('');
  const [otbBlackId, setOtbBlackId] = useState('');
  const [otbMode, setOtbMode] = useState<GameMode>('CLASSICAL');
  const [otbResult, setOtbResult] = useState<number>(1.0); // 1.0 = White win, 0.5 = Draw, 0.0 = Black win
  const [otbEventName, setOtbEventName] = useState('');
  const [otbSubmitting, setOtbSubmitting] = useState(false);
  const [otbSuccess, setOtbSuccess] = useState<string | null>(null);

  // Imported History State
  const [historyGames, setHistoryGames] = useState<Game[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const authenticated = isAdmin || isArbiter;

  useEffect(() => {
    if (authenticated) {
      fetchHistory();
      fetchProfiles();
    }
  }, [authenticated]);

  async function fetchProfiles() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_immortal', false)
      .order('full_name');
    if (data) setAllProfiles(data as unknown as Profile[]);
  }

  async function fetchHistory() {
    setLoadingHistory(true);
    const { data } = await supabase
      .from('games')
      .select(`
        *,
        white_player:profiles!white_player_id(id, full_name, fca_id, earned_title),
        black_player:profiles!black_player_id(id, full_name, fca_id, earned_title)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setHistoryGames(data as unknown as Game[]);
    }
    setLoadingHistory(false);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-24">
        <div className="glass-card p-10 text-center max-w-md">
          <Shield className="w-16 h-16 text-cta mx-auto mb-4" />
          <h1 className="font-heading text-2xl tracking-wider mb-3">Access Denied</h1>
          <p className="text-text-muted text-sm mb-6">
            You must be logged in as an Admin or Arbiter to import arenas.
          </p>
          <Link to="/login" className="btn-primary inline-flex items-center gap-2">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  async function handlePreview() {
    if (!arenaId.trim()) {
      setError('Please provide a Lichess Arena ID or URL.');
      return;
    }
    if (!eventName.trim()) {
      setError('Please provide an Event Name.');
      return;
    }

    setLoading(true);
    setError('');

    const cleanedId = arenaId.replace(/https?:\/\/lichess\.org\/tournament\//, '').trim();

    try {
      const result = await fetchAndPreviewArena(cleanedId);
      setPreviewGames(result.games);
      setLinked(result.linkedUsernames);
      setUnlinked(result.unlinkedUsernames);
      setTotalRaw(result.totalRawGames);
      setAlreadyImportedCount(result.alreadyImportedCount);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch arena data.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmImport() {
    setStep('confirming');
    setLoading(true);
    setError('');

    try {
      const report = await commitArenaImport(previewGames, eventName);
      setCommitReport(report);
      setStep('done');
      fetchHistory(); // Refresh history list after commit
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to commit import.');
      setStep('preview');
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setArenaId('');
    setEventName('');
    setStep('form');
    setPreviewGames([]);
    setLinked([]);
    setUnlinked([]);
    setTotalRaw(0);
    setAlreadyImportedCount(0);
    setCommitReport(null);
    setError('');
  }

  async function handleLogOtbGame(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setOtbSuccess(null);

    if (!otbWhiteId || !otbBlackId) {
      setError('Please select both White and Black players.');
      return;
    }
    if (otbWhiteId === otbBlackId) {
      setError('White and Black players must be different players.');
      return;
    }
    if (!otbEventName.trim()) {
      setError('Please enter an Event / Match Name.');
      return;
    }

    setOtbSubmitting(true);
    try {
      const white = allProfiles.find((p) => p.id === otbWhiteId);
      const black = allProfiles.find((p) => p.id === otbBlackId);

      if (!white || !black) throw new Error('Selected player profiles could not be found.');

      const getStats = (p: Profile) => {
        switch (otbMode) {
          case 'RAPID': return { elo: p.rapid_elo, games: p.rapid_games, peak: p.peak_rapid_elo };
          case 'BULLET': return { elo: p.bullet_elo, games: p.bullet_games, peak: p.peak_bullet_elo };
          case 'CLASSICAL': return { elo: p.classical_elo, games: p.classical_games, peak: p.peak_classical_elo };
          default: return { elo: p.blitz_elo, games: p.blitz_games, peak: p.peak_blitz_elo };
        }
      };

      const wStats = getStats(white);
      const bStats = getStats(black);

      const kWhite = getKFactor(wStats.games);
      const kBlack = getKFactor(bStats.games);

      const { newA, newB } = calculateElo(wStats.elo, bStats.elo, otbResult, kWhite, kBlack);

      const { error: gameErr } = await supabase.from('games').insert({
        white_player_id: white.id,
        black_player_id: black.id,
        mode: otbMode,
        result: otbResult,
        source: 'OTB_MANUAL',
        is_official: true,
        event_name: otbEventName,
      });

      if (gameErr) throw gameErr;

      const updateW: Record<string, number | string> = {};
      if (otbMode === 'RAPID') {
        updateW.rapid_elo = newA;
        updateW.rapid_games = white.rapid_games + 1;
        updateW.peak_rapid_elo = Math.max(white.peak_rapid_elo, newA);
      } else if (otbMode === 'BULLET') {
        updateW.bullet_elo = newA;
        updateW.bullet_games = white.bullet_games + 1;
        updateW.peak_bullet_elo = Math.max(white.peak_bullet_elo, newA);
      } else if (otbMode === 'CLASSICAL') {
        updateW.classical_elo = newA;
        updateW.classical_games = white.classical_games + 1;
        updateW.peak_classical_elo = Math.max(white.peak_classical_elo, newA);
      } else {
        updateW.blitz_elo = newA;
        updateW.blitz_games = white.blitz_games + 1;
        updateW.peak_blitz_elo = Math.max(white.peak_blitz_elo, newA);
      }

      const peakW = Math.max(
        otbMode === 'BLITZ' ? newA : white.peak_blitz_elo,
        otbMode === 'RAPID' ? newA : white.peak_rapid_elo,
        otbMode === 'BULLET' ? newA : white.peak_bullet_elo,
        otbMode === 'CLASSICAL' ? newA : white.peak_classical_elo
      );
      const titleW = getTitleForRating(peakW);
      if (titleW !== 'NONE') updateW.earned_title = titleW;

      await supabase.from('profiles').update(updateW).eq('id', white.id);

      const updateB: Record<string, number | string> = {};
      if (otbMode === 'RAPID') {
        updateB.rapid_elo = newB;
        updateB.rapid_games = black.rapid_games + 1;
        updateB.peak_rapid_elo = Math.max(black.peak_rapid_elo, newB);
      } else if (otbMode === 'BULLET') {
        updateB.bullet_elo = newB;
        updateB.bullet_games = black.bullet_games + 1;
        updateB.peak_bullet_elo = Math.max(black.peak_bullet_elo, newB);
      } else if (otbMode === 'CLASSICAL') {
        updateB.classical_elo = newB;
        updateB.classical_games = black.classical_games + 1;
        updateB.peak_classical_elo = Math.max(black.peak_classical_elo, newB);
      } else {
        updateB.blitz_elo = newB;
        updateB.blitz_games = black.blitz_games + 1;
        updateB.peak_blitz_elo = Math.max(black.peak_blitz_elo, newB);
      }

      const peakB = Math.max(
        otbMode === 'BLITZ' ? newB : black.peak_blitz_elo,
        otbMode === 'RAPID' ? newB : black.peak_rapid_elo,
        otbMode === 'BULLET' ? newB : black.peak_bullet_elo,
        otbMode === 'CLASSICAL' ? newB : black.peak_classical_elo
      );
      const titleB = getTitleForRating(peakB);
      if (titleB !== 'NONE') updateB.earned_title = titleB;

      await supabase.from('profiles').update(updateB).eq('id', black.id);

      const diffA = newA - wStats.elo;
      const diffB = newB - bStats.elo;

      setOtbSuccess(
        `OTB Game Logged Successfully! White (${white.full_name}): ${wStats.elo} → ${newA} (${diffA >= 0 ? '+' : ''}${diffA}) | Black (${black.full_name}): ${bStats.elo} → ${newB} (${diffB >= 0 ? '+' : ''}${diffB})`
      );

      setOtbWhiteId('');
      setOtbBlackId('');
      setOtbEventName('');
      fetchProfiles();
      fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log OTB game.');
    } finally {
      setOtbSubmitting(false);
    }
  }

  const playableGamesCount = previewGames.filter(g => !g.isAlreadyImported).length;

  return (
    <div className="min-h-screen px-4 sm:px-6 pt-22 sm:pt-28 pb-12 sm:pb-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <Swords className="w-9 h-9 sm:w-10 sm:h-10 text-cta mx-auto mb-3 sm:mb-4" />
          <h1 className="font-heading text-2xl sm:text-3xl tracking-wider mb-2 sm:mb-3">Arbiter Console</h1>
          <p className="text-text-muted text-xs sm:text-sm">Import online Lichess Arenas or log official Over-The-Board campus matches</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 mb-6 sm:mb-8">
          <button
            onClick={() => { setActiveTab('arena'); setError(''); }}
            className={`px-4 sm:px-5 py-2.5 min-h-[44px] rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-[0.98] ${
              activeTab === 'arena'
                ? 'bg-primary text-white shadow-md'
                : 'bg-surface text-text-muted border border-chess-border hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Lichess Arena Importer</span>
          </button>

          <button
            onClick={() => { setActiveTab('otb'); setError(''); }}
            className={`px-4 sm:px-5 py-2.5 min-h-[44px] rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-[0.98] ${
              activeTab === 'otb'
                ? 'bg-primary text-white shadow-md'
                : 'bg-surface text-text-muted border border-chess-border hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Log OTB Campus Match</span>
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-cta/10 border border-cta/20 text-cta text-sm mb-6">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* TAB 1: LICHESS ARENA */}
        {activeTab === 'arena' && (
          <>
            <div className="flex items-center justify-center gap-2 mb-8">
              {(['form', 'preview', 'done'] as Step[]).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    ${step === s || (step === 'confirming' && s === 'preview')
                      ? 'bg-primary text-white'
                      : (s === 'preview' && step === 'done')
                        ? 'bg-neon-green/20 text-neon-green border border-neon-green/30'
                        : 'bg-surface text-text-muted border border-primary/20'
                    }`}>
                    {i + 1}
                  </div>
                  <span className={`text-xs hidden sm:inline
                    ${step === s ? 'text-text' : 'text-text-muted'}`}>
                    {s === 'form' ? 'Enter Details' : s === 'preview' ? 'Review Games' : 'Complete'}
                  </span>
                  {i < 2 && <div className="w-8 h-px bg-primary/20 mx-1" />}
                </div>
              ))}
            </div>

            {/* STEP 1: Form */}
            {step === 'form' && (
              <div className="glass-card p-6 md:p-8">
                <h2 className="font-heading text-lg tracking-wider mb-6 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Lichess Arena Importer
                </h2>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="arenaId" className="block text-sm font-medium text-text mb-2">
                      Lichess Arena ID or URL
                    </label>
                    <input
                      id="arenaId"
                      type="text"
                      value={arenaId}
                      onChange={(e) => setArenaId(e.target.value)}
                      className="input-field"
                      placeholder="e.g., https://lichess.org/tournament/xxxxx or xxxxx"
                    />
                    <p className="text-text-muted text-xs mt-1">
                      Paste the full tournament URL or tournament ID
                    </p>
                  </div>

                  <div>
                    <label htmlFor="eventName" className="block text-sm font-medium text-text mb-2">
                      Event Name
                    </label>
                    <input
                      id="eventName"
                      type="text"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      className="input-field"
                      placeholder="e.g., FCA Weekly Blitz - Week 12"
                    />
                  </div>

                  <button
                    onClick={handlePreview}
                    disabled={loading}
                    className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Fetching Arena Games...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-5 h-5" />
                        Fetch & Preview Games
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: OTB LOGGING */}
        {activeTab === 'otb' && (
          <div className="glass-card p-6 md:p-8">
            <h2 className="font-heading text-lg tracking-wider mb-6 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Log Over-The-Board (OTB) Campus Match
            </h2>

            {otbSuccess && (
              <div className="flex items-start gap-2 p-3.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs md:text-sm mb-6 leading-relaxed">
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>{otbSuccess}</span>
              </div>
            )}

            <form onSubmit={handleLogOtbGame} className="space-y-6">
              {/* White & Black Player Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#1A1917] p-4 rounded-lg border border-chess-border">
                  <label htmlFor="otbWhiteId" className="block text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-white border border-gray-400" />
                    White Player
                  </label>
                  <select
                    id="otbWhiteId"
                    value={otbWhiteId}
                    onChange={(e) => setOtbWhiteId(e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="">-- Select White Player --</option>
                    {allProfiles.map((p) => (
                      <option key={`w-${p.id}`} value={p.id} disabled={p.id === otbBlackId}>
                        {p.full_name} ({p.fca_id || 'FCA Player'}) — Elo: {p.blitz_elo}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-[#1A1917] p-4 rounded-lg border border-chess-border">
                  <label htmlFor="otbBlackId" className="block text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-gray-900 border border-gray-600" />
                    Black Player
                  </label>
                  <select
                    id="otbBlackId"
                    value={otbBlackId}
                    onChange={(e) => setOtbBlackId(e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="">-- Select Black Player --</option>
                    {allProfiles.map((p) => (
                      <option key={`b-${p.id}`} value={p.id} disabled={p.id === otbWhiteId}>
                        {p.full_name} ({p.fca_id || 'FCA Player'}) — Elo: {p.blitz_elo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Time Control Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Time Control Format
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['BLITZ', 'RAPID', 'BULLET', 'CLASSICAL'] as GameMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setOtbMode(m)}
                      className={`px-3 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        otbMode === m
                          ? 'bg-primary text-white border border-primary'
                          : 'bg-[#1A1917] text-text-muted border border-chess-border hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Match Result Selection */}
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Match Outcome
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setOtbResult(1.0)}
                    className={`px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all cursor-pointer ${
                      otbResult === 1.0
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/80 shadow-md'
                        : 'bg-[#1A1917] text-text-muted border border-chess-border hover:text-white'
                    }`}
                  >
                    1 - 0 (White Wins)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtbResult(0.5)}
                    className={`px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all cursor-pointer ${
                      otbResult === 0.5
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/80 shadow-md'
                        : 'bg-[#1A1917] text-text-muted border border-chess-border hover:text-white'
                    }`}
                  >
                    ½ - ½ (Draw)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtbResult(0.0)}
                    className={`px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all cursor-pointer ${
                      otbResult === 0.0
                        ? 'bg-rose-950 text-rose-300 border border-rose-500/80 shadow-md'
                        : 'bg-[#1A1917] text-text-muted border border-chess-border hover:text-white'
                    }`}
                  >
                    0 - 1 (Black Wins)
                  </button>
                </div>
              </div>

              {/* Event Name Input */}
              <div>
                <label htmlFor="otbEventName" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Event / Match Description
                </label>
                <input
                  id="otbEventName"
                  type="text"
                  value={otbEventName}
                  onChange={(e) => setOtbEventName(e.target.value)}
                  className="input-field text-sm"
                  placeholder="e.g., FUTO Campus Classical Championship 2026 - Round 1"
                />
              </div>

              <button
                type="submit"
                disabled={otbSubmitting}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50 cursor-pointer"
              >
                {otbSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recording OTB Game & Calculating Elo...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Submit & Log OTB Match
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: Preview */}
        {step === 'preview' && (
          <div>
            <div className="glass-card p-6 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="font-heading text-lg tracking-wider">
                    Review: {eventName}
                  </h2>
                  <p className="text-text-muted text-sm mt-1">
                    <span className="text-primary font-bold">{playableGamesCount} new games to commit</span> · {alreadyImportedCount} already imported (will skip) · {totalRaw} total in arena · {unlinked.length} unlinked
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('form')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-chess-border
                               text-text-muted text-sm hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={playableGamesCount === 0 || loading}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Commit {playableGamesCount} New Games
                  </button>
                </div>
              </div>
            </div>

            {alreadyImportedCount > 0 && (
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs mb-6 flex items-center gap-2">
                <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  <strong>Duplicate Protection Active:</strong> {alreadyImportedCount} game(s) in this arena were already imported previously and will be automatically skipped to prevent double rating calculations.
                </span>
              </div>
            )}

            {/* Linked & Unlinked Players Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {linked.length > 0 && (
                <div className="glass-card p-4 sm:p-5 border-l-4 border-l-emerald-500 bg-emerald-950/20">
                  <h3 className="text-xs sm:text-sm font-bold text-emerald-400 mb-2.5 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {linked.length} Linked FCA Players Spotted
                  </h3>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
                    {linked.map((u) => (
                      <span key={u} className="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 text-xs font-mono border border-emerald-500/40">
                        @{u}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {unlinked.length > 0 && (
                <div className="glass-card p-4 sm:p-5 border-l-4 border-l-yellow-400 bg-yellow-950/10">
                  <h3 className="text-xs sm:text-sm font-bold text-yellow-400 mb-2.5 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    {unlinked.length} Unlinked Players Skipped
                  </h3>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
                    {unlinked.map((u) => (
                      <span key={u} className="px-2.5 py-1 rounded-full bg-[#161512] text-text-muted text-xs font-mono border border-chess-border">
                        @{u}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {previewGames.length === 0 ? (
              <div className="glass-card p-10 text-center">
                <XCircle className="w-10 h-10 text-cta mx-auto mb-3" />
                <p className="text-text-muted">No matched FCA games found in this arena.</p>
                <button onClick={() => setStep('form')} className="btn-primary mt-4 text-sm">
                  Try Another Arena
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="hidden md:flex glass-card p-4 items-center text-xs text-text-muted font-medium">
                  <span className="w-8 text-center">#</span>
                  <span className="flex-1 ml-3">White</span>
                  <span className="w-28 text-center">Result</span>
                  <span className="flex-1 mr-3 text-right">Black</span>
                  <span className="w-28 text-center">Lichess Link</span>
                </div>

                {previewGames.map((game, i) => {
                  const whiteEloDiff = game.whiteEloNew - game.whiteEloOld;
                  const blackEloDiff = game.blackEloNew - game.blackEloOld;

                  return (
                    <div
                      key={i}
                      className={`glass-card p-4 transition-colors border-emerald-500/30 bg-emerald-950/10 ${
                        game.isAlreadyImported ? 'opacity-60 bg-[#1e1c19] border-chess-border' : ''
                      }`}
                    >
                      {/* MOBILE VIEW (< md): Stacked non-overlapping layout */}
                      <div className="md:hidden space-y-3">
                        <div className="flex items-center justify-between border-b border-chess-border/60 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-text-muted bg-[#161512] px-2 py-0.5 rounded border border-chess-border">
                              #{i + 1}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                              game.result === 1.0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-600' :
                              game.result === 0.0 ? 'bg-red-950 text-red-300 border border-red-700' :
                              'bg-yellow-950 text-yellow-300 border border-yellow-700'
                            }`}>
                              {game.resultLabel}
                            </span>
                            {game.isAlreadyImported && (
                              <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-600/60 px-1.5 py-0.5 rounded font-semibold">
                                Already Imported
                              </span>
                            )}
                          </div>

                          <a
                            href={game.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                          >
                            <span>Lichess</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* White Player Mobile Card */}
                          <div className="bg-[#161512] p-3 rounded-md border border-emerald-500/30 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-white border border-gray-400 flex-shrink-0" />
                                <span className="text-xs font-bold text-emerald-400 truncate">{game.whitePlayer.full_name}</span>
                                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              </div>
                              <p className="text-[11px] text-emerald-300 font-mono">@{game.whiteLichessHandle || game.whitePlayer.lichess_username}</p>
                            </div>
                            <p className="text-xs text-text-muted mt-2 font-medium">
                              Elo: <span className="text-white font-semibold">{game.whiteEloOld}</span>
                              {whiteEloDiff !== 0 && !game.isAlreadyImported && (
                                <span className={whiteEloDiff > 0 ? 'text-emerald-400 font-bold ml-1' : 'text-red-400 font-bold ml-1'}>
                                  ({whiteEloDiff > 0 ? '+' : ''}{whiteEloDiff})
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Black Player Mobile Card */}
                          <div className="bg-[#161512] p-3 rounded-md border border-emerald-500/30 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-gray-900 border border-gray-600 flex-shrink-0" />
                                <span className="text-xs font-bold text-emerald-400 truncate">{game.blackPlayer.full_name}</span>
                                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              </div>
                              <p className="text-[11px] text-emerald-300 font-mono">@{game.blackLichessHandle || game.blackPlayer.lichess_username}</p>
                            </div>
                            <p className="text-xs text-text-muted mt-2 font-medium">
                              Elo: <span className="text-white font-semibold">{game.blackEloOld}</span>
                              {blackEloDiff !== 0 && !game.isAlreadyImported && (
                                <span className={blackEloDiff > 0 ? 'text-emerald-400 font-bold ml-1' : 'text-red-400 font-bold ml-1'}>
                                  ({blackEloDiff > 0 ? '+' : ''}{blackEloDiff})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* DESKTOP VIEW (>= md): Full horizontal row */}
                      <div className="hidden md:flex md:items-center md:gap-3 text-sm">
                        <span className="w-8 text-center text-text-muted text-xs font-mono">{i + 1}</span>

                        {/* White Player */}
                        <div className="flex-1 min-w-0 ml-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded">
                              <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                              <span className="truncate">{game.whitePlayer.full_name}</span>
                            </span>
                            <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950/50 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                              @{game.whiteLichessHandle || game.whitePlayer.lichess_username}
                            </span>
                          </div>
                          <p className="text-text-muted text-xs mt-1">
                            {game.whiteEloOld} {whiteEloDiff !== 0 && !game.isAlreadyImported && (
                              <span className={whiteEloDiff > 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                                ({whiteEloDiff > 0 ? '+' : ''}{whiteEloDiff})
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Result */}
                        <div className="w-28 text-center flex flex-col items-center gap-1">
                          <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold
                            ${game.result === 1.0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-600' :
                              game.result === 0.0 ? 'bg-red-950 text-red-300 border border-red-700' :
                              'bg-yellow-950 text-yellow-300 border border-yellow-700'}`}>
                            {game.resultLabel}
                          </span>
                          {game.isAlreadyImported && (
                            <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-600/60 px-1.5 py-0.2 rounded font-semibold">
                              Already Imported
                            </span>
                          )}
                        </div>

                        {/* Black Player */}
                        <div className="flex-1 min-w-0 mr-2 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950/50 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                              @{game.blackLichessHandle || game.blackPlayer.lichess_username}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded">
                              <span className="truncate">{game.blackPlayer.full_name}</span>
                              <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                            </span>
                          </div>
                          <p className="text-text-muted text-xs mt-1">
                            {game.blackEloOld} {blackEloDiff !== 0 && !game.isAlreadyImported && (
                              <span className={blackEloDiff > 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                                ({blackEloDiff > 0 ? '+' : ''}{blackEloDiff})
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="w-28 text-center">
                          <a
                            href={game.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-light hover:underline font-medium"
                          >
                            <span>Lichess</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Confirming */}
        {step === 'confirming' && (
          <div className="glass-card p-10 text-center">
            <Loader2 className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <h2 className="font-heading text-xl tracking-wider mb-2">Committing New Games</h2>
            <p className="text-text-muted text-sm">Updating ratings and recording {playableGamesCount} new games...</p>
          </div>
        )}

        {/* STEP 4: Done */}
        {step === 'done' && commitReport && (
          <div className="glass-card p-8">
            <div className="text-center mb-8">
              <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="font-heading text-2xl tracking-wider mb-2">Import Complete</h2>
              <p className="text-text-muted">{eventName}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="p-5 rounded-lg bg-green-950/40 border border-green-700/50 text-center">
                <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="font-heading text-3xl text-white">{commitReport.processedGames}</p>
                <p className="text-text-muted text-xs mt-1">New Games Committed</p>
              </div>
              <div className="p-5 rounded-lg bg-amber-950/40 border border-amber-700/50 text-center">
                <Check className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <p className="font-heading text-3xl text-white">{commitReport.skippedDuplicateGames}</p>
                <p className="text-text-muted text-xs mt-1">Duplicates Skipped</p>
              </div>
              <div className="p-5 rounded-lg bg-surface border border-chess-border text-center">
                <AlertTriangle className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                <p className="font-heading text-3xl text-white">{commitReport.skippedUnlinkedGames || unlinked.length}</p>
                <p className="text-text-muted text-xs mt-1">Unlinked Skipped</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/leaderboards"
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Crown className="w-4 h-4" />
                View Leaderboards
              </Link>
              <button
                onClick={resetAll}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-chess-border
                           text-text-muted text-sm hover:text-white transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Import Another Arena
              </button>
            </div>
          </div>
        )}

        {/* IMPORTED GAMES HISTORY TABLE */}
        <div className="glass-card p-6 md:p-8 mt-10">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <h2 className="font-heading text-xl tracking-wider flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Imported Games Log & Details
              </h2>
              <p className="text-text-muted text-xs mt-1">
                All rated Lichess and official FCA games with direct external links
              </p>
            </div>
            <button
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#161512] border border-chess-border text-xs text-text-muted hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loadingHistory ? (
            <div className="py-12 text-center text-text-muted text-sm">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
              Loading imported games...
            </div>
          ) : historyGames.length === 0 ? (
            <div className="py-10 text-center text-text-muted text-sm">
              No games recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-chess-border text-xs text-text-muted uppercase tracking-wider">
                    <th className="p-3">Event / Source</th>
                    <th className="p-3">White Player</th>
                    <th className="p-3 text-center">Result</th>
                    <th className="p-3">Black Player</th>
                    <th className="p-3 text-right">Lichess Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-chess-border/50">
                  {historyGames.map((game) => {
                    const gameId = extractLichessGameId(game);
                    const lichessUrl = game.external_url || (gameId ? `https://lichess.org/${gameId}` : null);

                    return (
                      <tr key={game.id} className="hover:bg-[#2E2B27] transition-colors text-xs">
                        <td className="p-3">
                          <p className="font-semibold text-white truncate max-w-[180px]">
                            {game.event_name.replace(/\s*\[[a-zA-Z0-9]{8,12}\]/, '')}
                          </p>
                          <span className="text-[10px] text-text-muted font-mono">
                            {new Date(game.created_at).toLocaleDateString()}
                          </span>
                        </td>

                        <td className="p-3">
                          <span className="font-medium text-white">
                            {game.white_player?.full_name || 'White'}
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            game.result === 1.0 ? 'bg-green-950 text-green-300 border border-green-700' :
                            game.result === 0.0 ? 'bg-red-950 text-red-300 border border-red-700' :
                            'bg-yellow-950 text-yellow-300 border border-yellow-700'
                          }`}>
                            {game.result === 1.0 ? '1 - 0' : game.result === 0.0 ? '0 - 1' : '½ - ½'}
                          </span>
                        </td>

                        <td className="p-3">
                          <span className="font-medium text-white">
                            {game.black_player?.full_name || 'Black'}
                          </span>
                        </td>

                        <td className="p-3 text-right">
                          {game.source === 'OTB_MANUAL' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[11px] font-semibold">
                              <Trophy className="w-3 h-3" />
                              <span>Campus OTB</span>
                            </span>
                          ) : lichessUrl ? (
                            <a
                              href={lichessUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#161512] border border-chess-border text-primary hover:border-primary/50 transition-colors text-[11px] font-medium"
                            >
                              <span>View Game</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-text-muted text-[10px] opacity-60">FCA Local</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

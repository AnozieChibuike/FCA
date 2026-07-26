import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qimhjsxbnsgitxrmwjss.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbWhqc3hibnNnaXR4cm13anNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MzE0NDIsImV4cCI6MjEwMDMwNzQ0Mn0.eX1VV_buMumMp39zNiHIskq0tPeLwB5nxdIaGoiWX6M';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getKFactor(gamesPlayed) {
  return gamesPlayed < 15 ? 40 : 20;
}

function calculateElo(ratingA, ratingB, scoreA, kA = 20, kB = 20) {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));
  const scoreB = 1 - scoreA;

  const newA = Math.round(ratingA + kA * (scoreA - expectedA));
  const newB = Math.round(ratingB + kB * (scoreB - expectedB));

  return { newA: Math.max(100, newA), newB: Math.max(100, newB) };
}

function getTitleForRating(peakElo) {
  if (peakElo >= 2200) return 'FGM';
  if (peakElo >= 2000) return 'FIM';
  if (peakElo >= 1800) return 'FM';
  if (peakElo >= 1600) return 'FCM';
  return 'NONE';
}

async function runRecalculation() {
  console.log('Fetching profiles...');
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('*');
  if (profErr || !profiles) throw new Error('Failed to fetch profiles: ' + profErr?.message);

  console.log(`Fetched ${profiles.length} profiles.`);

  console.log('Fetching games...');
  const { data: games, error: gamesErr } = await supabase
    .from('games')
    .select('*')
    .order('created_at', { ascending: true });

  if (gamesErr || !games) throw new Error('Failed to fetch games: ' + gamesErr?.message);

  console.log(`Fetched ${games.length} games.`);

  const profileStats = new Map();

  profiles.forEach((p) => {
    const isImmortal = p.is_immortal;
    const defaultElo = isImmortal ? (p.blitz_elo || 2500) : 1200;

    profileStats.set(p.id, {
      id: p.id,
      full_name: p.full_name,
      is_immortal: p.is_immortal,
      earned_title: p.earned_title || 'NONE',
      BLITZ: { elo: defaultElo, games: 0, peak: defaultElo },
      RAPID: { elo: isImmortal ? (p.rapid_elo || defaultElo) : 1200, games: 0, peak: isImmortal ? (p.rapid_elo || defaultElo) : 1200 },
      BULLET: { elo: isImmortal ? (p.bullet_elo || defaultElo) : 1200, games: 0, peak: isImmortal ? (p.bullet_elo || defaultElo) : 1200 },
      CLASSICAL: { elo: isImmortal ? (p.classical_elo || defaultElo) : 1200, games: 0, peak: isImmortal ? (p.classical_elo || defaultElo) : 1200 },
    });
  });

  const gameUpdates = [];

  for (const g of games) {
    const mode = g.mode || 'BLITZ';
    const scoreW = Number(g.result);

    let w = profileStats.get(g.white_player_id);
    let b = profileStats.get(g.black_player_id);

    if (!w) {
      w = { id: g.white_player_id, full_name: 'Unknown White', earned_title: 'NONE', BLITZ: { elo: 1200, games: 0, peak: 1200 }, RAPID: { elo: 1200, games: 0, peak: 1200 }, BULLET: { elo: 1200, games: 0, peak: 1200 }, CLASSICAL: { elo: 1200, games: 0, peak: 1200 } };
      profileStats.set(g.white_player_id, w);
    }

    if (!b) {
      b = { id: g.black_player_id, full_name: 'Unknown Black', earned_title: 'NONE', BLITZ: { elo: 1200, games: 0, peak: 1200 }, RAPID: { elo: 1200, games: 0, peak: 1200 }, BULLET: { elo: 1200, games: 0, peak: 1200 }, CLASSICAL: { elo: 1200, games: 0, peak: 1200 } };
      profileStats.set(g.black_player_id, b);
    }

    const wModeStats = w[mode];
    const bModeStats = b[mode];

    const wEloOld = wModeStats.elo;
    const bEloOld = bModeStats.elo;

    const kW = getKFactor(wModeStats.games);
    const kB = getKFactor(bModeStats.games);

    const { newA: wEloNew, newB: bEloNew } = calculateElo(wEloOld, bEloOld, scoreW, kW, kB);

    wModeStats.elo = wEloNew;
    wModeStats.games += 1;
    wModeStats.peak = Math.max(wModeStats.peak, wEloNew);

    bModeStats.elo = bEloNew;
    bModeStats.games += 1;
    bModeStats.peak = Math.max(bModeStats.peak, bEloNew);

    gameUpdates.push({
      id: g.id,
      white_elo_before: wEloOld,
      white_elo_after: wEloNew,
      black_elo_before: bEloOld,
      black_elo_after: bEloNew,
    });
  }

  console.log(`Prepared ${gameUpdates.length} game snapshot updates.`);

  // Update games in batches of 15
  const BATCH_SIZE = 15;
  for (let i = 0; i < gameUpdates.length; i += BATCH_SIZE) {
    const batch = gameUpdates.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((gu) =>
        supabase
          .from('games')
          .update({
            white_elo_before: gu.white_elo_before,
            white_elo_after: gu.white_elo_after,
            black_elo_before: gu.black_elo_before,
            black_elo_after: gu.black_elo_after,
          })
          .eq('id', gu.id)
      )
    );
  }

  console.log('Games updated successfully. Updating profile ratings...');

  const profileArray = Array.from(profileStats.entries());
  for (let i = 0; i < profileArray.length; i += BATCH_SIZE) {
    const batch = profileArray.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(([profId, pStats]) => {
        const maxPeak = Math.max(
          pStats.BLITZ.peak,
          pStats.RAPID.peak,
          pStats.BULLET.peak,
          pStats.CLASSICAL.peak
        );

        const title = getTitleForRating(maxPeak);

        const updatePayload = {
          blitz_elo: pStats.BLITZ.elo,
          blitz_games: pStats.BLITZ.games,
          peak_blitz_elo: pStats.BLITZ.peak,

          rapid_elo: pStats.RAPID.elo,
          rapid_games: pStats.RAPID.games,
          peak_rapid_elo: pStats.RAPID.peak,

          bullet_elo: pStats.BULLET.elo,
          bullet_games: pStats.BULLET.games,
          peak_bullet_elo: pStats.BULLET.peak,

          classical_elo: pStats.CLASSICAL.elo,
          classical_games: pStats.CLASSICAL.games,
          peak_classical_elo: pStats.CLASSICAL.peak,
        };

        if (title !== 'NONE' && !pStats.is_immortal) {
          updatePayload.earned_title = title;
        }

        return supabase.from('profiles').update(updatePayload).eq('id', profId);
      })
    );
  }

  console.log('Global Elo recalculation and backfill complete!');
}

runRecalculation().catch((err) => console.error(err));

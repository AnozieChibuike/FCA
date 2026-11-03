// Sharing: native share sheet on phones (WhatsApp status, groups), clipboard fallback on desktop,
// and generated image cards so results travel outside the site.

export type ShareOutcome = 'shared' | 'copied' | 'downloaded' | 'cancelled';

export function siteUrl(path = '') {
  return `${window.location.origin}${path}`;
}

export function inviteUrl(fcaId: string) {
  return siteUrl(`/join?ref=${encodeURIComponent(fcaId)}`);
}

export function whatsappShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

export async function shareLink(opts: { title: string; text: string; url: string }): Promise<ShareOutcome> {
  if (navigator.share) {
    try {
      await navigator.share(opts);
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  await copyText(`${opts.text}\n${opts.url}`);
  return 'copied';
}

export async function shareImage(blob: Blob, filename: string, opts: { title: string; text: string; url: string }): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: opts.title, text: `${opts.text}\n${opts.url}` });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return 'downloaded';
}

// ---------------------------------------------------------------------------
// Image cards (1080 x 1350, the portrait size WhatsApp status and Instagram use)
// ---------------------------------------------------------------------------

const W = 1080;
const H = 1350;
const C = {
  bg: '#161512',
  card: '#262421',
  border: '#363431',
  green: '#81B64C',
  text: '#FFFFFF',
  muted: '#A3A19E',
  gold: '#FACC15',
  silver: '#CBD5E1',
  bronze: '#F59E0B',
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function canvasBase() {
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  // subtle board pattern in the header band
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = C.green;
  for (let x = 0; x < W; x += 90) for (let y = 0; y < 360; y += 90) if (((x + y) / 90) % 2 === 0) ctx.fillRect(x, y, 90, 90);
  ctx.globalAlpha = 1;
  const logo = await loadImage('/icon-192.png');
  if (logo) ctx.drawImage(logo, 72, 64, 72, 72);
  ctx.fillStyle = C.text;
  ctx.font = '800 40px Inter, system-ui, sans-serif';
  ctx.fillText('FCA RATED', 164, 114);
  ctx.fillStyle = C.muted;
  ctx.font = '500 26px Inter, system-ui, sans-serif';
  ctx.fillText('FUTO Chess Association', 166, 150);
  return { canvas, ctx };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

async function drawAvatar(ctx: CanvasRenderingContext2D, src: string | null, name: string, cx: number, cy: number, r: number, ring: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
  ctx.fillStyle = ring;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = C.card;
  ctx.fill();
  ctx.clip();
  const img = src ? await loadImage(src) : null;
  if (img) {
    const s = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = C.muted;
    ctx.font = `800 ${Math.round(r * 0.8)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const parts = name.trim().split(/\s+/);
    ctx.fillText(((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase(), cx, cy + 4);
  }
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function footer(ctx: CanvasRenderingContext2D, line: string) {
  ctx.fillStyle = C.green;
  roundRect(ctx, 72, H - 190, W - 144, 110, 28);
  ctx.fill();
  ctx.fillStyle = '#0B0B0B';
  ctx.font = '800 36px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(fitText(ctx, line, W - 200), W / 2, H - 122);
  ctx.textAlign = 'left';
  ctx.fillStyle = C.muted;
  ctx.font = '500 24px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(window.location.host, W / 2, H - 40);
  ctx.textAlign = 'left';
}

function toBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'));
}

export async function playerCard(p: {
  name: string; avatar: string | null; title: string | null; department: string;
  rating: number; peak: number; rank: number | null; games: number; winRate: number; badges: number;
}) {
  const { canvas, ctx } = await canvasBase();
  await drawAvatar(ctx, p.avatar, p.name, W / 2, 470, 170, C.green);

  ctx.textAlign = 'center';
  ctx.fillStyle = C.text;
  ctx.font = '800 64px Inter, system-ui, sans-serif';
  ctx.fillText(fitText(ctx, p.name, W - 160), W / 2, 740);
  ctx.fillStyle = C.muted;
  ctx.font = '500 30px Inter, system-ui, sans-serif';
  ctx.fillText(fitText(ctx, [p.title, p.department].filter(Boolean).join(' · '), W - 160), W / 2, 790);

  ctx.fillStyle = C.green;
  ctx.font = '900 150px Inter, system-ui, sans-serif';
  ctx.fillText(String(p.rating), W / 2, 960);
  ctx.fillStyle = C.muted;
  ctx.font = '600 28px Inter, system-ui, sans-serif';
  ctx.fillText(`BLITZ RATING${p.rank ? `  ·  RANK #${p.rank}` : ''}`, W / 2, 1006);

  const stats: Array<[string, string]> = [
    [String(p.peak), 'Peak'],
    [String(p.games), 'Games'],
    [`${p.winRate}%`, 'Win rate'],
    [String(p.badges), 'Badges'],
  ];
  const colW = (W - 144) / stats.length;
  stats.forEach(([v, l], i) => {
    const x = 72 + colW * i + colW / 2;
    ctx.fillStyle = C.text;
    ctx.font = '800 46px Inter, system-ui, sans-serif';
    ctx.fillText(v, x, 1096);
    ctx.fillStyle = C.muted;
    ctx.font = '500 24px Inter, system-ui, sans-serif';
    ctx.fillText(l, x, 1132);
  });
  ctx.textAlign = 'left';
  footer(ctx, 'Play rated chess with FUTO — join FCA');
  return toBlob(canvas);
}

export async function eventCard(e: {
  title: string; date: string; players: number;
  podium: Array<{ name: string; avatar: string | null; score: number }>;
  nextLine: string;
}) {
  const { canvas, ctx } = await canvasBase();
  ctx.textAlign = 'center';
  ctx.fillStyle = C.muted;
  ctx.font = '700 28px Inter, system-ui, sans-serif';
  ctx.fillText('RESULTS', W / 2, 260);
  ctx.fillStyle = C.text;
  ctx.font = '800 58px Inter, system-ui, sans-serif';
  ctx.fillText(fitText(ctx, e.title, W - 140), W / 2, 330);
  ctx.fillStyle = C.muted;
  ctx.font = '500 30px Inter, system-ui, sans-serif';
  ctx.fillText(`${e.date}  ·  ${e.players} players`, W / 2, 380);

  // podium: 2nd, 1st, 3rd
  const slots = [
    { idx: 1, x: W / 2 - 320, y: 640, r: 100, color: C.silver, h: 230 },
    { idx: 0, x: W / 2, y: 570, r: 130, color: C.gold, h: 300 },
    { idx: 2, x: W / 2 + 320, y: 680, r: 90, color: C.bronze, h: 190 },
  ];
  for (const s of slots) {
    const p = e.podium[s.idx];
    if (!p) continue;
    await drawAvatar(ctx, p.avatar, p.name, s.x, s.y, s.r, s.color);
    ctx.textAlign = 'center';
    ctx.fillStyle = s.color;
    ctx.font = '900 44px Inter, system-ui, sans-serif';
    ctx.fillText(`#${s.idx + 1}`, s.x, s.y + s.r + 60);
    ctx.fillStyle = C.text;
    ctx.font = '700 34px Inter, system-ui, sans-serif';
    ctx.fillText(fitText(ctx, p.name, 290), s.x, s.y + s.r + 108);
    ctx.fillStyle = C.muted;
    ctx.font = '600 28px Inter, system-ui, sans-serif';
    ctx.fillText(`${p.score} pts`, s.x, s.y + s.r + 148);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = C.muted;
  ctx.font = '600 30px Inter, system-ui, sans-serif';
  ctx.fillText(fitText(ctx, e.nextLine, W - 160), W / 2, 1080);
  ctx.textAlign = 'left';
  footer(ctx, 'Join FCA and get rated every Tuesday');
  return toBlob(canvas);
}

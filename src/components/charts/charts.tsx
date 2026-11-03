import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

// Chart tokens for the dark surface (validated: series 1-3 pass the categorical checks on #262421).
export const CHART = {
  series1: '#6C9E42',
  series2: '#3987e5',
  series3: '#d95926',
  surface: '#262421',
  grid: '#363431',
  axis: '#8B8987',
  text: '#FFFFFF',
};

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceTicks(min: number, max: number, count = 4) {
  if (min === max) { min -= 10; max += 10; }
  const span = max - min;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? 10 * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Math.round(v));
  return { lo, hi, ticks };
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x, 8), Math.max(8, width - 8));
  const alignRight = left > width * 0.6;
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-[120px] rounded-lg border border-chess-border bg-[#1E1C18] px-3 py-2 text-xs shadow-xl"
      style={{ left, top: Math.max(0, y - 8), transform: `translate(${alignRight ? 'calc(-100% - 12px)' : '12px'}, -100%)` }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Line (single series): rating over rated games
// ---------------------------------------------------------------------------

export interface LinePoint {
  y: number;
  label: string;
  detail?: ReactNode;
}

export function LineChart({ points, height = 220, ariaLabel }: { points: LinePoint[]; height?: number; ariaLabel: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 40, r: 48, t: 14, b: 22 };

  const geo = useMemo(() => {
    if (!width || points.length === 0) return null;
    const ys = points.map((p) => p.y);
    const { lo, hi, ticks } = niceTicks(Math.min(...ys), Math.max(...ys), 4);
    const iw = Math.max(10, width - pad.l - pad.r);
    const ih = height - pad.t - pad.b;
    const x = (i: number) => pad.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
    const y = (v: number) => pad.t + ih - ((v - lo) / (hi - lo || 1)) * ih;
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join('');
    const area = `${line}L${x(points.length - 1).toFixed(1)},${(pad.t + ih).toFixed(1)}L${x(0).toFixed(1)},${(pad.t + ih).toFixed(1)}Z`;
    let peak = 0;
    points.forEach((p, i) => { if (p.y > points[peak].y) peak = i; });
    return { x, y, line, area, ticks, ih, peak };
  }, [width, points, height]);

  function onMove(e: PointerEvent<SVGSVGElement>) {
    if (!geo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const iw = width - pad.l - pad.r;
    const i = Math.round(((px - pad.l) / (iw || 1)) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  }

  function onKey(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key === 'ArrowRight') setHover((h) => Math.min(points.length - 1, (h ?? points.length - 1) + 1));
    if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? points.length - 1) - 1));
  }

  const last = points.length - 1;
  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {geo && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          className="touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-lg"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
        >
          {geo.ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={width - pad.r} y1={geo.y(t)} y2={geo.y(t)} stroke={CHART.grid} strokeWidth={1} />
              <text x={pad.l - 8} y={geo.y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={CHART.axis} className="tabular-nums">{t}</text>
            </g>
          ))}
          <path d={geo.area} fill={CHART.series1} opacity={0.1} />
          <path d={geo.line} fill="none" stroke={CHART.series1} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {geo.peak !== last && (
            <g>
              <circle cx={geo.x(geo.peak)} cy={geo.y(points[geo.peak].y)} r={4} fill={CHART.series1} stroke={CHART.surface} strokeWidth={2} />
              <text x={geo.x(geo.peak)} y={geo.y(points[geo.peak].y) - 10} textAnchor="middle" fontSize={11} fill={CHART.axis}>
                Peak {points[geo.peak].y}
              </text>
            </g>
          )}
          <circle cx={geo.x(last)} cy={geo.y(points[last].y)} r={4.5} fill={CHART.series1} stroke={CHART.surface} strokeWidth={2} />
          <text x={geo.x(last) + 9} y={geo.y(points[last].y)} dy="0.32em" fontSize={12} fontWeight={700} fill={CHART.text} className="tabular-nums">
            {points[last].y}
          </text>

          {hover !== null && (
            <g pointerEvents="none">
              <line x1={geo.x(hover)} x2={geo.x(hover)} y1={pad.t} y2={pad.t + geo.ih} stroke={CHART.axis} strokeWidth={1} />
              <circle cx={geo.x(hover)} cy={geo.y(points[hover].y)} r={5} fill={CHART.series1} stroke={CHART.surface} strokeWidth={2} />
            </g>
          )}
          <text x={pad.l} y={height - 4} fontSize={10} fill={CHART.axis}>{points[0].label}</text>
          <text x={width - pad.r} y={height - 4} fontSize={10} fill={CHART.axis} textAnchor="end">{points[last].label}</text>
        </svg>
      )}
      {geo && hover !== null && (
        <Tooltip x={geo.x(hover)} y={geo.y(points[hover].y)} width={width}>
          <div className="text-sm font-bold text-white tabular-nums">{points[hover].y}</div>
          <div className="text-text-muted">{points[hover].label}</div>
          {points[hover].detail && <div className="mt-1 text-text-muted">{points[hover].detail}</div>}
        </Tooltip>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Columns (1-2 stacked series)
// ---------------------------------------------------------------------------

export interface ColumnDatum {
  label: string;
  title?: string;
  values: number[];
}

export function ColumnChart({ data, series, height = 200, ariaLabel }: {
  data: ColumnDatum[]; series: Array<{ name: string; color: string }>; height?: number; ariaLabel: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 32, r: 8, t: 10, b: 24 };

  const geo = useMemo(() => {
    if (!width || data.length === 0) return null;
    const totals = data.map((d) => d.values.reduce((a, b) => a + b, 0));
    const { hi, ticks } = niceTicks(0, Math.max(1, ...totals), 3);
    const iw = width - pad.l - pad.r;
    const ih = height - pad.t - pad.b;
    const band = iw / data.length;
    const bar = Math.min(24, Math.max(6, band * 0.6));
    const y = (v: number) => pad.t + ih - (v / (hi || 1)) * ih;
    const labelEvery = Math.max(1, Math.ceil(52 / band));
    return { band, bar, y, ih, ticks, totals, labelEvery };
  }, [width, data, height]);

  const segPath = (x: number, w: number, yTop: number, yBottom: number, rounded: boolean) => {
    const h = yBottom - yTop;
    if (h <= 0) return '';
    const r = rounded ? Math.min(4, h, w / 2) : 0;
    return `M${x},${yBottom}V${yTop + r}${r ? `Q${x},${yTop} ${x + r},${yTop}` : ''}H${x + w - r}${r ? `Q${x + w},${yTop} ${x + w},${yTop + r}` : ''}V${yBottom}Z`;
  };

  return (
    <div>
      {series.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <div ref={ref} className="relative w-full select-none" style={{ height }}>
        {geo && (
          <svg width={width} height={height} role="img" aria-label={ariaLabel} onPointerLeave={() => setHover(null)}>
            {geo.ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={width - pad.r} y1={geo.y(t)} y2={geo.y(t)} stroke={CHART.grid} strokeWidth={1} />
                <text x={pad.l - 6} y={geo.y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill={CHART.axis}>{t}</text>
              </g>
            ))}
            {data.map((d, i) => {
              const x = pad.l + geo.band * i + (geo.band - geo.bar) / 2;
              let acc = 0;
              const topIndex = d.values.reduce((top, v, si) => (v > 0 ? si : top), -1);
              return (
                <g
                  key={`${d.label}-${i}`}
                  onPointerEnter={() => setHover(i)}
                  onPointerDown={() => setHover(i)}
                  tabIndex={0}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className="outline-none"
                >
                  <rect x={pad.l + geo.band * i} y={pad.t} width={geo.band} height={geo.ih} fill="transparent" />
                  {d.values.map((v, si) => {
                    if (v <= 0) return null;
                    const yBottom = geo.y(acc) - (acc > 0 ? 2 : 0);
                    acc += v;
                    const yTop = geo.y(acc);
                    return (
                      <path
                        key={si}
                        d={segPath(x, geo.bar, yTop, yBottom, si === topIndex)}
                        fill={series[si]?.color ?? CHART.series1}
                        opacity={hover === null || hover === i ? 1 : 0.55}
                      />
                    );
                  })}
                  {i % geo.labelEvery === 0 && (
                    <text x={x + geo.bar / 2} y={height - 6} textAnchor="middle" fontSize={10} fill={CHART.axis}>{d.label}</text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
        {geo && hover !== null && data[hover] && (
          <Tooltip x={pad.l + geo.band * hover + geo.band / 2} y={geo.y(geo.totals[hover])} width={width}>
            <div className="font-semibold text-white">{data[hover].title ?? data[hover].label}</div>
            {data[hover].values.map((v, si) => (
              <div key={si} className="mt-0.5 flex items-center gap-2 text-text-muted">
                <span className="h-0.5 w-3 rounded" style={{ background: series[si]?.color }} />
                <span className="font-bold text-white tabular-nums">{v}</span>
                <span>{series[si]?.name}</span>
              </div>
            ))}
          </Tooltip>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Horizontal bars (single series, value at the tip)
// ---------------------------------------------------------------------------

export function HBarChart({ data, color = CHART.series1 }: { data: Array<{ label: string; value: number }>; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-xs sm:grid-cols-[minmax(0,12rem)_1fr]">
          <span className="truncate text-text-muted" title={d.label}>{d.label}</span>
          <span className="flex items-center gap-2" title={`${d.label}: ${d.value}`}>
            <span className="h-3 rounded-r" style={{ width: `${Math.max(2, (d.value / max) * 100)}%`, background: color, maxWidth: 'calc(100% - 2.5rem)' }} />
            <span className="font-semibold text-white tabular-nums">{d.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

import React, { useMemo, useState, useRef, useLayoutEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import type { OverviewResponse, TimeseriesPoint } from '../lib/types';
import { fmtBucketLabel, fmtCompact, fmtDecimal, fmtDuration, fmtNumber, fmtPct } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { Dropdown } from './Dropdown';

export type MainMetricKey = 'uv' | 'sessions' | 'pv' | 'pv_per_visitor' | 'bounce_rate' | 'visit_duration_ms' | 'avg_duration_ms' | 'bounce_rate_single';

function niceMax(val: number): number {
  if (!Number.isFinite(val) || val <= 0) return 5;
  const exp = Math.pow(10, Math.floor(Math.log10(val)));
  const frac = val / exp;
  let nice = 1;
  if (frac <= 1) nice = 1;
  else if (frac <= 2) nice = 2;
  else if (frac <= 5) nice = 5;
  else nice = 10;
  return nice * exp;
}

export function StatsGraphCard({
  overview,
  points,
  activeMetric,
  onSelectMetric,
  interval,
  onSelectInterval,
  allowedIntervals,
  loading,
}: {
  overview: OverviewResponse | null;
  points: TimeseriesPoint[];
  activeMetric: MainMetricKey;
  onSelectMetric: (m: MainMetricKey) => void;
  interval: string;
  onSelectInterval: (iv: string) => void;
  allowedIntervals: string[];
  loading?: boolean;
}) {
  const { lang, t } = useI18n();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const pagesPerVisitor = useMemo(() => {
    if (!overview || !overview.uv) return 0;
    return overview.pv / overview.uv;
  }, [overview]);

  const kpis: Array<{
    key: MainMetricKey;
    label: string;
    value: string;
    sub?: string;
    title?: string;
  }> = [
    {
      key: 'uv',
      label: t('kpi.uv'),
      value: overview ? fmtCompact(overview.uv) : '—',
      title: overview ? fmtNumber(overview.uv) : undefined,
    },
    {
      key: 'sessions',
      label: t('kpi.sessions'),
      value: overview ? fmtCompact(overview.sessions) : '—',
      title: overview ? fmtNumber(overview.sessions) : undefined,
    },
    {
      key: 'pv',
      label: t('kpi.pv'),
      value: overview ? fmtCompact(overview.pv) : '—',
      title: overview ? fmtNumber(overview.pv) : undefined,
    },
    {
      key: 'pv_per_visitor',
      label: t('kpi.views_per_visit'),
      value: overview ? fmtDecimal(pagesPerVisitor, 2) : '—',
    },
    {
      key: 'bounce_rate',
      label: t('kpi.bounce'),
      value: overview ? fmtPct(overview.bounce_rate, 0) : '—',
    },
    { key: 'bounce_rate_single', label: t('kpi.single_bounce'), value: overview ? fmtPct(overview.bounce_rate_single, 0) : '—' },
    { key: 'avg_duration_ms', label: t('kpi.engaged_time'), value: overview ? fmtDuration(overview.avg_duration_ms) : '—' },
    {
      key: 'visit_duration_ms',
      label: t('kpi.duration'),
      value: overview ? fmtDuration(overview.visit_duration_ms) : '—',
    },
  ];

  // Chart geometry (matches Plausible 1088px card proportions)
  const plotRef = useRef<HTMLDivElement>(null);
  const [W, setWidth] = useState(1040);
  useLayoutEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(1, Math.round(el.getBoundingClientRect().width)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const H = W < 640 ? Math.max(300, Math.min(W, 340)) : 310;
  const padL = 48;
  const padR = 16;
  const padT = 18;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const isPct = activeMetric === 'bounce_rate' || activeMetric === 'bounce_rate_single';
  const isDur = activeMetric === 'visit_duration_ms' || activeMetric === 'avg_duration_ms';
  const isDec = activeMetric === 'pv_per_visitor';

  const formatY = (v: number): string => {
    if (v === 0) return '0';
    if (isPct) return `${Math.round(v * 100)}%`;
    if (isDur) return fmtDuration(v);
    if (isDec) return v.toFixed(1);
    return fmtCompact(v);
  };

  const formatTooltipValue = (v: number | null): string => {
    if (v === null || v === undefined) return '—';
    if (isPct) return fmtPct(v, 1);
    if (isDur) return fmtDuration(v);
    if (isDec) return fmtDecimal(v, 2);
    return fmtNumber(v);
  };

  const chart = useMemo(() => {
    const vals = points.map((p) => (p.value === null || p.value === undefined ? 0 : p.value));
    const rawMax = vals.length ? Math.max(...vals) : 0;
    const yMax = isPct ? Math.max(0.2, Math.min(1, Math.ceil(rawMax * 5) / 5)) : niceMax(rawMax || 5);
    const ticks = 5;
    const yTicks = Array.from({ length: ticks + 1 }, (_, i) => (yMax / ticks) * i);

    const coords = points.map((p, idx) => {
      const v = p.value ?? 0;
      const x = points.length <= 1 ? padL + plotW / 2 : padL + (idx / (points.length - 1)) * plotW;
      const y = padT + plotH - (yMax > 0 ? (v / yMax) * plotH : 0);
      return { x, y, v, p };
    });

    // Split solid vs trailing partial segment
    let solidLine = '';
    let dashedLine = '';
    let areaPath = '';

    if (coords.length > 0) {
      const last = coords[coords.length - 1].p;
      const lastPartial = coords.length > 1 && (last.status === 'partial' || Boolean(last.partial));
      const solidEnd = lastPartial ? coords.length - 1 : coords.length;

      solidLine = coords
        .slice(0, solidEnd)
        .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
        .join(' ');

      if (lastPartial && coords.length >= 2) {
        const a = coords[coords.length - 2];
        const b = coords[coords.length - 1];
        dashedLine = `M${a.x.toFixed(1)},${a.y.toFixed(1)} L${b.x.toFixed(1)},${b.y.toFixed(1)}`;
      }

      const fullLine = coords
        .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
        .join(' ');
      const baseY = (padT + plotH).toFixed(1);
      areaPath = `${fullLine} L${coords[coords.length - 1].x.toFixed(1)},${baseY} L${coords[0].x.toFixed(1)},${baseY} Z`;
    }

    // ~6 evenly spaced X-axis labels (matching Plausible's 27 Oct, 1 Nov, 6 Nov, 11 Nov, 16 Nov, 21 Nov)
    const xLabelCount = Math.min(points.length, W < 500 ? 4 : 6);
    const xLabels: Array<{ idx: number; x: number; label: string }> = [];
    if (points.length === 1) {
      xLabels.push({
        idx: 0,
        x: coords[0].x,
        label: fmtBucketLabel(points[0].label ?? points[0].bucket, interval, lang),
      });
    } else if (xLabelCount > 1) {
      const step = (points.length - 1) / (xLabelCount - 1);
      const seen = new Set<number>();
      for (let i = 0; i < xLabelCount; i++) {
        const idx = Math.round(i * step);
        if (seen.has(idx)) continue;
        seen.add(idx);
        xLabels.push({
          idx,
          x: coords[idx].x,
          label: fmtBucketLabel(points[idx].label ?? points[idx].bucket, interval, lang),
        });
      }
    }

    return { yMax, yTicks, coords, solidLine, dashedLine, areaPath, xLabels };
  }, [points, interval, lang, isPct, plotW, plotH]);

  const activePoint = hoverIdx !== null && chart.coords[hoverIdx] ? chart.coords[hoverIdx] : null;

  return (
    <section className="plausible-card overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-4 px-2.5 pt-2.5 pb-1">
        {kpis.map((kpi) => {
          const isActive = kpi.key === activeMetric;
          return (
            <React.Fragment key={kpi.key}>
              <button
                type="button"
                aria-pressed={isActive}
                data-metric={kpi.key}
                title={kpi.title}
                onClick={() => onSelectMetric(kpi.key)}
                className={`lg:flex-1 text-left px-3.5 py-2.5 rounded-md transition-colors cursor-pointer ${
                  isActive ? 'bg-zinc-100/85' : 'hover:bg-zinc-100/55'
                }`}
              >
                <div
                  className={`text-[11px] font-semibold uppercase tracking-[0.04em] leading-none truncate ${
                    isActive ? 'text-zinc-900' : 'text-zinc-500'
                  }`}
                >
                  {kpi.label}
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-[20px] font-bold text-zinc-900 tabular-nums leading-tight tracking-tight">
                    {kpi.value}
                  </span>
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Main SVG Area/Line Chart (directly underneath KPI strip, no horizontal rule!) */}
      <div className="relative px-4 pt-2 pb-4">
        {/* Subtle top-right interval switcher */}
        {allowedIntervals.length > 1 && (
          <div className="absolute right-6 top-1 z-10">
            <Dropdown
              align="right"
              widthClass="min-w-[120px]"
              value={interval}
              onSelect={onSelectInterval}
              options={allowedIntervals.map((iv) => ({
                value: iv,
                label: t(`interval.${iv}`),
              }))}
              trigger={() => (
                <button
                  type="button"
                  className="h-6 px-2 rounded bg-zinc-100/75 hover:bg-zinc-200/75 text-[11.5px] font-medium text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{t(`interval.${interval}`)}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              )}
            />
          </div>
        )}

        <div ref={plotRef} className={`relative transition-opacity ${loading ? 'opacity-60' : 'opacity-100'}`}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto block select-none"
            onPointerMove={(e) => {
              if (!chart.coords.length) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = ((e.clientX - rect.left) / rect.width) * W;
              let best = 0;
              let bestDist = Infinity;
              for (let i = 0; i < chart.coords.length; i++) {
                const d = Math.abs(chart.coords[i].x - relX);
                if (d < bestDist) {
                  bestDist = d;
                  best = i;
                }
              }
              setHoverIdx(best);
            }}
            onPointerLeave={() => setHoverIdx(null)}
          >
            <defs>
              <linearGradient id="plausible-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal gridlines + Y labels */}
            {chart.yTicks.map((tick, i) => {
              const y = padT + plotH - (chart.yMax > 0 ? (tick / chart.yMax) * plotH : 0);
              const isZero = i === 0;
              return (
                <g key={i}>
                  <line
                    x1={padL}
                    x2={W - padR}
                    y1={y}
                    y2={y}
                    stroke={isZero ? '#d4d4d8' : '#ececee'}
                    strokeWidth={1}
                  />
                  <text
                    x={padL - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill="#71717a"
                    fontSize="11.5"
                    className="tabular-nums"
                  >
                    {formatY(tick)}
                  </text>
                </g>
              );
            })}

            {/* Area fill */}
            {chart.areaPath && <path d={chart.areaPath} fill="url(#plausible-area-grad)" />}

            {/* Solid line */}
            {chart.solidLine && (
              <path
                d={chart.solidLine}
                fill="none"
                stroke="#6366f1"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Dashed trailing partial bucket */}
            {chart.dashedLine && (
              <path
                d={chart.dashedLine}
                fill="none"
                stroke="#6366f1"
                strokeWidth="2"
                strokeDasharray="4 4"
                strokeLinecap="round"
              />
            )}

            {/* Single-point dot */}
            {chart.coords.length === 1 && (
              <circle cx={chart.coords[0].x} cy={chart.coords[0].y} r={4} fill="#6366f1" />
            )}

            {/* Subtle invalid-traffic indicator dots along baseline (only when >0 invalid events in bucket) */}
            {chart.coords.map((c, i) =>
              c.p.invalid && c.p.invalid > 0 ? (
                <circle
                  key={`inv-${i}`}
                  cx={c.x}
                  cy={padT + plotH}
                  r={2.5}
                  fill="#6366f1"
                  opacity={0.75}
                />
              ) : null,
            )}

            {/* X-axis labels */}
            {chart.xLabels.map((xl) => (
              <text
                key={xl.idx}
                x={xl.x}
                y={H - 8}
                textAnchor={
                  xl.idx === 0 ? 'start' : xl.idx === points.length - 1 ? 'end' : 'middle'
                }
                fill="#71717a"
                fontSize="11.5"
              >
                {xl.label}
              </text>
            ))}

            {/* Hover vertical crosshair & active point */}
            {activePoint && (
              <g>
                <line
                  x1={activePoint.x}
                  x2={activePoint.x}
                  y1={padT}
                  y2={padT + plotH}
                  stroke="#a1a1aa"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r={4.5}
                  fill="#6366f1"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              </g>
            )}
          </svg>

          {/* Dark Plausible Hover Tooltip */}
          {activePoint && (
            <div
              style={{
                left: `${Math.min(Math.max((activePoint.x / W) * 100, 12), 86)}%`,
                top: `${Math.max((activePoint.y / H) * 100 - 18, 2)}%`,
              }}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full z-20 rounded-md bg-zinc-900 px-3 py-2 text-white shadow-lg whitespace-nowrap"
            >
              <div className="text-[11px] text-zinc-400 font-medium">
                {fmtBucketLabel(activePoint.p.label ?? activePoint.p.bucket, interval, lang)}
                {activePoint.p.status === 'partial' || activePoint.p.partial
                  ? lang === 'zh'
                    ? '（统计中）'
                    : ' (in progress)'
                  : ''}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[13px]">
                <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                <span className="text-zinc-300">{kpis.find((k) => k.key === activeMetric)?.label}:</span>
                <span className="font-semibold tabular-nums">{formatTooltipValue(activePoint.p.value)}</span>
              </div>
              {activePoint.p.invalid !== undefined && activePoint.p.invalid > 0 && (
                <div className="mt-0.5 text-[11px] text-amber-300 tabular-nums">
                  {lang === 'zh' ? '拦截/异常流量' : 'Invalid / bot'}: {fmtNumber(activePoint.p.invalid)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

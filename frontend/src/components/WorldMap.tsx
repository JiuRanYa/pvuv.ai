import React, { useMemo, useState } from 'react';
import { WORLD_COUNTRIES, WORLD_MAP_VIEWBOX } from './worldMapData';
import type { BreakdownRow } from '../lib/types';
import { countryFlag, countryName, fmtCompact } from '../lib/format';
import { useI18n } from '../lib/i18n';

function fillForRatio(ratio: number): string {
  if (ratio <= 0) return '#e4e7f7';
  if (ratio < 0.08) return '#c7d2fe';
  if (ratio < 0.25) return '#a5b4fc';
  if (ratio < 0.55) return '#818cf8';
  return '#6366f1';
}

export function WorldMap({
  rows,
  onSelectCountry,
}: {
  rows: BreakdownRow[];
  onSelectCountry?: (code: string) => void;
}) {
  const { lang, t } = useI18n();
  const [hover, setHover] = useState<{ code: string; name: string; count: number; x: number; y: number } | null>(null);

  const { map, max } = useMemo(() => {
    const m = new Map<string, number>();
    let mx = 0;
    for (const r of rows) {
      const code = (r.key || '').toUpperCase();
      if (!code || code === '(UNKNOWN)') continue;
      const val = r.uv || r.pv || 0;
      m.set(code, val);
      if (val > mx) mx = val;
    }
    return { map: m, max: mx };
  }, [rows]);

  return (
    <div className="relative flex-1 flex items-center justify-center pt-3 select-none">
      <svg
        viewBox={WORLD_MAP_VIEWBOX}
        className="w-full h-auto max-h-[325px]"
        role="img"
        aria-label="World visitors map"
      >
        {WORLD_COUNTRIES.map((c) => {
          const count = map.get(c.code) ?? 0;
          const ratio = max > 0 ? count / max : 0;
          const isHovered = hover?.code === c.code;
          return (
            <path
              key={c.code}
              d={c.d}
              fill={isHovered ? (count > 0 ? '#4f46e5' : '#cbd5e1') : fillForRatio(ratio)}
              stroke="#ffffff"
              strokeWidth={0.55}
              className={count > 0 && onSelectCountry ? 'cursor-pointer transition-colors' : 'transition-colors'}
              onMouseMove={(e) => {
                const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                if (!rect) return;
                setHover({
                  code: c.code,
                  name: countryName(c.code, lang),
                  count,
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                });
              }}
              onMouseLeave={() => setHover(null)}
              onClick={() => {
                if (count > 0 && onSelectCountry) onSelectCountry(c.code);
              }}
            />
          );
        })}
      </svg>

      {hover && (
        <div
          style={{
            left: Math.min(Math.max(hover.x, 70), 380),
            top: Math.max(hover.y - 44, 8),
          }}
          className="pointer-events-none absolute -translate-x-1/2 z-20 rounded-md bg-zinc-900 px-2.5 py-1.5 text-[12px] text-white shadow-lg whitespace-nowrap"
        >
          <span className="mr-1.5">{countryFlag(hover.code)}</span>
          <span className="font-medium">{hover.name}</span>
          <span className="ml-2 font-semibold tabular-nums text-indigo-300">
            {fmtCompact(hover.count)} {t('col.visitors').toLowerCase()}
          </span>
        </div>
      )}
    </div>
  );
}

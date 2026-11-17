/**
 * PriceChart — self-contained SVG sparkline (Requirement 2.2).
 *
 * Renders the reconstructed 24h price series from `reconstructPricePoints`
 * as an axis-free area/line chart, scaled to the min/max of the visible
 * prices. The registry peak price gets a distinct dashed marker line (or an
 * "Unknown" marker when no peak is known, e.g. contract-search tokens).
 * No chart library; a single-point series renders as a flat line instead of
 * breaking, and an empty series renders a short "no data" note.
 */

import type { PricePoint } from '../lib/graveyard';

const WIDTH = 320;
const HEIGHT = 96;
const PAD = 6;

function formatUsd(value: number): string {
  if (value >= 1) {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
  return `$${value.toLocaleString('en-US', { maximumSignificantDigits: 3 })}`;
}

export interface PriceChartProps {
  /** Points from `reconstructPricePoints` (oldest first). */
  points: PricePoint[];
  /** Curated peak price, or null/undefined when unknown. */
  peakPriceUsd?: number | null;
  /**
   * Overrides the accessible name when the chart is NOT a live 24h series —
   * e.g. the illustrative peak-to-zero decline for a pair-gone token, where
   * the default "Price over the last 24 hours" wording would be wrong.
   */
  accessibleLabel?: string;
}

export function PriceChart({ points, peakPriceUsd, accessibleLabel }: PriceChartProps) {
  const valid = points.filter(
    (p): p is { t: number; price: number } =>
      p.price != null && Number.isFinite(p.price),
  );

  const peak =
    peakPriceUsd != null && Number.isFinite(peakPriceUsd) ? peakPriceUsd : null;
  const peakLabel = peak != null ? formatUsd(peak) : 'unknown';
  const accessibleName =
    accessibleLabel ?? `Price over the last 24 hours, peak ${peakLabel}`;

  if (valid.length === 0) {
    return (
      <div
        role="img"
        aria-label={accessibleName}
        className="flex h-24 items-center justify-center rounded-md bg-[var(--graveyard-surface-2)] text-xs text-[var(--graveyard-text-dim)]"
      >
        No price data available
      </div>
    );
  }

  const values = valid.map((p) => p.price);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (peak != null) {
    min = Math.min(min, peak);
    max = Math.max(max, peak);
  }
  // Flat series (or a single point): give the line a visible mid-height.
  const flat = min === max;
  const span = flat ? 1 : max - min;

  const x = (i: number): number =>
    valid.length === 1
      ? WIDTH / 2
      : PAD + (i * (WIDTH - PAD * 2)) / (valid.length - 1);
  const y = (price: number): number => {
    if (flat) return HEIGHT / 2;
    return PAD + ((max - price) / span) * (HEIGHT - PAD * 2);
  };

  const linePath = valid
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.price).toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L${x(valid.length - 1).toFixed(1)},${HEIGHT} L${x(0).toFixed(1)},${HEIGHT} Z`;
  const peakY = peak != null ? y(peak) : null;
  const last = valid[valid.length - 1];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={accessibleName}
      className="h-24 w-full"
      preserveAspectRatio="none"
    >
      <path
        d={areaPath}
        fill="var(--cause-99-soft)"
        fillOpacity="0.15"
        stroke="none"
      />
      <path
        d={linePath}
        fill="none"
        stroke="var(--cause-99-soft)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={x(valid.length - 1)}
        cy={y(last.price)}
        r="3"
        fill="var(--cause-99-soft)"
      />
      {peakY != null ? (
        <g>
          <line
            x1={PAD}
            x2={WIDTH - PAD}
            y1={peakY}
            y2={peakY}
            stroke="var(--cause-rugged)"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
          <text
            x={WIDTH - PAD}
            y={Math.max(peakY - 4, 10)}
            textAnchor="end"
            fontSize="10"
            fill="var(--cause-rugged-soft)"
          >
            Peak {peakLabel}
          </text>
        </g>
      ) : (
        <text
          x={WIDTH - PAD}
          y={12}
          textAnchor="end"
          fontSize="10"
          fill="var(--graveyard-text-dim)"
        >
          Peak unknown
        </text>
      )}
    </svg>
  );
}

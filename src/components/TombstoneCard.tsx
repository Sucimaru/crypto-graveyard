/**
 * TombstoneCard — a single dead token rendered as a headstone
 * (Requirements 1.2, 1.3, 1.4, 5.2, 8.1, 8.2).
 *
 * The whole card is a real focusable `<button>` so Enter and Space activate it
 * natively. Inner content is phrasing-only (spans) to keep the button's content
 * model valid. Per-cause styling (icon, accent color, epitaph) uses the task-5
 * theme tokens via `cause-accent-*` classes and their CSS variables.
 */

import type { CauseOfDeath } from '../data/registry';
import type { BuriedToken } from '../types';

const CHAIN_NAMES: Record<string, string> = {
  ethereum: 'Ethereum',
  bsc: 'BSC',
  solana: 'Solana',
  polygon: 'Polygon',
  avalanche: 'Avalanche',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  base: 'Base',
  fantom: 'Fantom',
  cronos: 'Cronos',
};

function formatChain(chainId: string): string {
  return CHAIN_NAMES[chainId] ?? chainId.charAt(0).toUpperCase() + chainId.slice(1);
}

function formatUsd(value: number): string {
  const digits = value >= 1 ? 2 : value >= 0.01 ? 4 : 8;
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })}`;
}

function formatDateOfDeath(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Per-cause presentation: icon, label, and the task-5 accent class suffix. */
const CAUSE_CONFIG: Record<CauseOfDeath, { icon: string; label: string; accent: string }> = {
  rugged: { icon: '☠️', label: 'Rugged', accent: 'rugged' },
  abandoned: { icon: '🥀', label: 'Abandoned', accent: 'abandoned' },
  '-99%': { icon: '📉', label: 'Down 99%', accent: '99' },
};

export interface TombstoneCardProps {
  token: BuriedToken;
  onOpen: () => void;
}

export function TombstoneCard({ token, onOpen }: TombstoneCardProps) {
  const grave = token.token;
  const cause = CAUSE_CONFIG[grave.cause];
  const isPairGone = token.status === 'pair-gone';
  const dropLabel = isPairGone
    ? '≈ -100%'
    : token.dropFromPeakPct !== undefined
      ? `${token.dropFromPeakPct.toFixed(1)}%`
      : '—';
  const currentLabel =
    token.status === 'live' && token.currentPriceUsd !== undefined
      ? formatUsd(token.currentPriceUsd)
      : isPairGone
        ? 'pair gone'
        : 'price unknown';
  const ariaLabel = `${grave.name} (${grave.symbol}), ${cause.label}, down ${dropLabel} from peak ${formatUsd(grave.peakPriceUsd)}, died ${formatDateOfDeath(grave.dateOfDeath)}${isPairGone ? ', pair gone, no live market' : ''}`;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      className={`tombstone-card cause-accent-${cause.accent} flex w-full flex-col gap-1 p-4 text-left transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cause-accent)]`}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-base font-semibold text-[var(--graveyard-text)]">
          {grave.name}
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--graveyard-text-dim)]">
          {grave.symbol}
        </span>
      </span>
      <span className="flex items-center gap-1.5 text-xs text-[var(--cause-accent-soft)]">
        <span aria-hidden="true">{cause.icon}</span>
        <span>{cause.label}</span>
        <span aria-hidden="true">·</span>
        <span>{formatChain(grave.chainId)}</span>
      </span>
      <span className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-sm text-[var(--graveyard-text-dim)]">
          Peak <span className="text-[var(--graveyard-text)]">{formatUsd(grave.peakPriceUsd)}</span>
        </span>
        <span className="text-sm font-semibold text-[var(--cause-accent)]">{dropLabel}</span>
      </span>
      <span className="text-sm text-[var(--graveyard-text-dim)]">
        Now <span className="text-[var(--graveyard-text)]">{currentLabel}</span>
      </span>
      {isPairGone ? (
        <span className="text-xs text-[var(--graveyard-text-dim)]">
          pair gone — no live market
        </span>
      ) : null}
      <span className="text-xs text-[var(--graveyard-text-dim)]">
        Died {formatDateOfDeath(grave.dateOfDeath)}
      </span>
      {grave.lore ? (
        <span className="mt-1 text-xs italic leading-snug text-[var(--cause-accent-soft)]">
          “{grave.lore}”
        </span>
      ) : null}
    </button>
  );
}

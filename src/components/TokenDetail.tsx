/**
 * TokenDetail — detail view for one grave (Requirement 2.1, 2.3, 2.4).
 *
 * Accepts a `BuriedToken` plus an `onBack` callback that returns to the grid
 * (wired to the hash route in task 14). Renders every field: name, symbol,
 * chain, contract address, peak price, current price, drop % from peak, date
 * of death, cause, the PriceChart (task 11), pair age from `pairCreatedAt`,
 * and a link to the Dexscreener pair page.
 *
 * Contract-search tokens (task 14) carry no curated data: the caller signals
 * that with the sentinels `peakPriceUsd: NaN`, `dateOfDeath: ''`, and
 * `cause: 'unknown' as CauseOfDeath` — each renders as "Unknown" instead of
 * breaking the layout. An unreachable token shows "price unknown" the same
 * way TombstoneCard does.
 */

import type { CauseOfDeath } from '../data/registry';
import { reconstructPricePoints } from '../lib/graveyard';
import type { BuriedToken } from '../types';
import { PriceChart } from './PriceChart';

const CHAIN_NAMES: Record<string, string> = {
  ethereum: 'Ethereum',
  bsc: 'BNB Chain',
  solana: 'Solana',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  avalanche: 'Avalanche',
};

const CAUSE_LABELS: Record<CauseOfDeath, string> = {
  rugged: 'Rugged',
  abandoned: 'Abandoned',
  '-99%': 'Down 99%',
};

const CAUSE_ACCENT_CLASS: Record<CauseOfDeath, string> = {
  rugged: 'cause-accent-rugged',
  abandoned: 'cause-accent-abandoned',
  '-99%': 'cause-accent-99',
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
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatPairAge(createdAt: number | null | undefined): string {
  if (!createdAt) return 'Unknown';
  const ms = Date.now() - createdAt;
  if (ms < 0) return 'Unknown';
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) {
    const hours = Math.floor(ms / 3_600_000);
    return hours <= 1 ? 'under an hour' : `${hours} hours`;
  }
  if (days < 30) return `${days} day${days === 1 ? '' : 's'}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return remMonths === 0
    ? `${years} year${years === 1 ? '' : 's'}`
    : `${years}y ${remMonths}mo`;
}

export interface TokenDetailProps {
  token: BuriedToken;
  onBack: () => void;
}

export function TokenDetail({ token, onBack }: TokenDetailProps) {
  const grave = token.token;
  const causeLabel = CAUSE_LABELS[grave.cause] ?? 'Unknown';
  const accentClass = CAUSE_ACCENT_CLASS[grave.cause] ?? '';
  const peakLabel =
    Number.isFinite(grave.peakPriceUsd) && grave.peakPriceUsd > 0
      ? formatUsd(grave.peakPriceUsd)
      : 'Unknown';
  const peakForChart =
    Number.isFinite(grave.peakPriceUsd) && grave.peakPriceUsd > 0
      ? grave.peakPriceUsd
      : null;
  const currentLabel =
    token.status === 'live' && token.currentPriceUsd !== undefined
      ? formatUsd(token.currentPriceUsd)
      : 'price unknown';
  const dropLabel =
    token.dropFromPeakPct !== undefined ? `${token.dropFromPeakPct.toFixed(1)}%` : '—';
  const points = reconstructPricePoints(
    token.pair?.priceUsd ?? null,
    token.pair?.priceChange ?? { m5: 0, h1: 0, h6: 0, h24: 0 },
  );

  return (
    <article
      aria-label={`${grave.name} (${grave.symbol}) grave details`}
      className={`tombstone-card ${accentClass} mx-auto flex w-full max-w-2xl flex-col gap-3 p-5`}
    >
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm text-[var(--graveyard-text-dim)] underline-offset-2 hover:text-[var(--graveyard-text)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cause-accent,currentColor)]"
      >
        ← Back to the graveyard
      </button>

      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold text-[var(--graveyard-text)]">{grave.name}</h2>
        <span className="text-sm font-medium uppercase tracking-wider text-[var(--graveyard-text-dim)]">
          {grave.symbol}
        </span>
      </header>

      <p className="flex items-center gap-1.5 text-sm text-[var(--cause-accent-soft, var(--graveyard-text-dim))]">
        <span>{causeLabel}</span>
        <span aria-hidden="true">·</span>
        <span>{formatChain(grave.chainId)}</span>
        <span aria-hidden="true">·</span>
        <span>Died {formatDateOfDeath(grave.dateOfDeath)}</span>
      </p>

      {grave.lore ? (
        <p className="text-sm italic leading-snug text-[var(--cause-accent-soft, var(--graveyard-text-dim))]">
          “{grave.lore}”
        </p>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wider text-[var(--graveyard-text-dim)]">
            Peak price
          </dt>
          <dd className="text-[var(--graveyard-text)]">{peakLabel}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-[var(--graveyard-text-dim)]">
            Current price
          </dt>
          <dd className="text-[var(--graveyard-text)]">{currentLabel}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-[var(--graveyard-text-dim)]">
            Drop from peak
          </dt>
          <dd className="font-semibold text-[var(--cause-accent, var(--graveyard-text))]">
            {dropLabel}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-[var(--graveyard-text-dim)]">
            Pair age
          </dt>
          <dd className="text-[var(--graveyard-text)]">
            {formatPairAge(token.pair?.pairCreatedAt)}
          </dd>
        </div>
        <div className="col-span-2 sm:col-span-2">
          <dt className="text-xs uppercase tracking-wider text-[var(--graveyard-text-dim)]">
            Contract
          </dt>
          <dd className="break-all font-mono text-xs text-[var(--graveyard-text)]">
            {grave.contractAddress}
          </dd>
        </div>
      </dl>

      <div>
        <h3 className="mb-1 text-xs uppercase tracking-wider text-[var(--graveyard-text-dim)]">
          Last 24 hours
        </h3>
        <PriceChart points={points} peakPriceUsd={peakForChart} />
      </div>

      {token.pair ? (
        <a
          href={token.pair.url}
          target="_blank"
          rel="noreferrer"
          className="self-start text-sm text-[var(--cause-accent-soft, var(--graveyard-text))] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cause-accent,currentColor)]"
        >
          View pair on Dexscreener ↗
        </a>
      ) : null}
    </article>
  );
}

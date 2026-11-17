/**
 * StatsHeader — headline graveyard stats (Requirements 4.1, 4.2, 4.3, 8.2).
 *
 * Shows two figures:
 *  - "Tokens Buried" — the curated registry token count (Requirement 4.1).
 *  - "Total Value Lost" — the sum of each live token's estimated
 *    (peak market cap − current market cap), i.e. the per-token `valueLostUsd`,
 *    formatted as compact USD (Requirements 4.1, 4.2).
 *
 * Per Requirement 4.3, the total is computed over only the tokens that have live
 * data. When some tokens are unreachable the figure is labelled "based on N of
 * M live graves" so the visitor knows the total is partial. The value-lost
 * figure and its partial-data caption live inside an `aria-live="polite"`
 * region (Requirement 8.2) so screen readers announce the figure as live prices
 * resolve, without re-announcing the static "Total Value Lost" label on every
 * update.
 *
 * `tokens` is the buried-token view-model list (registry metadata plus live data
 * when available). Only entries with `status === 'live'` contribute to the
 * sum, so the same list the grid renders can be passed straight through; a
 * caller may also pass a live-only subset — both interpretations yield correct
 * totals because the authoritative total `M` comes from `registryCount`.
 */

import type { BuriedToken } from '../types';

export interface StatsHeaderProps {
  /** Count of curated dead tokens in the registry ("Tokens Buried"). */
  registryCount: number;
  /**
   * The buried-token view models. Total value lost is summed over the
   * `status === 'live'` entries; the rest contribute 0 and trigger the
   * partial-data label when fewer than `registryCount` are live.
   */
  tokens: BuriedToken[];
}

/** Compact USD formatter, e.g. $990M, $1.2B, $3.4K, $0. */
const COMPACT_USD = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

function formatCompactUsd(value: number): string {
  return COMPACT_USD.format(value);
}

function formatCount(value: number): string {
  return value.toLocaleString('en-US');
}

export function StatsHeader({ registryCount, tokens }: StatsHeaderProps) {
  const liveTokens = tokens.filter((t) => t.status === 'live');
  const liveCount = liveTokens.length;
  const totalValueLost = liveTokens.reduce((sum, t) => sum + (t.valueLostUsd ?? 0), 0);
  const hasPartialData = liveCount < registryCount;

  return (
    <section aria-label="Graveyard stats" className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        {/* Tokens Buried — registry count, static once loaded. */}
        <div className="flex-1 rounded-2xl border border-graveyard-border bg-graveyard-surface px-6 py-5">
          <p className="text-xs font-medium uppercase tracking-wider text-graveyard-stone-dim">
            Tokens Buried
          </p>
          <p className="mt-1 font-serif text-3xl text-graveyard-stone-light">
            {formatCount(registryCount)}
          </p>
        </div>

        {/* Total Value Lost — announced as live prices resolve. */}
        <div className="flex-1 rounded-2xl border border-graveyard-border bg-graveyard-surface px-6 py-5">
          <p className="text-xs font-medium uppercase tracking-wider text-graveyard-stone-dim">
            Total Value Lost
          </p>
          <div aria-live="polite" aria-atomic="true">
            <p className="mt-1 font-serif text-3xl text-cause-99-soft">
              {formatCompactUsd(totalValueLost)}
            </p>
            {hasPartialData ? (
              <p className="mt-1 text-xs text-graveyard-stone-dim">
                based on {formatCount(liveCount)} of {formatCount(registryCount)} live graves
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

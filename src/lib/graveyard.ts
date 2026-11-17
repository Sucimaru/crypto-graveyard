/**
 * Pure derived computations for the graveyard (Requirements 1.3, 2.2, 4.2).
 *
 * These functions turn registry metadata + a live Dexscreener pair into the
 * numbers the UI renders (drop %, value lost, a reconstructed price series).
 * Every function is null-safe and guards division by zero so bad or missing
 * data degrades to "unknown" instead of throwing.
 */

import type { BuriedToken, DexPair } from '../types';
import type { GraveToken } from '../data/registry';

/** A single point on the reconstructed price series. `price` is null when the
 *  point cannot be derived (e.g. a -100% change bucket would divide by zero). */
export interface PricePoint {
  /** Milliseconds since the epoch. */
  t: number;
  price: number | null;
}

/** Parse a string|number|null into a finite number, or null. */
function toFiniteOrNull(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Signed drop from peak as a percentage, e.g. -99.7.
 *
 * Returns null when the peak is missing, non-finite, or non-positive (which
 * would either divide by zero or produce a meaningless percentage), or when
 * the current price is missing/non-finite.
 */
export function dropFromPeak(
  peakPriceUsd: number | null | undefined,
  currentPriceUsd: number | null | undefined,
): number | null {
  if (peakPriceUsd == null || !Number.isFinite(peakPriceUsd) || peakPriceUsd <= 0) return null;
  if (currentPriceUsd == null || !Number.isFinite(currentPriceUsd)) return null;
  return ((currentPriceUsd - peakPriceUsd) / peakPriceUsd) * 100;
}

/**
 * Circulating supply inferred from the current market cap and current price.
 *
 * Returns null when the market cap is missing (Requirement 4.3 partial-data
 * path) or when the price is missing/zero/negative (guard division by zero and
 * nonsensical negative supply).
 */
export function estimateSupply(
  currentMarketCapUsd: number | null | undefined,
  currentPriceUsd: number | null | undefined,
): number | null {
  if (currentMarketCapUsd == null || !Number.isFinite(currentMarketCapUsd)) return null;
  if (currentPriceUsd == null || !Number.isFinite(currentPriceUsd) || currentPriceUsd <= 0) {
    return null;
  }
  return currentMarketCapUsd / currentPriceUsd;
}

/**
 * Estimated value lost (peak market cap − current market cap), where peak
 * market cap is `supply * peakPrice`. Reuses `estimateSupply`. Returns null
 * when any required input is missing or invalid (e.g. missing market cap, or a
 * non-positive peak price).
 */
export function valueLostUsd(
  peakPriceUsd: number | null | undefined,
  currentPriceUsd: number | null | undefined,
  currentMarketCapUsd: number | null | undefined,
): number | null {
  if (currentMarketCapUsd == null || !Number.isFinite(currentMarketCapUsd)) return null;
  const supply = estimateSupply(currentMarketCapUsd, currentPriceUsd);
  if (supply == null) return null;
  if (peakPriceUsd == null || !Number.isFinite(peakPriceUsd) || peakPriceUsd <= 0) return null;
  return supply * peakPriceUsd - currentMarketCapUsd;
}

const HOUR_MS = 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

/**
 * Reconstruct ~5 price points from the current `priceUsd` plus the m5/h1/h6/h24
 * `priceChange` buckets, oldest first:
 *
 *   price_at(t - Δ) = priceUsd / (1 + change_Δ / 100)
 *
 * `now` is injectable for deterministic tests (defaults to the real clock). A
 * null/unparseable `priceUsd` yields an empty series. A change bucket of -100
 * (denominator zero) or any non-finite denominator yields a null price for that
 * point rather than ±Infinity.
 */
export function reconstructPricePoints(
  priceUsd: string | number | null | undefined,
  priceChange: DexPair['priceChange'],
  now: number = Date.now(),
): PricePoint[] {
  const price = toFiniteOrNull(priceUsd);
  if (price == null) return [];

  const at = (change: number, offsetMs: number): PricePoint => {
    const denom = 1 + change / 100;
    const p = Number.isFinite(denom) && denom !== 0 ? price / denom : null;
    return { t: now - offsetMs, price: p == null || !Number.isFinite(p) ? null : p };
  };

  return [
    at(priceChange.h24, 24 * HOUR_MS),
    at(priceChange.h6, 6 * HOUR_MS),
    at(priceChange.h1, HOUR_MS),
    at(priceChange.m5, 5 * MIN_MS),
    { t: now, price },
  ];
}

/**
 * Schematic decline for a token whose live pair is gone: a straight line from
 * the curated peak price (24h before the date of death) down to ~$0 at the
 * date of death.
 *
 * This is an ILLUSTRATION, not market data — there is no live price history
 * for a pair-gone token, and the two points are the minimal straight-line
 * schematic between the two facts the registry actually knows (peak price,
 * date of death). The UI must label any chart drawn from these points
 * "Illustrative — no live market data" and must never present them as real
 * prices. Returns [] when the peak is missing/non-positive or the date of
 * death is not a valid date.
 */
export function illustrativeDeclinePoints(
  peakPriceUsd: number | null | undefined,
  dateOfDeath: string,
): PricePoint[] {
  if (peakPriceUsd == null || !Number.isFinite(peakPriceUsd) || peakPriceUsd <= 0) {
    return [];
  }
  const deathMs = new Date(dateOfDeath).getTime();
  if (Number.isNaN(deathMs)) return [];
  return [
    { t: deathMs - 24 * HOUR_MS, price: peakPriceUsd },
    { t: deathMs, price: 0 },
  ];
}

/**
 * Join curated registry metadata with an optional live representative pair into
 * a `BuriedToken` view model.
 *
 * `status` is `'live'` only when a pair is present with a usable (finite)
 * current price; otherwise it is `'unreachable'` and the card renders
 * registry-only data with "price unknown". The derived numeric fields are
 * populated only when their inputs are available, so a live pair without a
 * market cap still exposes `currentPriceUsd` / `dropFromPeakPct` but omits the
 * market-cap-dependent fields.
 *
 * The `pairChecked` option distinguishes "not yet looked up" from "looked up
 * and found nothing": when the caller has completed a successful Dexscreener
 * fetch (`pairChecked: true`) and no pair was returned for this token, the
 * token is `'pair-gone'` — its market is gone, not merely unreachable.
 * A pair-gone token reports `dropFromPeakPct: -100` by convention: with no
 * live market the token is effectively worthless on any tracked market, so the
 * fall from peak is ~-100%. That is an APPROXIMATION, not a measured price —
 * the UI must always label it "pair gone — no live market" — and no
 * `valueLostUsd` is computed (there is no current market cap to subtract
 * from). Callers that have not finished a successful fetch leave
 * `pairChecked` unset and get the old `'unreachable'` behaviour (initial
 * render / fetch failure).
 */
export function toBuriedToken(
  token: GraveToken,
  pair?: DexPair,
  opts?: { pairChecked?: boolean },
): BuriedToken {
  if (!pair) {
    if (opts?.pairChecked) {
      return { token, status: 'pair-gone', dropFromPeakPct: -100 };
    }
    return { token, status: 'unreachable' };
  }

  const currentPriceUsd = toFiniteOrNull(pair.priceUsd);
  if (currentPriceUsd == null) {
    return { token, status: 'unreachable' };
  }

  const currentMarketCapUsd =
    pair.marketCap != null && Number.isFinite(pair.marketCap) ? pair.marketCap : null;

  const dropFromPeakPct = dropFromPeak(token.peakPriceUsd, currentPriceUsd);
  const supply = estimateSupply(currentMarketCapUsd, currentPriceUsd);
  const peakMarketCapUsd =
    supply != null && token.peakPriceUsd > 0 && Number.isFinite(token.peakPriceUsd)
      ? supply * token.peakPriceUsd
      : null;
  const lost = valueLostUsd(token.peakPriceUsd, currentPriceUsd, currentMarketCapUsd);

  return {
    token,
    pair,
    status: 'live',
    currentPriceUsd,
    dropFromPeakPct: dropFromPeakPct ?? undefined,
    peakMarketCapUsd: peakMarketCapUsd ?? undefined,
    currentMarketCapUsd: currentMarketCapUsd ?? undefined,
    valueLostUsd: lost ?? undefined,
  };
}

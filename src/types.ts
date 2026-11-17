/**
 * Shared domain types.
 *
 * `DexPair` is the normalized subset of a Dexscreener pair the app consumes;
 * `BuriedToken` is the joined view model (curated registry metadata + a live
 * representative pair and its derived fields). `DexError` is the typed error
 * surfaced by the data layer instead of throwing (Requirement 6.5).
 */

import type { GraveToken } from './data/registry';

/** Normalized Dexscreener pair subset. */
export interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  priceUsd: string | null;
  priceChange: { m5: number; h1: number; h6: number; h24: number };
  liquidity: { usd: number };
  marketCap: number | null;
  fdv: number | null;
  /** Pair creation time, ms epoch. */
  pairCreatedAt: number | null;
  info?: {
    imageUrl?: string;
    websites?: { url: string }[];
    socials?: { url: string; type: string }[];
  };
}

/**
 * Joined view model: curated registry metadata plus an optional live
 * representative pair. Derived numeric fields are populated only when live data
 * is present (status === 'live'); a token without live data is 'unreachable'.
 */
export interface BuriedToken {
  /** Curated metadata from the registry. */
  token: GraveToken;
  /** Live representative pair (highest liquidity), if any. */
  pair?: DexPair;
  currentPriceUsd?: number;
  /** Signed: (current - peak) / peak * 100, e.g. -99.7. */
  dropFromPeakPct?: number;
  /** supply * peakPrice. */
  peakMarketCapUsd?: number;
  currentMarketCapUsd?: number;
  /** peakMarketCap - currentMarketCap. */
  valueLostUsd?: number;
  status: 'live' | 'unreachable';
}

/** Typed error returned by the Dexscreener client instead of throwing. */
export type DexError = {
  kind: 'network' | 'http' | 'empty' | 'parse';
  message: string;
};

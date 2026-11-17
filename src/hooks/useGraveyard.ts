/**
 * useGraveyard — load the registry + live Dexscreener data (Requirement 1.3,
 * 1.4, 4.2, 4.3, 6.3, 7.1, 7.2).
 *
 * The registry is read synchronously, so the hook immediately exposes a
 * `BuriedToken[]` with every token `status: 'unreachable'` (registry-only)
 * and the grid shell renders before any network call resolves (progressive
 * rendering). On mount it fetches live pairs for all registry addresses in
 * one batched call (`fetchPairsForTokens`, ≤ 30 addresses per request),
 * picks the highest-liquidity representative pair per token, and joins via
 * `toBuriedToken`. Tokens whose fetch fails — or the whole request, on a
 * `DexError` — stay `unreachable` with their registry data intact, so an API
 * failure never empties the grid.
 *
 * Exposes `loading` (first fetch in flight) and `liveResolved` (the first
 * attempt finished, successfully or not) for the StatsHeader partial-data
 * label, plus `error` when the fetch itself failed. The derived list is
 * memoized and only recomputed when the live pair map changes.
 */

import { useEffect, useMemo, useState } from 'react';
import { getRegistry } from '../data/registry';
import { fetchPairsForTokens, pickRepresentativePairs } from '../lib/dexscreener';
import { toBuriedToken } from '../lib/graveyard';
import type { BuriedToken, DexError, DexPair } from '../types';

export interface UseGraveyardResult {
  /** Registry tokens joined with live data when available. */
  tokens: BuriedToken[];
  /** True while the first live fetch is in flight. */
  loading: boolean;
  /** True once the first live fetch has finished (success or failure). */
  liveResolved: boolean;
  /** The fetch error, if the live request failed; null otherwise. */
  error: DexError | null;
}

export function useGraveyard(): UseGraveyardResult {
  const registry = useMemo(() => getRegistry(), []);
  const [pairsByAddress, setPairsByAddress] = useState<Map<string, DexPair> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DexError | null>(null);

  useEffect(() => {
    let cancelled = false;
    const addresses = registry.map((t) => t.contractAddress);
    fetchPairsForTokens(addresses).then((result) => {
      if (cancelled) return;
      if (Array.isArray(result)) {
        const byAddress = new Map<string, DexPair>();
        for (const pair of pickRepresentativePairs(result)) {
          byAddress.set(pair.baseToken.address.toLowerCase(), pair);
        }
        setPairsByAddress(byAddress);
      } else {
        setError(result);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [registry]);

  const tokens = useMemo(
    () =>
      registry.map((t) =>
        toBuriedToken(t, pairsByAddress?.get(t.contractAddress.toLowerCase())),
      ),
    [registry, pairsByAddress],
  );

  return { tokens, loading, liveResolved: !loading, error };
}

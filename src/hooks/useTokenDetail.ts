/**
 * useTokenDetail — resolve one token for the detail view (Requirement 2.1,
 * 3.3, 7.3).
 *
 * Resolution order for a query string:
 * 1. Registry first — by `id`, then by name / symbol / contract address via
 *    `findGraveToken`. Prefers cached live data passed in from `useGraveyard`
 *    (the Dexscreener client caches too), otherwise fetches the token's live
 *    pairs once and joins via `toBuriedToken`.
 * 2. Contract-address fallback — for a query that looks like an EVM or
 *    Solana address but matches nothing in the registry, `searchPairs` is
 *    called and a `BuriedToken`-shaped object is built from the
 *    highest-liquidity pair, with curated fields marked "Unknown" via the
 *    sentinels TokenDetail understands (`peakPriceUsd: NaN`,
 *    `dateOfDeath: ''`, `cause: 'unknown'`). `dropFromPeak`/`valueLostUsd`
 *    return null for a non-finite peak, so no NaN leaks into the view model.
 * 3. Anything else with no match surfaces `not-found` (the "no grave found"
 *    state); a failed request surfaces `error` with the typed `DexError`.
 *
 * An empty query is `idle` (no fetch). The hook never throws: the
 * Dexscreener client resolves errors instead of rejecting.
 */

import { useEffect, useState } from 'react';
import { isContractAddress } from '../components/SearchBar';
import { findGraveToken, getRegistry } from '../data/registry';
import type { CauseOfDeath, GraveToken } from '../data/registry';
import {
  fetchPairsForTokens,
  pickRepresentativePairs,
  searchPairs,
} from '../lib/dexscreener';
import { toBuriedToken } from '../lib/graveyard';
import type { BuriedToken, DexError } from '../types';

export type TokenDetailStatus = 'idle' | 'loading' | 'found' | 'not-found' | 'error';

export interface UseTokenDetailResult {
  status: TokenDetailStatus;
  token: BuriedToken | null;
  error: DexError | null;
}

export function useTokenDetail(
  query: string | null,
  cachedTokens: BuriedToken[] = [],
): UseTokenDetailResult {
  const [state, setState] = useState<UseTokenDetailResult>({
    status: 'idle',
    token: null,
    error: null,
  });

  useEffect(() => {
    const q = (query ?? '').trim();
    if (!q) {
      setState({ status: 'idle', token: null, error: null });
      return;
    }

    let cancelled = false;
    const finish = (next: UseTokenDetailResult) => {
      if (!cancelled) setState(next);
    };
    setState({ status: 'loading', token: null, error: null });

    // 1. Registry first: by id, then name / symbol / contract address.
    const registryToken =
      getRegistry().find((t) => t.id === q.toLowerCase()) ?? findGraveToken(q);
    if (registryToken) {
      const cached = cachedTokens.find((t) => t.token.id === registryToken.id);
      if (cached) {
        finish({ status: 'found', token: cached, error: null });
        return;
      }
      fetchPairsForTokens([registryToken.contractAddress]).then((result) => {
        if (cancelled) return;
        if (!Array.isArray(result)) {
          finish({ status: 'error', token: null, error: result });
          return;
        }
        const rep = pickRepresentativePairs(result)[0];
        finish({
          status: 'found',
          // Successful fetch with no pair = pair-gone, not unreachable.
          token: toBuriedToken(registryToken, rep, { pairChecked: true }),
          error: null,
        });
      });
      return () => {
        cancelled = true;
      };
    }

    // 2. Contract-address fallback for non-registry tokens.
    if (!isContractAddress(q)) {
      finish({ status: 'not-found', token: null, error: null });
      return;
    }
    searchPairs(q).then((result) => {
      if (cancelled) return;
      if (!Array.isArray(result)) {
        finish({ status: 'error', token: null, error: result });
        return;
      }
      const rep = pickRepresentativePairs(result)[0];
      if (!rep) {
        finish({ status: 'not-found', token: null, error: null });
        return;
      }
      const grave: GraveToken = {
        id: `search:${rep.baseToken.address.toLowerCase()}`,
        name: rep.baseToken.name,
        symbol: rep.baseToken.symbol,
        chainId: rep.chainId,
        contractAddress: rep.baseToken.address,
        // Sentinels for "Unknown" curated fields (see TokenDetail).
        peakPriceUsd: Number.NaN,
        dateOfDeath: '',
        cause: 'unknown' as CauseOfDeath,
      };
      finish({ status: 'found', token: toBuriedToken(grave, rep), error: null });
    });
    return () => {
      cancelled = true;
    };
  }, [query, cachedTokens]);

  return state;
}

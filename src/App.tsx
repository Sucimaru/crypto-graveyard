import { useCallback, useEffect, useMemo, useState } from 'react';
import { Candle } from './components/Candle';
import { Fog } from './components/Fog';
import { GraveyardGrid } from './components/GraveyardGrid';
import {
  SearchBar,
  filterGraveyard,
  isContractAddress,
} from './components/SearchBar';
import { StatsHeader } from './components/StatsHeader';
import { TokenDetail } from './components/TokenDetail';
import { Empty, Error, Loading, NotFound } from './components/states';
import { useGraveyard } from './hooks/useGraveyard';
import { useTokenDetail } from './hooks/useTokenDetail';
import type { BuriedToken } from './types';

/**
 * Crypto Graveyard — application shell (task 15: final composition).
 *
 * Composes StatsHeader, SearchBar, GraveyardGrid, TokenDetail, Fog, Candle,
 * and the shared states. Grid ↔ detail switching is driven by local state
 * and reflected in the URL hash (`#/token/<id>` or `#/addr/<address>`) so
 * detail links are shareable; the back action restores the grid with the
 * active search filter intact (the query lives in App state and is never
 * cleared by navigation). A contract-address query with no registry match
 * offers the Dexscreener fallback (task 14) instead of the plain Empty state.
 */

type Route =
  | { kind: 'token'; value: string }
  | { kind: 'addr'; value: string }
  | null;

function parseHash(hash: string): Route {
  const tokenMatch = hash.match(/^#\/token\/(.+)$/);
  if (tokenMatch) return { kind: 'token', value: decodeURIComponent(tokenMatch[1]) };
  const addrMatch = hash.match(/^#\/addr\/(.+)$/);
  if (addrMatch) return { kind: 'addr', value: decodeURIComponent(addrMatch[1]) };
  return null;
}

export default function App() {
  const { tokens, loading, liveResolved, error } = useGraveyard();
  const [query, setQuery] = useState('');
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const openToken = useCallback((token: BuriedToken) => {
    const hash = token.token.id.startsWith('search:')
      ? `#/addr/${encodeURIComponent(token.token.contractAddress)}`
      : `#/token/${encodeURIComponent(token.token.id)}`;
    window.location.hash = hash;
    setRoute(parseHash(hash));
  }, []);

  const goBack = useCallback(() => {
    window.location.hash = '';
    setRoute(null);
  }, []);

  const detailQuery = route ? route.value : null;
  const detail = useTokenDetail(detailQuery, tokens);

  const filtered = useMemo(() => filterGraveyard(query, tokens), [query, tokens]);
  const queryIsAddress = query.trim() !== '' && isContractAddress(query);
  const showAddressLookup = query.trim() !== '' && filtered.length === 0 && queryIsAddress;
  const showEmpty = query.trim() !== '' && filtered.length === 0 && !queryIsAddress;

  return (
    <div className="graveyard-root relative min-h-screen bg-graveyard-bg text-graveyard-stone">
      <Fog />
      <a
        href="#graves"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--graveyard-surface)] focus:px-3 focus:py-2 focus:text-[var(--graveyard-text)]"
      >
        Skip to the graves
      </a>
      <div className="relative z-10">
        <header className="mx-auto max-w-5xl px-6 py-16 text-center">
          <div className="flex items-center justify-center gap-6 sm:gap-10">
            <Candle />
            <div>
              <h1 className="font-serif text-4xl tracking-wide text-graveyard-stone-light sm:text-5xl">
                Crypto Graveyard
              </h1>
              <p className="mt-4 text-sm text-graveyard-stone-dim">
                A resting place for rugged, abandoned, and -99% tokens.
              </p>
            </div>
            <Candle />
          </div>
        </header>

        <main id="graves" className="mx-auto max-w-5xl px-6 pb-24">
          {route === null ? (
            <div className="flex flex-col gap-6">
              <StatsHeader registryCount={tokens.length} tokens={tokens} />
              <SearchBar value={query} onChange={setQuery} />
              {error && liveResolved ? (
                <p role="status" className="text-center text-sm text-[var(--graveyard-text-dim)]">
                  Live prices are unavailable right now — showing registry data.
                </p>
              ) : null}
              {showAddressLookup ? (
                <div className="tombstone-card mx-auto flex w-full max-w-xl flex-col items-center gap-3 p-6 text-center">
                  <p className="text-sm text-[var(--graveyard-text)]">
                    No grave in the registry matches that contract address.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const hash = `#/addr/${encodeURIComponent(query.trim())}`;
                      window.location.hash = hash;
                      setRoute(parseHash(hash));
                    }}
                    className="rounded-2xl border border-[var(--graveyard-border)] bg-[var(--graveyard-surface-2)] px-4 py-2 text-sm text-[var(--graveyard-text)] hover:bg-[var(--graveyard-surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--graveyard-text)]"
                  >
                    Look up this contract on Dexscreener
                  </button>
                </div>
              ) : showEmpty ? (
                <Empty />
              ) : (
                <GraveyardGrid tokens={filtered} onOpen={openToken} loading={loading} />
              )}
            </div>
          ) : detail.status === 'loading' ? (
            <Loading label="Opening the grave…" />
          ) : detail.status === 'found' && detail.token ? (
            <TokenDetail token={detail.token} onBack={goBack} />
          ) : detail.status === 'not-found' ? (
            <div className="flex flex-col items-center gap-4">
              <NotFound message={`No grave found for “${detailQuery}”.`} />
              <button
                type="button"
                onClick={goBack}
                className="text-sm text-[var(--graveyard-text-dim)] underline-offset-2 hover:text-[var(--graveyard-text)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                ← Back to the graveyard
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Error message="The crypt gate is stuck. Try again shortly." />
              <button
                type="button"
                onClick={goBack}
                className="text-sm text-[var(--graveyard-text-dim)] underline-offset-2 hover:text-[var(--graveyard-text)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                ← Back to the graveyard
              </button>
            </div>
          )}
        </main>

        <footer className="mx-auto max-w-5xl px-6 pb-10 text-center text-xs text-[var(--graveyard-text-dim)]">
          Live prices via Dexscreener · Peaks, dates, and causes from a curated
          registry · Built with Kiro for Kiroween
        </footer>
      </div>
    </div>
  );
}

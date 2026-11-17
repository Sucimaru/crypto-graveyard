# Implementation Plan

Tasks are ordered so each builds on prior ones. Each task should be verifiable on its own (type-check / lint / unit test / render) before moving on. Do not begin a task that depends on an incomplete earlier task.

- [x] 1. Scaffold the Vite + React + TypeScript + Tailwind project
    - Create the Vite React-TS app at the repo root and add Tailwind CSS (v3) with PostCSS.
    - Enable TypeScript strict mode in `tsconfig.json`; add a `typecheck` script (`tsc --noEmit`).
    - Add `src/theme/index.css` with the Tailwind directives and a dark graveyard base palette (near-black background, muted stone text colors); leave keyframe placeholders for fog and flicker (filled in task 5).
    - Add a minimal `src/main.tsx` entry and an `src/App.tsx` shell that renders a themed root container.
    - Verify: `npm run dev` starts and `npm run build` + `tsc --noEmit` pass.
    - _Requirements: 5.1_

- [x] 2. Define domain types and the curated graveyard registry
    - In `src/data/registry.ts`, define `CauseOfDeath` (`'rugged' | 'abandoned' | '-99%'`) and `GraveToken` per the design data model.
    - Populate the registry array with at least 10 seed dead tokens, each with `id`, `name`, `symbol`, `chainId`, `contractAddress`, `peakPriceUsd`, `dateOfDeath` (ISO), `cause`, and optional `lore`; use real chain IDs (e.g. `ethereum`, `bsc`, `solana`) and plausible contract addresses.
    - Export a `getRegistry()` / `REGISTRY` accessor and a case-insensitive lookup helper by name/symbol/contract.
    - In `src/types.ts`, define `DexPair` and `BuriedToken` (referencing `GraveToken`) exactly as in the design; also define a `DexError` type (`{ kind: 'network' | 'http' | 'empty' | 'parse'; message: string }`).
    - Verify: `tsc --noEmit` passes and the registry array length is ≥ 10.
    - _Requirements: 6.4_

- [x] 3. Build the Dexscreener client with caching and batching
    - Create `src/lib/dexscreener.ts` with base URL `https://api.dexscreener.com`.
    - Implement `fetchPairsForTokens(addresses: string[]): Promise<DexPair[]>` that batches addresses into ≤30-per-request groups, calls `GET /latest/dex/tokens/{addrs}`, and normalizes `pairs` into `DexPair[]`.
    - Implement `searchPairs(query: string): Promise<DexPair[]>` against `GET /latest/dex/search?q=`.
    - Add an in-memory response cache keyed by URL with a 60s TTL and single-flight dedupe (concurrent callers share one promise).
    - On non-2xx or network failure, resolve to a typed `DexError`; guard all numeric parsing (`Number(x)` with `isFinite`/`isNaN` checks) so a malformed pair never throws.
    - Add a helper that groups pairs by `baseToken.address` and returns the highest-`liquidity.usd` pair per token.
    - Verify: unit tests with mocked `fetch` cover batching, 60s cache hit, single-flight, highest-liquidity selection, and error typing.
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [x] 4. Implement and unit-test the graveyard derived computations
    - Create `src/lib/graveyard.ts` with pure functions: `dropFromPeak`, `estimateSupply`, `valueLostUsd`, and `reconstructPricePoints` (the 5-point series from `priceUsd` + the m5/h1/h6/h24 `priceChange` buckets, as specified in the design).
    - Add a `toBuriedToken(token: GraveToken, pair?: DexPair)` joiner that returns a `BuriedToken` with `status: 'live' | 'unreachable'`, populating `currentPriceUsd`, `dropFromPeakPct`, `peakMarketCapUsd`, `currentMarketCapUsd`, and `valueLostUsd` only when live data is present.
    - Write unit tests for each function, including edge cases: zero/negative peak, missing market cap, null `priceUsd`, and a 24h change of `-100` (guard division by zero).
    - Verify: `npm run test` (or the chosen runner) passes.
    - _Requirements: 1.3, 2.2, 4.2_

- [x] 5. Build the graveyard atmosphere (dark theme, fog, candles)
    - Finalize `src/theme/index.css`: define keyframes for `fog-drift` and `candle-flicker` and a reduced-motion media query (`@media (prefers-reduced-motion: reduce)`) that disables both.
    - Create `src/components/Fog.tsx` (a layered, animated fog overlay) and `src/components/Candle.tsx` (a flickering candle motif) that respect the reduced-motion query.
    - Establish reusable Tailwind utility classes / CSS variables for the dark palette, tombstone card shape, and cause accent colors.
    - Verify: app background is near-black with the fog overlay; toggling OS reduced motion stops the animation.
    - _Requirements: 5.1, 5.3_

- [x] 6. Create the shared UI states
    - Create `src/components/states.tsx` exporting `Loading`, `Error`, `Empty`, and `NotFound` components, all themed to the graveyard palette.
    - `Loading` is small enough to render inside a tombstone card (per-card skeleton/price-unknown state).
    - `NotFound` takes a message and is used for the contract-search "no grave found" case.
    - Verify: each state renders without data; no layout shift when switching among them.
    - _Requirements: 3.2, 7.2, 7.3_

- [ ] 7. Build the TombstoneCard component
    - Create `src/components/TombstoneCard.tsx` accepting a `BuriedToken` and an `onOpen` callback.
    - Render name, symbol, chain, peak price (USD), current price (USD) or "price unknown", drop % from peak, date of death, and cause.
    - Apply distinct styling per `cause` (rugged / abandoned / -99%) — icon, accent color, and an epitaph from `lore` — using the theme tokens from task 5.
    - Make the card a real focusable `<button>` (or `<a>`) operable with Enter and Space; give it an accessible name summarizing the token and drop.
    - Verify: renders correctly for a `live` token and an `unreachable` token; keyboard focus and activation work.
    - _Requirements: 1.2, 1.3, 1.4, 5.2, 8.1, 8.2_

- [x] 8. Build the GraveyardGrid component
    - Create `src/components/GraveyardGrid.tsx` that renders a responsive CSS grid of `TombstoneCard`s from a `BuriedToken[]`.
    - Use semantic landmarks (`role="list"`/`listitem` or a labelled region) and keep text legible across mobile, tablet, and desktop widths (Tailwind responsive utilities).
    - Show per-card loading placeholders while live data is still resolving, without blocking the grid shell.
    - Verify: reflows cleanly at common breakpoints; cards remain readable and operable.
    - _Requirements: 1.1, 7.2, 8.2, 8.3_

- [x] 9. Build the StatsHeader component
    - Create `src/components/StatsHeader.tsx` accepting the registry token count and the list of `BuriedToken`s with live data.
    - Display "Tokens Buried" (registry count) and "Total Value Lost" (sum of `valueLostUsd` over live tokens), formatted as compact USD.
    - Label the figure when some tokens lack live data (e.g. "based on N of M live graves").
    - Wrap the value-lost figure in an `aria-live="polite"` region so updates are announced.
    - Verify: totals update as live data resolves; partial-data label appears when some tokens are unreachable.
    - _Requirements: 4.1, 4.2, 4.3, 8.2_

- [x] 10. Build the SearchBar and grid filtering
    - Create `src/components/SearchBar.tsx` with a controlled input; make it focusable and labelled.
    - Implement client-side filtering: case-insensitive substring match against name, symbol, and contract address over the registry.
    - Detect contract-address patterns (EVM `0x...` and Solana base58) to trigger the Dexscreener fallback path (wired in task 14).
    - Show the `Empty` state (task 6) when the filtered registry result set is empty.
    - Verify: filtering narrows the grid; empty queries restore all cards; non-matching query shows the empty state.
    - _Requirements: 3.1, 3.2, 3.3, 8.1_

- [x] 11. Build the PriceChart component
    - Create `src/components/PriceChart.tsx` as a self-contained SVG sparkline (no chart library) from `reconstructPricePoints` output.
    - Render an axis-free area/line chart scaled to min/max price, and mark the registry peak price with a distinct marker/line (and an "Unknown" marker when peak is absent, e.g. contract-search tokens).
    - Give the chart an accessible name summarizing the data (e.g. "Price over the last 24 hours, peak $X").
    - Verify: renders five points plus the peak marker; tolerates a single-point series without breaking.
    - _Requirements: 2.2, 8.2_

- [x] 12. Build the TokenDetail view
    - Create `src/components/TokenDetail.tsx` accepting a `BuriedToken` (or a contract-search token with `cause`/peak "Unknown").
    - Render name, symbol, chain, contract address, peak price, current price, drop % from peak, date of death, cause, the `PriceChart` (task 11), pair age from `pairCreatedAt`, and a link to the Dexscreener `pair.url`.
    - Provide a visible back action (button/hash-aware link) that returns to the grid (wired in task 14).
    - Verify: all fields render for a live token; an unreachable token shows "price unknown" without layout breakage; the Dexscreener link opens the pair page.
    - _Requirements: 2.1, 2.3, 2.4, 8.1_

- [ ] 13. Implement the useGraveyard hook
    - Create `src/hooks/useGraveyard.ts` that reads the registry synchronously and fetches live pairs via the Dexscreener client (task 3), batching registry addresses.
    - On mount, immediately expose `BuriedToken[]` with `status: 'unreachable'` (registry-only) so the grid shell renders before the network resolves (progressive rendering).
    - When live pairs resolve, join via `toBuriedToken` (task 4) and update state, marking failed tokens `unreachable`.
    - Memoize the derived list and expose a `loading`/`liveResolved` flag for the StatsHeader partial-data label.
    - Verify: grid shell renders instantly from the registry; live prices update without flicker; API failure leaves registry-only cards intact.
    - _Requirements: 1.3, 1.4, 4.2, 4.3, 6.3, 7.1, 7.2_

- [ ] 14. Implement the useTokenDetail hook and contract-address search
    - Create `src/hooks/useTokenDetail.ts` that resolves a token by `id` against the registry first, returning its `BuriedToken` (preferring cached live data from `useGraveyard`/the Dexscreener cache).
    - For a contract-address query with no registry match, call `searchPairs`/`fetchPairsForTokens` and build a `BuriedToken`-shaped object with `cause` and peak marked "Unknown"; surface a `NotFound` result when no pairs are returned.
    - Verify: opening a registry token shows full details; opening an arbitrary contract address shows live price and "Unknown" cause/peak; a bad address shows "no grave found".
    - _Requirements: 2.1, 3.3, 7.3_

- [ ] 15. Wire the App, routing, and final accessibility/responsive pass
    - In `src/App.tsx`, compose `StatsHeader`, `SearchBar`, `GraveyardGrid`, `TokenDetail`, `Fog`, `Candle`, and the shared states.
    - Implement grid ↔ detail view switching driven by local state and reflected in the URL hash (e.g. `#/token/<id>` or `#/addr/<address>`) so detail links are shareable; back action restores the grid (including the active search filter).
    - Connect `SearchBar` contract-address queries to the `useTokenDetail` fallback path and the `NotFound` state.
    - Run the final accessibility pass: keyboard tab order across header, search, cards, and detail; ARIA labels on grid, cards, chart, and stats; contrast checks against the dark palette; and responsive reflow at mobile/tablet/desktop.
    - Verify: `npm run build`, `tsc --noEmit`, unit tests, and a manual smoke flow (load → search → open detail → back) all pass.
    - _Requirements: 1.5, 2.4, 3.2, 3.3, 7.1, 7.3, 8.1, 8.2, 8.3_

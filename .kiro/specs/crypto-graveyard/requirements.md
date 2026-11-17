# Requirements Document

## Introduction

Crypto Graveyard is a client-side single-page dashboard that catalogs dead, rugged, and abandoned cryptocurrency tokens as tombstones in a haunting graveyard. Built with Vite + React + TypeScript + Tailwind CSS, it reads live market data from the Dexscreener free public API (no API key).

The dashboard shows a grid of tombstone cards (name, symbol, chain, peak price, current price, drop % from peak, date of death, cause), a token detail view with a price chart derived from Dexscreener pair data, search by name/symbol/contract address, and a stats header (tokens buried, total value lost).

## Constraints & Assumptions

The Dexscreener free public API exposes only live/current pair data: price, liquidity, volume, the 5m/1h/6h/24h price-change buckets, and `pairCreatedAt`. It does **not** expose historical OHLCV candles, a "dead token" filter, or ATH/peak prices, and search is capped at 30 results with no pagination. Consequently:

- The list of dead tokens and their narrative metadata (peak price, date of death, cause) live in a **curated in-app graveyard registry** keyed by chain and contract address.
- Dexscreener is used only as the **live data source**: current price, liquidity, market cap, and the price-change buckets used to draw the detail-view chart and to compute drop % from the registry's stored peak.
- "Total value lost" is estimated client-side from each token's Dexscreener `marketCap`/`priceUsd` (to derive circulating supply) and the registry's peak price.
- No backend, no API key, and no secrets are required.

## Out of Scope

- Real-time WebSocket price streaming.
- Full historical OHLCV candlestick charts (the free API does not provide them).
- Automated discovery or labeling of new dead tokens (the registry is curated).
- User accounts, persistence, or favoriting.
- Any product that competes with Dexscreener (prohibited by their terms of service).

## Requirements

### Requirement 1: Graveyard grid of dead tokens

**User Story:** As a visitor, I want to see a grid of dead tokens rendered as tombstone cards, so that I can browse the cemetery at a glance.

### Acceptance Criteria

1.1. WHEN the app loads, THE SYSTEM SHALL display a responsive grid of tombstone cards, one per token in the graveyard registry.
1.2. WHEN rendering a tombstone card, THE SYSTEM SHALL show the token name, symbol, chain, peak price (USD), current price (USD), drop % from peak, date of death, and cause.
1.3. WHEN live Dexscreener data is available for a token, THE SYSTEM SHALL compute the current price and drop % from peak using live `priceUsd` and the registry's stored peak price, and display them.
1.4. WHEN live Dexscreener data is unavailable for a token, THE SYSTEM SHALL display the card with current price marked "price unknown" and the registry's stored peak price, without crashing.
1.5. WHEN a user activates a tombstone card, THE SYSTEM SHALL open the token detail view (Requirement 2).

### Requirement 2: Token detail view with price chart

**User Story:** As a visitor, I want to open a token and see a price chart and its death details, so that I can understand how it died.

### Acceptance Criteria

2.1. WHEN a token detail view is opened, THE SYSTEM SHALL display the token name, symbol, chain, contract address, peak price, current price, drop % from peak, date of death, cause, and a link to the Dexscreener pair page.
2.2. WHEN a token detail view is opened, THE SYSTEM SHALL render a price chart derived from Dexscreener pair data: current `priceUsd` plus reconstructed historical points from the m5/h1/h6/h24 `priceChange` buckets, with the registry peak marked on the chart.
2.3. WHEN Dexscreener returns a `pairCreatedAt` timestamp, THE SYSTEM SHALL display the pair's age (created date) on the detail view.
2.4. WHEN the user requests to return to the grid, THE SYSTEM SHALL close the detail view and restore the graveyard grid.

### Requirement 3: Search by name, symbol, or contract address

**User Story:** As a visitor, I want to search for a token by name, symbol, or contract address, so that I can find a specific grave.

### Acceptance Criteria

3.1. WHEN the user enters a query, THE SYSTEM SHALL filter the graveyard grid to tokens whose name, symbol, or contract address matches the query case-insensitively.
3.2. WHEN the filtered result set is empty, THE SYSTEM SHALL display an empty-state message instead of an empty grid.
3.3. WHEN the query matches a contract-address pattern (EVM `0x…` or Solana base58) and no registry token matches, THE SYSTEM SHALL query Dexscreener for that address and, if a pair is found, open its detail view (Requirement 2) with cause and peak marked "Unknown".

### Requirement 4: Stats header (tokens buried, total value lost)

**User Story:** As a visitor, I want to see headline stats, so that I can grasp the scale of the carnage.

### Acceptance Criteria

4.1. WHEN the app loads, THE SYSTEM SHALL display a stats header showing "Tokens Buried" (count of registry tokens) and "Total Value Lost" (estimated USD).
4.2. WHEN computing total value lost, THE SYSTEM SHALL sum each token's estimated (peak market cap − current market cap), deriving circulating supply from Dexscreener `marketCap`/`priceUsd` and peak market cap from the registry peak price.
4.3. WHEN live data is unavailable for some tokens, THE SYSTEM SHALL compute total value lost over only the tokens that have live data and label the figure accordingly.

### Requirement 5: Graveyard atmosphere & theme

**User Story:** As a visitor, I want a dark, foggy, candle-lit graveyard aesthetic, so that the experience feels haunting and polished.

### Acceptance Criteria

5.1. WHEN the app renders, THE SYSTEM SHALL apply a dark graveyard theme: near-black background, fog overlay, tombstone-shaped cards, and candle motifs, implemented with Tailwind CSS.
5.2. WHEN a tombstone card is rendered, THE SYSTEM SHALL visually reflect the cause of death (rugged / abandoned / -99%) via distinct styling such as an icon, accent color, or epitaph.
5.3. WHEN the user's OS prefers reduced motion, THE SYSTEM SHALL disable animated fog and candle motion and show static visuals.

### Requirement 6: Dexscreener data layer & curated registry

**User Story:** As the developer, I want a single data module and a curated registry, so that live data fetching, caching, and "dead token" metadata are consistent and rate-limit-safe.

### Acceptance Criteria

6.1. THE SYSTEM SHALL expose a Dexscreener client that fetches pairs via `/latest/dex/tokens/{addresses}` (batched up to 30 addresses) and `/latest/dex/search?q=` for contract-address resolution.
6.2. THE SYSTEM SHALL cache Dexscreener responses in memory for at least 60 seconds and avoid duplicate in-flight requests, to stay within the free API rate limits.
6.3. THE SYSTEM SHALL select one representative pair per token (highest liquidity) when multiple pairs are returned for an address.
6.4. THE SYSTEM SHALL ship with a curated registry containing at least 10 seed dead tokens, each with name, symbol, chainId, contractAddress, peakPriceUsd, dateOfDeath (ISO), and cause.
6.5. WHEN Dexscreener returns an error or a non-2xx status, THE SYSTEM SHALL surface a typed error to the UI rather than throwing an uncaught exception.

### Requirement 7: Performance & robustness

**User Story:** As a visitor, I want the dashboard to load fast and keep working when the API misbehaves, so that the experience stays smooth.

### Acceptance Criteria

7.1. WHEN the app loads, THE SYSTEM SHALL render the stats header and tombstone grid shell from the registry before live prices resolve (progressive rendering).
7.2. WHEN Dexscreener is slow or unreachable, THE SYSTEM SHALL show per-card loading indicators and degrade to registry-only data, without blocking the whole UI.
7.3. WHEN a contract address is invalid or returns no pairs, THE SYSTEM SHALL display a "no grave found" message instead of an error screen.

### Requirement 8: Accessibility & responsiveness

**User Story:** As a visitor on any device or using assistive tech, I want a usable dashboard, so that I can navigate the graveyard.

### Acceptance Criteria

8.1. WHEN navigating by keyboard, THE SYSTEM SHALL make tombstone cards and controls focusable and operable (Enter/Space to open a detail view).
8.2. WHEN rendered, THE SYSTEM SHALL provide ARIA roles and labels for the grid, cards, chart, and stats, and maintain sufficient color contrast against the dark theme.
8.3. WHEN viewed on mobile, tablet, and desktop widths, THE SYSTEM SHALL reflow the grid and keep text legible.

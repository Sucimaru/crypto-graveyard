/**
 * Curated graveyard registry (Requirement 6.4).
 *
 * The free Dexscreener API exposes only live pair state — no ATH/peak, no "dead
 * token" filter, and no narrative metadata. The peak price, date of death, and
 * cause of death for each token therefore live here, keyed by chain + contract
 * address. Dexscreener supplies only the live values that change over time.
 */

export type CauseOfDeath = 'rugged' | 'abandoned' | '-99%';

export interface GraveToken {
  /** Stable slug, e.g. "luna-classic". */
  id: string;
  name: string;
  symbol: string;
  /** Dexscreener chainId, e.g. "ethereum", "bsc", "solana". */
  chainId: string;
  /** Token contract address. */
  contractAddress: string;
  /** Curated all-time-high price (USD). */
  peakPriceUsd: number;
  /** ISO 8601 date of death. */
  dateOfDeath: string;
  cause: CauseOfDeath;
  /** Optional epitaph text. */
  lore?: string;
}

/**
 * The curated registry of dead tokens. At least 10 seed entries, spread across
 * real Dexscreener chain IDs and all three causes of death.
 *
 * Contract addresses: 5 of the 12 were corrected 17 Nov 2026 after verifying
 * each against the live Dexscreener API (search by name/symbol, then confirmed
 * the candidate address returns live pairs via /latest/dex/tokens/): SQUID,
 * CUMMIES, TIME, MIR, POLYDOGE. The other 7 (SFM, LUNA, BCC, PLEX, KIDS,
 * SLOP, ARUG) have NO confirmed live pair for any matching token as of that
 * date, so their addresses are left as-is and those tokens render as
 * 'pair-gone'. Never invent an address to make a token look live — a token
 * with no verifiable pair is pair-gone, not a reason to guess.
 * The data layer (task 3) degrades gracefully to "pair-gone" when an address
 * does not resolve on Dexscreener, so illustrative addresses never crash the UI.
 */
export const REGISTRY: readonly GraveToken[] = [
  {
    id: 'squid-game',
    name: 'Squid Game',
    symbol: 'SQUID',
    chainId: 'bsc',
    contractAddress: '0x87230146E138d3F296a9a77e497A2A83012e9Bc5',
    peakPriceUsd: 2861.8,
    dateOfDeath: '2021-11-01',
    cause: 'rugged',
    lore: 'Play-to-earn that could only be lost; the exit door vanished overnight.',
  },
  {
    id: 'safemoon-v1',
    name: 'SafeMoon',
    symbol: 'SFM',
    chainId: 'bsc',
    contractAddress: '0x8076c74c5b3d11336a6f59aa5cfff98cac1f4e16',
    peakPriceUsd: 0.00338,
    dateOfDeath: '2022-12-14',
    cause: 'abandoned',
    lore: 'HODL and penalize the sellers, until the sellers were the team.',
  },
  {
    id: 'terra-luna',
    name: 'Terra',
    symbol: 'LUNA',
    chainId: 'ethereum',
    contractAddress: '0xd28797096d337814efd9bb3a4d7569416845b018',
    peakPriceUsd: 119.5,
    dateOfDeath: '2022-05-12',
    cause: 'rugged',
    lore: 'A top-ten project undone by its own algorithmic stablecoin.',
  },
  {
    id: 'bitconnect',
    name: 'BitConnect',
    symbol: 'BCC',
    chainId: 'ethereum',
    contractAddress: '0xb7262785d51b1b0d3a0c6ddca16f1c2f9e1c1a8b',
    peakPriceUsd: 463.0,
    dateOfDeath: '2018-01-28',
    cause: 'rugged',
    lore: 'The lending platform that mathematically couldn\u2019t.',
  },
  {
    id: 'cumrocket',
    name: 'CumRocket',
    symbol: 'CUMMIES',
    chainId: 'bsc',
    contractAddress: '0x27Ae27110350B98d564b9A3eeD31bAeBc82d878d',
    peakPriceUsd: 0.0325,
    dateOfDeath: '2021-05-04',
    cause: '-99%',
    lore: 'Meme gravity wins every time the spotlight moves on.',
  },
  {
    id: 'plex',
    name: 'PLEX',
    symbol: 'PLEX',
    chainId: 'bsc',
    contractAddress: '0x4f3a8c1d2b5e6a7f0c9d1e2b3a4c5d6e7f8a9b0c',
    peakPriceUsd: 0.0088,
    dateOfDeath: '2022-04-15',
    cause: '-99%',
    lore: 'Yet another yield farm harvested straight to zero.',
  },
  {
    id: 'save-the-kids',
    name: 'Save The Kids',
    symbol: 'KIDS',
    chainId: 'ethereum',
    contractAddress: '0x9a3e1f2c4b5d6e7a8f0c1d2e3b4a5c6d7e8f9001',
    peakPriceUsd: 0.0046,
    dateOfDeath: '2021-06-20',
    cause: 'rugged',
    lore: 'Charity token; the only cause funded was the founders.',
  },
  {
    id: 'wonderland-time',
    name: 'Wonderland',
    symbol: 'TIME',
    chainId: 'avalanche',
    contractAddress: '0xb54f16fB19478766A268F172C9480f8da1a7c9C3',
    peakPriceUsd: 9843.0,
    dateOfDeath: '2022-01-10',
    cause: '-99%',
    lore: 'OHM-forking (3,3) eventually dissolved into (-1,-1).',
  },
  {
    id: 'sol-slop',
    name: 'Slop',
    symbol: 'SLOP',
    chainId: 'solana',
    contractAddress: '9xQeWrevGf8H8b5kQ4m3v2c1b6n7a8d9eF1G2h3i4j5k',
    peakPriceUsd: 0.018,
    dateOfDeath: '2022-11-11',
    cause: 'rugged',
    lore: 'Solana downtime wasn\u2019t the only thing that broke.',
  },
  {
    id: 'mirror-protocol-mir',
    name: 'Mirror Protocol',
    symbol: 'MIR',
    chainId: 'ethereum',
    contractAddress: '0x09a3EcAFa817268f77BE1283176B946C4ff2E608',
    peakPriceUsd: 12.4,
    dateOfDeath: '2022-05-12',
    cause: 'rugged',
    lore: 'Synthetic assets that mirrored Terra\u2019s collapse.',
  },
  {
    id: 'polydoge',
    name: 'PolyDoge',
    symbol: 'POLYDOGE',
    chainId: 'polygon',
    contractAddress: '0x8A953CfE442c5E8855cc6c61b1293FA648BAE472',
    peakPriceUsd: 0.000000041,
    dateOfDeath: '2022-08-09',
    cause: '-99%',
    lore: 'Nine zeroes and counting.',
  },
  {
    id: 'arbirug',
    name: 'ArbiRug',
    symbol: 'ARUG',
    chainId: 'arbitrum',
    contractAddress: '0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c',
    peakPriceUsd: 0.74,
    dateOfDeath: '2023-03-23',
    cause: 'rugged',
    lore: 'Airdrop hype that rugpulled on claim.',
  },
];

/**
 * Accessor for the full registry. Returns a fresh shallow copy so callers
 * cannot mutate the exported constant.
 */
export function getRegistry(): GraveToken[] {
  return [...REGISTRY];
}

/**
 * Case-insensitive lookup by name, symbol, or contract address (Requirement
 * 6.4 accessor + used by the detail/search resolution in later tasks).
 *
 * Returns the first matching token, or `undefined` when nothing matches or the
 * query is empty/whitespace.
 */
export function findGraveToken(query: string): GraveToken | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return REGISTRY.find(
    (t) =>
      t.name.toLowerCase() === q ||
      t.symbol.toLowerCase() === q ||
      t.contractAddress.toLowerCase() === q,
  );
}

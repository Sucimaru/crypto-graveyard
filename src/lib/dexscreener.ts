/**
 * Dexscreener client (Requirements 6.1, 6.2, 6.3, 6.5).
 *
 * Free public API (no key): https://api.dexscreener.com
 *   - GET /latest/dex/tokens/{addr1,addr2,...}  live pairs for a set of token
 *                                                contract addresses (batch ≤ 30)
 *   - GET /latest/dex/search?q=                 resolve an arbitrary address
 *
 * Design rules implemented here:
 *   - batches token addresses into ≤ 30-per-request groups;
 *   - in-memory cache keyed by URL with a 60 s TTL;
 *   - single-flight: concurrent callers for the same URL share one promise;
 *   - never throws: on a network/HTTP/parse failure it resolves to a typed
 *     `DexError` so the UI can degrade to registry-only data;
 *   - every numeric field is guarded (`Number(x)` + `isFinite`) so a single
 *     malformed pair can never break the batch.
 */

import type { DexError, DexPair } from '../types';

const BASE_URL = 'https://api.dexscreener.com';
const TTL_MS = 60_000;
const BATCH_SIZE = 30;

interface CacheEntry {
  promise: Promise<DexPair[] | DexError>;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/** Clear the in-memory cache. Intended for tests; safe to call any time. */
export function clearCache(): void {
  cache.clear();
}

function isDexError(value: unknown): value is DexError {
  return typeof value === 'object' && value !== null && 'kind' in value && 'message' in value;
}

/* -------------------------------------------------------------------------- */
/* Coercion helpers — every numeric field is guarded so bad data never throws */
/* -------------------------------------------------------------------------- */

type Obj = Record<string, unknown>;

function asObj(value: unknown): Obj {
  return value && typeof value === 'object' ? (value as Obj) : {};
}

function toStr(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function toMaybeNumber(value: unknown): number | null {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;
  return Number.isFinite(n) ? n : null;
}

function toWebsiteList(value: unknown): { url: string }[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list: { url: string }[] = [];
  for (const item of value) {
    const url = toStr(asObj(item).url);
    if (url) list.push({ url });
  }
  return list.length ? list : undefined;
}

function toSocialList(value: unknown): { url: string; type: string }[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list: { url: string; type: string }[] = [];
  for (const item of value) {
    const obj = asObj(item);
    const entry = { url: toStr(obj.url), type: toStr(obj.type) };
    if (entry.url || entry.type) list.push(entry);
  }
  return list.length ? list : undefined;
}

function normalizeInfo(value: unknown): DexPair['info'] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const info = value as Obj;
  const imageUrl = typeof info.imageUrl === 'string' ? info.imageUrl : undefined;
  const websites = toWebsiteList(info.websites);
  const socials = toSocialList(info.socials);
  if (!imageUrl && !websites && !socials) return undefined;
  return { imageUrl, websites, socials };
}

/** Normalize a raw Dexscreener pair into a `DexPair`, coercing/guarding every field. */
function normalizePair(raw: unknown): DexPair {
  const r = asObj(raw);
  const baseToken = asObj(r.baseToken);
  const priceChange = asObj(r.priceChange);
  const liquidity = asObj(r.liquidity);
  return {
    chainId: toStr(r.chainId),
    dexId: toStr(r.dexId),
    url: toStr(r.url),
    pairAddress: toStr(r.pairAddress),
    baseToken: {
      address: toStr(baseToken.address),
      name: toStr(baseToken.name),
      symbol: toStr(baseToken.symbol),
    },
    priceUsd:
      typeof r.priceUsd === 'string'
        ? r.priceUsd
        : typeof r.priceUsd === 'number' && Number.isFinite(r.priceUsd)
          ? String(r.priceUsd)
          : null,
    priceChange: {
      m5: toFiniteNumber(priceChange.m5, 0),
      h1: toFiniteNumber(priceChange.h1, 0),
      h6: toFiniteNumber(priceChange.h6, 0),
      h24: toFiniteNumber(priceChange.h24, 0),
    },
    liquidity: { usd: toFiniteNumber(liquidity.usd, 0) },
    marketCap: toMaybeNumber(r.marketCap),
    fdv: toMaybeNumber(r.fdv),
    pairCreatedAt: toMaybeNumber(r.pairCreatedAt),
    info: normalizeInfo(r.info),
  };
}

/* -------------------------------------------------------------------------- */
/* Fetch + cache                                                              */
/* -------------------------------------------------------------------------- */

async function doGet(url: string): Promise<DexPair[] | DexError> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { kind: 'http', message: `HTTP ${res.status} for ${url}` };
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return { kind: 'parse', message: `Invalid JSON from ${url}` };
    }
    const pairs = asObj(data).pairs;
    if (pairs === null) {
      // Dexscreener returns `pairs: null` when the queried addresses have no
      // live pairs at all. That is a valid empty result (the tokens' pairs are
      // gone), NOT an error — callers must not treat it as a failed fetch.
      return [];
    }
    if (!Array.isArray(pairs)) {
      return { kind: 'empty', message: `No pairs array in response from ${url}` };
    }
    return pairs.map(normalizePair);
  } catch (err) {
    return {
      kind: 'network',
      message: err instanceof Error ? err.message : 'Network request failed',
    };
  }
}

/**
 * Cached, single-flight GET. Concurrent callers for the same URL share the same
 * in-flight promise; successful responses are cached for `TTL_MS`; errors are
 * not cached so a later call can retry.
 */
function fetchCached(url: string): Promise<DexPair[] | DexError> {
  const now = Date.now();
  const existing = cache.get(url);
  if (existing && existing.expiresAt > now) {
    return existing.promise;
  }
  const promise = doGet(url).then((result) => {
    if (isDexError(result)) cache.delete(url);
    return result;
  });
  cache.set(url, { promise, expiresAt: now + TTL_MS });
  return promise;
}

/**
 * Fetch live pairs for a set of token contract addresses, batching them into
 * ≤ 30-address requests against `/latest/dex/tokens/{addrs}`.
 *
 * Resolves to a `DexError` on network/HTTP/parse failure (never rejects).
 */
export function fetchPairsForTokens(addresses: string[]): Promise<DexPair[] | DexError> {
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const a of addresses) {
    const t = a.trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      clean.push(t);
    }
  }
  if (clean.length === 0) return Promise.resolve([]);

  const results: Promise<DexPair[] | DexError>[] = [];
  for (let i = 0; i < clean.length; i += BATCH_SIZE) {
    const batch = clean.slice(i, i + BATCH_SIZE);
    const url = `${BASE_URL}/latest/dex/tokens/${batch.join(',')}`;
    results.push(fetchCached(url));
  }

  return Promise.all(results).then((responses) => {
    const pairs: DexPair[] = [];
    for (const r of responses) {
      if (isDexError(r)) return r;
      pairs.push(...r);
    }
    return pairs;
  });
}

/**
 * Resolve pairs for an arbitrary query (typically a contract address) via
 * `/latest/dex/search?q=`. Resolves to a `DexError` on failure (never rejects).
 */
export function searchPairs(query: string): Promise<DexPair[] | DexError> {
  const q = query.trim();
  if (!q) return Promise.resolve([]);
  const url = `${BASE_URL}/latest/dex/search?q=${encodeURIComponent(q)}`;
  return fetchCached(url);
}

/**
 * Group pairs by `baseToken.address` and keep the highest-`liquidity.usd` pair
 * per token (Requirement 6.3).
 */
export function pickRepresentativePairs(pairs: DexPair[]): DexPair[] {
  const byToken = new Map<string, DexPair>();
  for (const pair of pairs) {
    const key = pair.baseToken.address;
    const current = byToken.get(key);
    if (!current || pair.liquidity.usd > current.liquidity.usd) {
      byToken.set(key, pair);
    }
  }
  return [...byToken.values()];
}

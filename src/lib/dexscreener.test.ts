import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchPairsForTokens,
  searchPairs,
  pickRepresentativePairs,
  clearCache,
} from './dexscreener';
import type { DexError, DexPair } from '../types';

/* fetch is stubbed per-test with vi.stubGlobal and restored in afterEach. */
const fetchMock = vi.fn();

beforeEach(() => {
  clearCache();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** A raw Dexscreener-shaped pair (pre-normalization). */
function rawPair(
  address: string,
  liquidityUsd: number,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    chainId: 'ethereum',
    dexId: 'uniswap',
    url: 'https://dexscreener.com/ethereum/0xp',
    pairAddress: '0xp',
    baseToken: { address, name: 'Token', symbol: 'TOK' },
    priceUsd: '1.0',
    priceChange: { m5: 0, h1: 0, h6: 0, h24: 0 },
    liquidity: { usd: liquidityUsd },
    marketCap: null,
    fdv: null,
    pairCreatedAt: null,
    ...overrides,
  };
}

/** A fully-normalized DexPair for the pure helper tests. */
function pairAt(address: string, liquidityUsd: number): DexPair {
  return {
    chainId: 'ethereum',
    dexId: 'uniswap',
    url: 'https://dexscreener.com/ethereum/0xp',
    pairAddress: `0xp-${address}-${liquidityUsd}`,
    baseToken: { address, name: 'Token', symbol: 'TOK' },
    priceUsd: '1.0',
    priceChange: { m5: 0, h1: 0, h6: 0, h24: 0 },
    liquidity: { usd: liquidityUsd },
    marketCap: null,
    fdv: null,
    pairCreatedAt: null,
  };
}

function assertIsPairs(res: DexPair[] | DexError): DexPair[] {
  if (!Array.isArray(res)) {
    throw new Error(`Expected DexPair[], got DexError: ${JSON.stringify(res)}`);
  }
  return res;
}

function makeAddresses(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `0x${i.toString().padStart(4, '0')}`);
}

describe('fetchPairsForTokens', () => {
  describe('batching', () => {
    it('returns [] without calling fetch when given no addresses', async () => {
      expect(await fetchPairsForTokens([])).toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does not split a single batch of 30', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ pairs: [] }));
      await fetchPairsForTokens(makeAddresses(30));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('splits into a second batch beyond 30', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ pairs: [] }));
      await fetchPairsForTokens(makeAddresses(31));
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('joins ≤30 addresses per request and spans multiple batches', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ pairs: [] }));
      const addrs = makeAddresses(35);
      await fetchPairsForTokens(addrs);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const urls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(urls[0]).toContain(addrs.slice(0, 30).join(','));
      expect(urls[1]).toContain(addrs.slice(30, 35).join(','));
    });

    it('dedupes identical addresses before batching', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ pairs: [] }));
      await fetchPairsForTokens(['0xabc', '0xabc', ' 0xabc ']);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(String(fetchMock.mock.calls[0][0])).toContain('/latest/dex/tokens/0xabc');
    });
  });

  describe('normalization', () => {
    it('normalizes the pairs array into DexPair[]', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          pairs: [
            rawPair('0xA', 1000, {
              priceUsd: '0.5',
              priceChange: { m5: 1, h1: -2, h6: 3, h24: -4 },
              marketCap: 12345,
              pairCreatedAt: 1700000000000,
            }),
          ],
        }),
      );
      const res = assertIsPairs(await fetchPairsForTokens(['0xA']));
      expect(res).toHaveLength(1);
      const p = res[0];
      expect(p.baseToken.address).toBe('0xA');
      expect(p.priceUsd).toBe('0.5');
      expect(p.priceChange).toEqual({ m5: 1, h1: -2, h6: 3, h24: -4 });
      expect(p.liquidity.usd).toBe(1000);
      expect(p.marketCap).toBe(12345);
      expect(p.pairCreatedAt).toBe(1700000000000);
    });

    it('never throws on a malformed pair, falling back to safe defaults', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          pairs: [
            rawPair('0xA', 0, {
              priceUsd: 123.45,
              priceChange: { m5: 'abc', h1: null, h6: undefined, h24: 'NaN' },
              liquidity: { usd: 'nope' },
              marketCap: 'wat',
              fdv: {},
              pairCreatedAt: 'not-a-number',
            }),
          ],
        }),
      );
      const res = assertIsPairs(await fetchPairsForTokens(['0xA']));
      expect(res).toHaveLength(1);
      const p = res[0];
      expect(p.priceChange).toEqual({ m5: 0, h1: 0, h6: 0, h24: 0 });
      expect(p.liquidity.usd).toBe(0);
      expect(p.marketCap).toBeNull();
      expect(p.fdv).toBeNull();
      expect(p.pairCreatedAt).toBeNull();
      expect(p.priceUsd).toBe('123.45');
    });
  });

  describe('caching & single-flight', () => {
    it('serves a cached response within the TTL without re-fetching', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ pairs: [rawPair('0xt', 1)] }));
      const first = await fetchPairsForTokens(['0xt']);
      const second = await fetchPairsForTokens(['0xt']);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(second).toEqual(first);
    });

    it('re-fetches after the 60s TTL expires', async () => {
      vi.useFakeTimers({ now: 1_000_000 });
      fetchMock.mockResolvedValue(jsonResponse({ pairs: [rawPair('0xt', 1)] }));
      await fetchPairsForTokens(['0xt']);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      vi.setSystemTime(1_000_000 + 60_001);
      await fetchPairsForTokens(['0xt']);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('dedupes concurrent requests for the same URL (single-flight)', async () => {
      let resolveFetch!: (value: Response) => void;
      fetchMock.mockImplementation(
        () => new Promise<Response>((resolve) => { resolveFetch = resolve; }),
      );
      const p1 = fetchPairsForTokens(['0xt']);
      const p2 = fetchPairsForTokens(['0xt']);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      resolveFetch(jsonResponse({ pairs: [rawPair('0xt', 1)] }));
      const [r1, r2] = await Promise.all([p1, p2]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(r1).toEqual(r2);
      expect(Array.isArray(r1)).toBe(true);
    });

    it('does not cache errors, so a retry re-fetches', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('boom'));
      const first = await fetchPairsForTokens(['0xt']);
      expect(first).toEqual(expect.objectContaining({ kind: 'network' }));

      fetchMock.mockResolvedValue(jsonResponse({ pairs: [rawPair('0xt', 1)] }));
      const second = await fetchPairsForTokens(['0xt']);
      expect(Array.isArray(second)).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('error typing', () => {
    it('returns a network DexError when fetch rejects', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      expect(await fetchPairsForTokens(['0xt'])).toEqual({
        kind: 'network',
        message: 'Failed to fetch',
      });
    });

    it('returns an http DexError on a non-2xx response', async () => {
      fetchMock.mockResolvedValue(new Response('', { status: 503 }));
      const res = await fetchPairsForTokens(['0xt']);
      expect(res).toEqual(expect.objectContaining({ kind: 'http' }));
    });

    it('returns a parse DexError when the body is not valid JSON', async () => {
      fetchMock.mockResolvedValue(
        new Response('not json', { status: 200, headers: { 'content-type': 'text/plain' } }),
      );
      const res = await fetchPairsForTokens(['0xt']);
      expect(res).toEqual(expect.objectContaining({ kind: 'parse' }));
    });

    it('returns an empty DexError when the pairs field is missing', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ schemaVersion: '1.0.0' }));
      const res = await fetchPairsForTokens(['0xt']);
      expect(res).toEqual(expect.objectContaining({ kind: 'empty' }));
    });

    it('returns [] (not an error) when pairs is null — no live pairs exist', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ schemaVersion: '1.0.0', pairs: null }));
      expect(await fetchPairsForTokens(['0xt'])).toEqual([]);
    });

    it('returns [] (not an error) when pairs is an empty array', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ schemaVersion: '1.0.0', pairs: [] }));
      expect(await fetchPairsForTokens(['0xt'])).toEqual([]);
    });
  });
});

describe('searchPairs', () => {
  it('encodes the query and calls the search endpoint', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ pairs: [rawPair('0xt', 1)] }));
    await searchPairs('0x dead beef');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://api.dexscreener.com/latest/dex/search?q=0x%20dead%20beef',
    );
  });

  it('returns [] without calling fetch for an empty query', async () => {
    expect(await searchPairs('   ')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a network DexError when fetch rejects', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    expect(await searchPairs('0xt')).toEqual(expect.objectContaining({ kind: 'network' }));
  });
});

describe('pickRepresentativePairs', () => {
  it('keeps the highest-liquidity pair per base token address', () => {
    const pairs = [pairAt('0xA', 100), pairAt('0xA', 500), pairAt('0xA', 300), pairAt('0xB', 50)];
    const rep = pickRepresentativePairs(pairs);
    expect(rep).toHaveLength(2);
    expect(rep.find((p) => p.baseToken.address === '0xA')?.liquidity.usd).toBe(500);
    expect(rep.find((p) => p.baseToken.address === '0xB')?.liquidity.usd).toBe(50);
  });

  it('returns an empty array for empty input', () => {
    expect(pickRepresentativePairs([])).toEqual([]);
  });

  it('returns the single pair when only one exists for a token', () => {
    const pairs = [pairAt('0xA', 42)];
    expect(pickRepresentativePairs(pairs)).toEqual(pairs);
  });
});

import { describe, it, expect } from 'vitest';
import {
  dropFromPeak,
  estimateSupply,
  valueLostUsd,
  reconstructPricePoints,
  illustrativeDeclinePoints,
  toBuriedToken,
} from './graveyard';
import type { DexPair } from '../types';
import type { GraveToken } from '../data/registry';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeToken(overrides: Partial<GraveToken> = {}): GraveToken {
  return {
    id: 'test-token',
    name: 'Test Token',
    symbol: 'TEST',
    chainId: 'ethereum',
    contractAddress: '0xdeadbeef',
    peakPriceUsd: 100,
    dateOfDeath: '2022-01-01',
    cause: '-99%',
    ...overrides,
  };
}

function makePair(overrides: Partial<DexPair> = {}): DexPair {
  return {
    chainId: 'ethereum',
    dexId: 'uniswap',
    url: 'https://dexscreener.com/ethereum/0xp',
    pairAddress: '0xpair',
    baseToken: { address: '0xdeadbeef', name: 'Test Token', symbol: 'TEST' },
    priceUsd: '1.0',
    priceChange: { m5: 0, h1: 0, h6: 0, h24: 0 },
    liquidity: { usd: 50_000 },
    marketCap: 10_000_000,
    fdv: null,
    pairCreatedAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// dropFromPeak
// ---------------------------------------------------------------------------

describe('dropFromPeak', () => {
  it('returns the signed percentage drop', () => {
    expect(dropFromPeak(100, 1)).toBeCloseTo(-99);
  });

  it('returns positive when current is above peak', () => {
    expect(dropFromPeak(1, 2)).toBeCloseTo(100);
  });

  it('returns 0 when current equals peak', () => {
    expect(dropFromPeak(50, 50)).toBe(0);
  });

  it('returns null for a zero peak (division by zero guard)', () => {
    expect(dropFromPeak(0, 1)).toBeNull();
  });

  it('returns null for a negative peak', () => {
    expect(dropFromPeak(-10, 1)).toBeNull();
  });

  it('returns null when peak is null', () => {
    expect(dropFromPeak(null, 1)).toBeNull();
  });

  it('returns null when current price is null', () => {
    expect(dropFromPeak(100, null)).toBeNull();
  });

  it('returns null when peak is Infinity', () => {
    expect(dropFromPeak(Infinity, 1)).toBeNull();
  });

  it('returns null when current price is NaN', () => {
    expect(dropFromPeak(100, NaN)).toBeNull();
  });
});

describe('estimateSupply', () => {
  it('supply = marketCap / price', () => {
    expect(estimateSupply(1_000_000, 0.5)).toBeCloseTo(2_000_000);
  });

  it('null when market cap is missing', () => {
    expect(estimateSupply(null, 1)).toBeNull();
  });

  it('null when price is null', () => {
    expect(estimateSupply(1_000_000, null)).toBeNull();
  });

  it('null when price is 0 (division by zero guard)', () => {
    expect(estimateSupply(1_000_000, 0)).toBeNull();
  });

  it('null when price is negative', () => {
    expect(estimateSupply(1_000_000, -1)).toBeNull();
  });
});

describe('valueLostUsd', () => {
  it('computes peak marketCap minus current marketCap via estimated supply', () => {
    // supply = 1_000_000 / 1.0 = 1_000_000; peakMC = supply * 100 = 100_000_000
    // valueLost = 100_000_000 - 1_000_000 = 99_000_000
    expect(valueLostUsd(100, 1.0, 1_000_000)).toBeCloseTo(99_000_000);
  });

  it('null when market cap is missing', () => {
    expect(valueLostUsd(100, 1, null)).toBeNull();
  });

  it('null when price is 0 (no supply)', () => {
    expect(valueLostUsd(100, 0, 1_000_000)).toBeNull();
  });

  it('null for a zero peak', () => {
    expect(valueLostUsd(0, 1, 1_000_000)).toBeNull();
  });

  it('null for a negative peak', () => {
    expect(valueLostUsd(-10, 1, 1_000_000)).toBeNull();
  });

  it('null when peak is null', () => {
    expect(valueLostUsd(null, 1, 1_000_000)).toBeNull();
  });
});

describe('reconstructPricePoints', () => {
  it('returns 5 points oldest-first with the given price at "now"', () => {
    const now = 1_000_000_000;
    const pts = reconstructPricePoints('1.0', { m5: 0, h1: 0, h6: 0, h24: 0 }, now);
    expect(pts).toHaveLength(5);
    expect(pts[0].t).toBe(now - 24 * 3600 * 1000);
    expect(pts[1].t).toBe(now - 6 * 3600 * 1000);
    expect(pts[2].t).toBe(now - 3600 * 1000);
    expect(pts[3].t).toBe(now - 5 * 60 * 1000);
    expect(pts[4].t).toBe(now);
    expect(pts.map((p) => p.price)).toEqual([1, 1, 1, 1, 1]);
  });

  it('reverses each bucket to derive the historical price', () => {
    const now = 0;
    const pts = reconstructPricePoints(100, { m5: 0, h1: -10, h6: 0, h24: -50 }, now);
    expect(pts[0].price).toBeCloseTo(200); // 100 / (1 - 0.5)
    expect(pts[1].price).toBeCloseTo(100); // 100 / 1
    expect(pts[2].price).toBeCloseTo(111.1111, 3); // 100 / 0.9
    expect(pts[3].price).toBeCloseTo(100); // 100 / 1
    expect(pts[4].price).toBe(100); // current
  });

  it('returns [] for a null priceUsd', () => {
    expect(reconstructPricePoints(null, { m5: 0, h1: 0, h6: 0, h24: 0 })).toEqual([]);
  });

  it('returns [] for an unparseable priceUsd string', () => {
    expect(reconstructPricePoints('nope', { m5: 0, h1: 0, h6: 0, h24: 0 })).toEqual([]);
  });

  it('guards a 24h change of -100 (division by zero) by nulling that point', () => {
    const now = 1000;
    const pts = reconstructPricePoints(50, { m5: 0, h1: 0, h6: 0, h24: -100 }, now);
    expect(pts).toHaveLength(5);
    expect(pts[0].price).toBeNull(); // denom = 1 + (-100)/100 = 0
    expect(pts[0].t).toBe(now - 24 * 3600 * 1000);
    expect(pts.slice(1).map((p) => p.price)).toEqual([50, 50, 50, 50]);
  });
});

describe('illustrativeDeclinePoints', () => {
  it('draws a straight line from peak (24h before death) to 0 at death', () => {
    const death = new Date('2022-01-01T00:00:00Z').getTime();
    const pts = illustrativeDeclinePoints(100, '2022-01-01');
    expect(pts).toHaveLength(2);
    expect(pts[0]).toEqual({ t: death - 24 * 3600 * 1000, price: 100 });
    expect(pts[1]).toEqual({ t: death, price: 0 });
  });

  it('returns [] for a zero peak', () => {
    expect(illustrativeDeclinePoints(0, '2022-01-01')).toEqual([]);
  });

  it('returns [] for a null peak', () => {
    expect(illustrativeDeclinePoints(null, '2022-01-01')).toEqual([]);
  });

  it('returns [] for an invalid date of death', () => {
    expect(illustrativeDeclinePoints(100, 'not-a-date')).toEqual([]);
  });
});

describe('toBuriedToken', () => {
  it('is unreachable with no derived fields when no pair is given', () => {
    const bt = toBuriedToken(makeToken());
    expect(bt.status).toBe('unreachable');
    expect(bt.pair).toBeUndefined();
    expect(bt.currentPriceUsd).toBeUndefined();
    expect(bt.dropFromPeakPct).toBeUndefined();
    expect(bt.peakMarketCapUsd).toBeUndefined();
    expect(bt.currentMarketCapUsd).toBeUndefined();
    expect(bt.valueLostUsd).toBeUndefined();
  });

  it('is unreachable when the pair has a null priceUsd', () => {
    const bt = toBuriedToken(makeToken(), makePair({ priceUsd: null }));
    expect(bt.status).toBe('unreachable');
    expect(bt.currentPriceUsd).toBeUndefined();
  });

  it('is unreachable when priceUsd is an unparseable string', () => {
    const bt = toBuriedToken(makeToken(), makePair({ priceUsd: 'abc' }));
    expect(bt.status).toBe('unreachable');
    expect(bt.currentPriceUsd).toBeUndefined();
  });
});

describe('toBuriedToken (pair-gone)', () => {
  it('is pair-gone with drop -100 and no value lost when the fetch succeeded but returned no pair', () => {
    const bt = toBuriedToken(makeToken({ peakPriceUsd: 100 }), undefined, {
      pairChecked: true,
    });
    expect(bt.status).toBe('pair-gone');
    expect(bt.pair).toBeUndefined();
    expect(bt.currentPriceUsd).toBeUndefined();
    expect(bt.dropFromPeakPct).toBe(-100);
    expect(bt.valueLostUsd).toBeUndefined();
    expect(bt.peakMarketCapUsd).toBeUndefined();
    expect(bt.currentMarketCapUsd).toBeUndefined();
  });

  it('stays unreachable without pairChecked (fetch not yet resolved)', () => {
    const bt = toBuriedToken(makeToken());
    expect(bt.status).toBe('unreachable');
    expect(bt.dropFromPeakPct).toBeUndefined();
  });

  it('is still live when a pair is given even with pairChecked', () => {
    const bt = toBuriedToken(makeToken({ peakPriceUsd: 100 }), makePair(), {
      pairChecked: true,
    });
    expect(bt.status).toBe('live');
    expect(bt.currentPriceUsd).toBe(1);
    expect(bt.dropFromPeakPct).toBeCloseTo(-99);
  });
});

describe('toBuriedToken (live data)', () => {
  it('populates all live fields when a live pair is given', () => {
    const bt = toBuriedToken(makeToken({ peakPriceUsd: 100 }), makePair());
    expect(bt.status).toBe('live');
    expect(bt.pair).toBeDefined();
    expect(bt.currentPriceUsd).toBe(1);
    expect(bt.dropFromPeakPct).toBeCloseTo(-99);
    expect(bt.currentMarketCapUsd).toBe(10_000_000);
    expect(bt.peakMarketCapUsd).toBeCloseTo(1_000_000_000);
    expect(bt.valueLostUsd).toBeCloseTo(990_000_000);
  });
});

describe('toBuriedToken (partial live data)', () => {
  it('exposes price and drop but omits market-cap fields when marketCap is missing', () => {
    const bt = toBuriedToken(
      makeToken({ peakPriceUsd: 100 }),
      makePair({ marketCap: null }),
    );
    expect(bt.status).toBe('live');
    expect(bt.currentPriceUsd).toBe(1);
    expect(bt.dropFromPeakPct).toBeCloseTo(-99);
    expect(bt.currentMarketCapUsd).toBeUndefined();
    expect(bt.peakMarketCapUsd).toBeUndefined();
    expect(bt.valueLostUsd).toBeUndefined();
  });
});

describe('toBuriedToken (invalid peak, live price)', () => {
  it('omits drop and peak-market-cap fields when the registry peak is zero', () => {
    const bt = toBuriedToken(
      makeToken({ peakPriceUsd: 0 }),
      makePair({ priceUsd: '1.0', marketCap: 10_000_000 }),
    );
    expect(bt.status).toBe('live');
    expect(bt.currentPriceUsd).toBe(1);
    expect(bt.dropFromPeakPct).toBeUndefined();
    expect(bt.currentMarketCapUsd).toBe(10_000_000);
    expect(bt.peakMarketCapUsd).toBeUndefined();
    expect(bt.valueLostUsd).toBeUndefined();
  });

  it('omits drop and peak-market-cap fields when the registry peak is negative', () => {
    const bt = toBuriedToken(
      makeToken({ peakPriceUsd: -50 }),
      makePair({ priceUsd: '1.0', marketCap: 10_000_000 }),
    );
    expect(bt.status).toBe('live');
    expect(bt.dropFromPeakPct).toBeUndefined();
    expect(bt.peakMarketCapUsd).toBeUndefined();
    expect(bt.valueLostUsd).toBeUndefined();
  });
});

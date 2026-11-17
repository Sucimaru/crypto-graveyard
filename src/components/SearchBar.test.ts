import { describe, it, expect } from 'vitest';
import { filterGraveyard } from './SearchBar';
import type { GraveToken } from '../data/registry';

function makeToken(overrides: Partial<GraveToken> = {}): GraveToken {
  return {
    id: 'test-token',
    name: 'Test Token',
    symbol: 'TEST',
    chainId: 'ethereum',
    contractAddress: '0xdeadbeef',
    peakPriceUsd: 100,
    dateOfDeath: '2022-01-01',
    cause: 'rugged',
    ...overrides,
  };
}

const FIXTURES = [
  { token: makeToken({ id: 'squid', name: 'Squid Game', symbol: 'SQUID', cause: 'rugged' }) },
  { token: makeToken({ id: 'safe', name: 'SafeMoon', symbol: 'SFM', cause: 'abandoned' }) },
  { token: makeToken({ id: 'cum', name: 'CumRocket', symbol: 'CUMMIES', cause: '-99%' }) },
  { token: makeToken({ id: 'kids', name: 'Save The Kids', symbol: 'KIDS', cause: 'rugged' }) },
];

describe('filterGraveyard (cause filter)', () => {
  it('returns every token for cause "all" with an empty query', () => {
    expect(filterGraveyard('', FIXTURES, 'all')).toHaveLength(4);
  });

  it('returns every token when the cause argument is omitted (backward compat)', () => {
    expect(filterGraveyard('', FIXTURES)).toHaveLength(4);
  });

  it('narrows to rugged tokens only', () => {
    const res = filterGraveyard('', FIXTURES, 'rugged');
    expect(res.map((t) => t.token.id)).toEqual(['squid', 'kids']);
  });

  it('narrows to abandoned tokens only', () => {
    const res = filterGraveyard('', FIXTURES, 'abandoned');
    expect(res.map((t) => t.token.id)).toEqual(['safe']);
  });

  it('narrows to -99% tokens only', () => {
    const res = filterGraveyard('', FIXTURES, '-99%');
    expect(res.map((t) => t.token.id)).toEqual(['cum']);
  });

  it('composes cause with the text query (both must match)', () => {
    expect(filterGraveyard('squid', FIXTURES, 'rugged')).toHaveLength(1);
    expect(filterGraveyard('squid', FIXTURES, 'abandoned')).toHaveLength(0);
    expect(filterGraveyard('moon', FIXTURES, 'abandoned')).toHaveLength(1);
    expect(filterGraveyard('moon', FIXTURES, 'rugged')).toHaveLength(0);
  });

  it('returns a copy, never the original array reference', () => {
    expect(filterGraveyard('', FIXTURES, 'all')).not.toBe(FIXTURES);
  });
});

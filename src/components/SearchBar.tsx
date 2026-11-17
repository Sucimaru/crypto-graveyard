/**
 * SearchBar + graveyard grid filtering (Requirements 3.1, 3.2, 3.3, 8.1).
 *
 * Exports three building blocks the composition root (`App`, task 15) assembles:
 *
 *  - `SearchBar`           A controlled, labelled, focusable search input. The
 *                          parent owns the query string (`value` / `onChange`) so
 *                          the same query can also drive the contract-search
 *                          fallback and the shareable URL hash.
 *  - `filterGraveyard`     Pure client-side filter: case-insensitive substring
 *                          match against name, symbol, and contract address
 *                          (Requirement 3.1). An empty query returns every token
 *                          unchanged so empty queries restore all cards.
 *  - `isContractAddress`   Detects EVM (`0x` + 40 hex) and Solana base58
 *                          address patterns (Requirement 3.3), used to decide
 *                          whether to trigger the Dexscreener fallback path
 *                          (wired in task 14 / `useTokenDetail`).
 *
 * Wiring (task 15): given `query` and the live-enriched `BuriedToken[]`,
 *   1. `filtered = filterGraveyard(query, tokens)` narrows the grid;
 *   2. a non-empty query with `filtered.length === 0` renders the `Empty` state
 *      (task 6) — unless `isContractAddress(query)` is true, in which case the
 *      contract-search fallback (task 14) runs instead and may surface `NotFound`.
 * Keeping these as pure, separately-testable helpers matches the existing data
 * layer (`lib/graveyard.ts`, `lib/dexscreener.ts`).
 */

import type { CauseOfDeath, GraveToken } from '../data/registry';

/** Cause filter value for the grid: one real cause, or 'all' for no filtering. */
export type CauseFilterValue = CauseOfDeath | 'all';

/** Chip labels for the cause filter. */
export const CAUSE_FILTER_LABELS: Record<CauseFilterValue, string> = {
  all: 'All',
  rugged: 'Rugged',
  abandoned: 'Abandoned',
  '-99%': 'Down 99%',
};

/* -------------------------------------------------------------------------- */
/* Contract-address detection (Requirement 3.3)                              */
/* -------------------------------------------------------------------------- */

/** EVM contract address: `0x` followed by exactly 40 hex digits. */
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * Solana base58 mint/account address. Solana public keys are 32 bytes, which
 * base58-encode to 43–44 chars; we accept 32–44 chars of the base58 alphabet
 * (excludes `0`, `O`, `I`, `l`). The lower length bound also keeps short names
 * and symbols from false-matching as addresses.
 */
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Detect whether a query looks like a contract address that should trigger the
 * Dexscreener fallback path (Requirement 3.3). The query is trimmed first; EVM
 * (`0x…`) is checked before Solana base58 (the two patterns cannot both match
 * since base58 excludes `0`). The actual fallback (querying Dexscreener and
 * opening detail) is wired in task 14 — this function only reports whether the
 * query is address-shaped.
 */
export function isContractAddress(query: string): boolean {
  const q = query.trim();
  return EVM_ADDRESS_RE.test(q) || SOLANA_ADDRESS_RE.test(q);
}

/* -------------------------------------------------------------------------- */
/* Client-side filtering (Requirement 3.1)                                   */
/* -------------------------------------------------------------------------- */

/**
 * Case-insensitive substring filter over the registry fields name, symbol, and
 * contract address (Requirement 3.1). An empty/whitespace query returns a fresh
 * shallow copy of every token, so empty queries restore all cards.
 *
 * The optional `cause` narrows the result to one cause of death ('all' keeps
 * every cause) and composes with the text query: both filters apply at once,
 * so "squid" + "rugged" matches only rugged tokens whose name/symbol/address
 * contains "squid".
 *
 * Generic over the token-bearing view model so it filters the live-enriched
 * `BuriedToken[]` the grid renders, matching against the underlying curated
 * `token` metadata (not live fields). A copy is returned even when filtering so
 * callers never receive the original array reference.
 */
export function filterGraveyard<T extends { token: GraveToken }>(
  query: string,
  tokens: readonly T[],
  cause: CauseFilterValue = 'all',
): T[] {
  const q = query.trim().toLowerCase();
  return tokens.filter((t) => {
    if (cause !== 'all' && t.token.cause !== cause) return false;
    if (!q) return true;
    return (
      t.token.name.toLowerCase().includes(q) ||
      t.token.symbol.toLowerCase().includes(q) ||
      t.token.contractAddress.toLowerCase().includes(q)
    );
  });
}

/* -------------------------------------------------------------------------- */
/* SearchBar input (Requirements 3.1, 8.1)                                   */
/* -------------------------------------------------------------------------- */

export interface SearchBarProps {
  /** Current query value (controlled). */
  value: string;
  /** Called with the new query string on every change. */
  onChange: (value: string) => void;
  /** DOM id used to associate the label with the input. */
  id?: string;
  /** Accessible label text (visually hidden; the placeholder is the visual hint). */
  label?: string;
  /** Placeholder shown when the input is empty. */
  placeholder?: string;
  /** Extra classes for the search region wrapper. */
  className?: string;
}

/**
 * Controlled, labelled, focusable search input (Requirements 3.1, 8.1).
 *
 * The input is a native `<input type="search">`, so it is keyboard-focusable and
 * operable by default. A visually-hidden `<label htmlFor>` provides the
 * accessible name; the wrapper carries `role="search"` to mark the region.
 * Autocapitalize/autocorrect/spellcheck are disabled so pasted contract
 * addresses are not mangled. The parent owns `value`/`onChange`.
 */
export function SearchBar({
  value,
  onChange,
  id = 'graveyard-search',
  label = 'Search the graveyard',
  placeholder = 'Search by name, symbol, or contract address',
  className,
}: SearchBarProps) {
  return (
    <div role="search" className={`w-full ${className ?? ''}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-graveyard-stone-dim"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-2xl border border-graveyard-border bg-graveyard-surface py-3 pl-10 pr-4 font-serif text-base text-graveyard-stone-light placeholder:text-graveyard-stone-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-graveyard-stone-light"
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Cause filter chips (post-launch fix 16: "filter by cause of death")       */
/* -------------------------------------------------------------------------- */

export interface CauseFilterProps {
  /** Currently selected cause ('all' = no filtering). */
  value: CauseFilterValue;
  /** Called with the newly selected cause when a chip is activated. */
  onChange: (value: CauseFilterValue) => void;
  /** Token counts per cause, plus the 'all' total, rendered on the chips. */
  counts: Record<CauseFilterValue, number>;
}

const CAUSE_FILTER_ORDER: CauseFilterValue[] = ['all', 'rugged', 'abandoned', '-99%'];

/**
 * A row of toggle chips filtering the grid by cause of death. Only the three
 * causes that actually exist in the registry are offered — there is no
 * 'hacked' chip because no registry token has that cause, and inventing a
 * filter for a cause with zero graves would be misleading. The active chip
 * uses `aria-pressed` so its state is exposed to assistive tech; counts are
 * computed by the parent from the registry-derived token list.
 */
export function CauseFilter({ value, onChange, counts }: CauseFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filter by cause of death"
      className="flex flex-wrap items-center gap-2"
    >
      {CAUSE_FILTER_ORDER.map((cause) => {
        const active = value === cause;
        return (
          <button
            key={cause}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(cause)}
            className={
              active
                ? 'rounded-full border border-[var(--graveyard-text)] bg-[var(--graveyard-surface-2)] px-3 py-1 text-sm font-medium text-[var(--graveyard-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--graveyard-text)]'
                : 'rounded-full border border-graveyard-border bg-graveyard-surface px-3 py-1 text-sm text-graveyard-stone-dim hover:text-[var(--graveyard-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-graveyard-stone-light'
            }
          >
            {CAUSE_FILTER_LABELS[cause]} ({counts[cause]})
          </button>
        );
      })}
    </div>
  );
}

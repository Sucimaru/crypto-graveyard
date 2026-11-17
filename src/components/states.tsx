/**
 * Shared UI states for the graveyard (Requirements 3.2, 7.2, 7.3).
 *
 * `Loading` is compact enough to render inside a tombstone card (the per-card
 * skeleton while live data resolves). `Empty` covers a filtered grid with no
 * matches; `NotFound` covers the contract-search "no grave found" case; and
 * `Error` is a contained, themed failure panel. All are self-contained and
 * render without data, so swapping among them does not reflow surrounding
 * content.
 */

export interface LoadingProps {
  /** Screen-reader announcement; not shown visually. */
  label?: string;
}

/** Compact per-card skeleton shown while live data resolves. */
export function Loading({ label = 'Summoning prices…' }: LoadingProps) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2">
      <span className="sr-only">{label}</span>
      <span className="h-3 w-28 animate-pulse rounded bg-graveyard-surface-2 motion-reduce:animate-none" />
      <span className="h-3 w-20 animate-pulse rounded bg-graveyard-surface-2 motion-reduce:animate-none" />
    </div>
  );
}

export interface ErrorProps {
  message?: string;
}

/** Contained, themed failure panel. */
export function Error({ message = 'The crypt gate is stuck. Try again shortly.' }: ErrorProps) {
  return (
    <div
      role="alert"
      className="tombstone-card mx-auto max-w-md px-6 py-8 text-center"
      style={{ borderColor: 'var(--cause-rugged)' }}
    >
      <p className="font-serif text-xl text-cause-rugged-soft">Something went wrong</p>
      <p className="mt-2 text-sm text-graveyard-stone-dim">{message}</p>
    </div>
  );
}

export interface EmptyProps {
  message?: string;
}

/** Empty-state message shown when a filtered grid has no matches. */
export function Empty({ message = 'No graves match that name.' }: EmptyProps) {
  return (
    <div role="status" className="mx-auto max-w-md px-6 py-10 text-center">
      <p className="font-serif text-xl text-graveyard-stone-light">The cemetery is quiet</p>
      <p className="mt-2 text-sm text-graveyard-stone-dim">{message}</p>
    </div>
  );
}

export interface NotFoundProps {
  /** Why nothing was found, e.g. an address that resolved to no pairs. */
  message: string;
}

/** "No grave found" state for contract-address search with no match. */
export function NotFound({ message }: NotFoundProps) {
  return (
    <div role="status" className="mx-auto max-w-md px-6 py-10 text-center">
      <p className="font-serif text-xl text-graveyard-stone-light">No grave found</p>
      <p className="mt-2 text-sm text-graveyard-stone-dim">{message}</p>
    </div>
  );
}

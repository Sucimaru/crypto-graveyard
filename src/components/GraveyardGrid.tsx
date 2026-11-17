/**
 * GraveyardGrid — a responsive CSS grid of TombstoneCards for the buried
 * tokens (Requirements 1.1, 7.2, 8.2, 8.3).
 *
 * The grid shell renders immediately from the registry-derived `BuriedToken[]`.
 * While live Dexscreener data is still resolving (`loading`), any token that has
 * not yet come back `live` shows a tombstone-shaped skeleton placeholder in its
 * cell instead of blocking the whole grid; once resolved, the real focusable,
 * operable TombstoneCard swaps in (Requirement 7.2 — progressive rendering).
 *
 * Semantic structure: a labelled landmark region (`<section aria-label>`)
 * wraps a semantic `<ul>`/`<li>` list so assistive tech can navigate the
 * cemetery. A single polite status line announces the loading state at the
 * region level rather than one live region per card, keeping screen-reader
 * output concise; placeholders are purely decorative (`aria-hidden`). The pulse
 * is disabled under `prefers-reduced-motion` (motion-reduce:animate-none).
 */

import type { BuriedToken } from '../types';
import { TombstoneCard } from './TombstoneCard';

export interface GraveyardGridProps {
  /** Buried tokens to render (registry-derived; updated as live data resolves). */
  tokens: BuriedToken[];
  /** Called with the token whose card was activated (opens the detail view). */
  onOpen: (token: BuriedToken) => void;
  /**
   * True while live Dexscreener data is still resolving. While true, tokens
   * still `unreachable` render a loading placeholder; once false, every
   * `unreachable` token is final and renders its (price-unknown) TombstoneCard.
   */
  loading?: boolean;
}

/**
 * Per-card skeleton placeholder (Requirement 7.2). Tombstone-shaped and purely
 * decorative; the section-level status line carries the accessible loading
 * announcement instead of one live region per card.
 */
function GraveyardCardPlaceholder() {
  return (
    <div aria-hidden="true" className="tombstone-card flex w-full min-h-[140px] flex-col gap-2 p-4">
      <span className="h-3 w-2/3 animate-pulse rounded bg-graveyard-surface-2 motion-reduce:animate-none" />
      <span className="h-3 w-1/3 animate-pulse rounded bg-graveyard-surface-2 motion-reduce:animate-none" />
      <span className="mt-2 h-3 w-1/2 animate-pulse rounded bg-graveyard-surface-2 motion-reduce:animate-none" />
      <span className="h-3 w-2/5 animate-pulse rounded bg-graveyard-surface-2 motion-reduce:animate-none" />
    </div>
  );
}

export function GraveyardGrid({ tokens, onOpen, loading = false }: GraveyardGridProps) {
  const hasUnresolved = loading && tokens.some((t) => t.status === 'unreachable');

  return (
    <section aria-label="Graveyard of dead tokens" className="w-full">
      {hasUnresolved ? (
        <p role="status" aria-live="polite" className="sr-only">
          Summoning live prices.
        </p>
      ) : null}
      <ul className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {tokens.map((token) => {
          const resolving = loading && token.status === 'unreachable';
          return (
            <li key={token.token.id} className="min-w-0">
              {resolving ? (
                <GraveyardCardPlaceholder />
              ) : (
                <TombstoneCard token={token} onOpen={() => onOpen(token)} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

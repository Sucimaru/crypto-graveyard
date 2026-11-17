/**
 * Candle — a flickering candle motif for the graveyard atmosphere
 * (Requirements 5.1, 5.3).
 *
 * Purely decorative: hidden from assistive tech. The flame flicker is disabled
 * under `prefers-reduced-motion` (see theme/index.css), leaving a steady flame.
 */
export interface CandleProps {
  /** Extra classes for positioning/spacing (e.g. Tailwind utilities). */
  className?: string;
}

export function Candle({ className }: CandleProps) {
  return (
    <div className={`candle${className ? ` ${className}` : ''}`} aria-hidden="true">
      <span className="candle__flame" />
      <span className="candle__wick" />
      <span className="candle__body" />
    </div>
  );
}

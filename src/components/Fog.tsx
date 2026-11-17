/**
 * Fog — a layered, animated fog overlay for the graveyard atmosphere
 * (Requirements 5.1, 5.3).
 *
 * Renders three translucent mist layers that parallax-drift horizontally across
 * the viewport. Decorative only: hidden from assistive tech and non-interactive.
 * The drift is disabled under `prefers-reduced-motion` (see theme/index.css),
 * leaving a static mist.
 */
export function Fog() {
  return (
    <div className="fog-overlay" aria-hidden="true">
      <div className="fog-layer fog-layer--back" />
      <div className="fog-layer fog-layer--mid" />
      <div className="fog-layer fog-layer--front" />
    </div>
  );
}

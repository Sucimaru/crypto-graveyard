/**
 * Crypto Graveyard — application shell.
 *
 * Task 1 scaffolds only the themed root container. The stats header, search bar,
 * graveyard grid, detail view, fog, and candle motifs are composed into this
 * shell in later tasks.
 */
export default function App() {
  return (
    <div className="graveyard-root min-h-screen bg-graveyard-bg text-graveyard-stone">
      <header className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h1 className="font-serif text-4xl tracking-wide text-graveyard-stone-light sm:text-5xl">
          Crypto Graveyard
        </h1>
        <p className="mt-4 text-sm text-graveyard-stone-dim">
          A resting place for rugged, abandoned, and -99% tokens.
        </p>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24">
        {/* StatsHeader, SearchBar, GraveyardGrid, and TokenDetail are wired in later tasks. */}
      </main>
    </div>
  );
}

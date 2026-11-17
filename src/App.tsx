import { Candle } from './components/Candle';
import { Fog } from './components/Fog';

/**
 * Crypto Graveyard — application shell.
 *
 * The themed root container plus the graveyard atmosphere (fog overlay and
 * candles) established in task 5. StatsHeader, SearchBar, GraveyardGrid, and
 * TokenDetail are composed into this shell in later tasks.
 */
export default function App() {
  return (
    <div className="graveyard-root relative min-h-screen bg-graveyard-bg text-graveyard-stone">
      <Fog />
      <div className="relative z-10">
        <header className="mx-auto max-w-5xl px-6 py-16 text-center">
          <div className="flex items-center justify-center gap-6 sm:gap-10">
            <Candle />
            <div>
              <h1 className="font-serif text-4xl tracking-wide text-graveyard-stone-light sm:text-5xl">
                Crypto Graveyard
              </h1>
              <p className="mt-4 text-sm text-graveyard-stone-dim">
                A resting place for rugged, abandoned, and -99% tokens.
              </p>
            </div>
            <Candle />
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 pb-24">
          {/* StatsHeader, SearchBar, GraveyardGrid, and TokenDetail are wired in later tasks. */}
        </main>
      </div>
    </div>
  );
}

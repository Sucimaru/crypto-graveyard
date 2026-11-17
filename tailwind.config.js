/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark graveyard palette (Requirement 5.1).
        graveyard: {
          bg: '#0a0b0d',
          surface: '#101216',
          'surface-2': '#161a1f',
          border: '#23262c',
          stone: '#9ca3a0',
          'stone-light': '#c8ccc7',
          'stone-dim': '#6b7270',
        },
        // Per-cause accent colors (Requirement 5.2). The `*-soft` variants meet
        // WCAG AA contrast for text/labels against the near-black background.
        cause: {
          rugged: '#c0392b',
          'rugged-soft': '#e07a6e',
          abandoned: '#7c8a6b',
          'abandoned-soft': '#aec59a',
          '99': '#c9a227',
          '99-soft': '#e8c860',
        },
      },
    },
  },
  plugins: [],
};

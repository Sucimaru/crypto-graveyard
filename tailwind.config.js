/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark graveyard palette (Requirement 5.1). Cause accent colors are
        // expanded in task 5; only the base palette is defined here.
        graveyard: {
          bg: '#0a0b0d',
          surface: '#101216',
          'surface-2': '#161a1f',
          border: '#23262c',
          stone: '#9ca3a0',
          'stone-light': '#c8ccc7',
          'stone-dim': '#6b7270',
        },
      },
    },
  },
  plugins: [],
};

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // GitHub Pages project site: https://sucimaru.github.io/crypto-graveyard/
  base: '/crypto-graveyard/',
  plugins: [react()],
});

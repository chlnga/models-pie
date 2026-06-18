import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Data JSON is bundled client-side via ?raw imports (see src/data.ts), so raise
// the warning threshold above the bundled dataset size.
export default defineConfig(({ mode }) => ({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 4000,
  },
  // The SSR bundle build (--mode ssg-server) doesn't need publicDir assets —
  // only entry-server.js is consumed by scripts/prerender.mjs.
  publicDir: mode === 'ssg-server' ? false : 'public',
}));

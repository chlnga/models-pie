import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Data JSON is bundled client-side via ?raw imports (see src/data.ts), so raise
// the warning threshold above the bundled dataset size.
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 4000,
  },
});

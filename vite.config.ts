import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    // The Razorpay functions live in `api/` and only run under Vercel's runtime.
    // Run `vercel dev` (port 3000) alongside `npm run dev` to test the full
    // payment + receipt flow locally; UI-only work needs neither.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/modules/core/test/setup.ts',
  },
});

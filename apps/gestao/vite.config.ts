import { coverage } from '@scp/config/vitest/coverage';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const apiTarget = `http://localhost:${process.env.API_PORT ?? 3000}`;
const proxy = {
  '/api': { target: apiTarget, rewrite: (path: string) => path.replace(/^\/api/, '') },
};

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  server: { port: 5173, strictPort: true, proxy },
  preview: { port: 5173, strictPort: true, proxy },
  test: {
    coverage: coverage('unit'),
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});

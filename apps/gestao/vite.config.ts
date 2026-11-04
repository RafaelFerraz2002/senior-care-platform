import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const destinoDaApi = `http://localhost:${process.env.API_PORT ?? 3000}`;
const proxy = {
  '/api': { target: destinoDaApi, rewrite: (caminho: string) => caminho.replace(/^\/api/, '') },
};

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  server: { port: 5173, strictPort: true, proxy },
  preview: { port: 5173, strictPort: true, proxy },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});

import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const apiTarget = `http://localhost:${process.env.API_PORT ?? 3000}`;
const proxy = {
  '/api': { target: apiTarget, rewrite: (path: string) => path.replace(/^\/api/, '') },
};

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Registo Diário',
        short_name: 'Registo',
        lang: 'pt-PT',
        display: 'standalone',
        start_url: '/',
        theme_color: '#0f766e',
        background_color: '#ffffff',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // App shell em cache; um reload offline serve o index.html.
        globPatterns: ['**/*.{js,css,html,png,webmanifest}'],
        navigateFallback: 'index.html',
        // A API nunca vem do service worker: sem cache, sem fallback.
        navigateFallbackDenylist: [/^\/api(\/|$)/],
      },
    }),
  ],
  server: { port: 5174, strictPort: true, proxy },
  preview: { port: 5174, strictPort: true, proxy },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});

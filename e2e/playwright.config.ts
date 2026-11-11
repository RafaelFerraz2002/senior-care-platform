import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

import { portGestao, portRegisto, urlGestao, urlRegisto } from './ports.js';

const root = fileURLToPath(new URL('..', import.meta.url));

// Variáveis locais (DATABASE_URL, ...) vêm do .env da raiz; no CI vêm do ambiente.
// loadEnvFile não sobrepõe variáveis já definidas.
if (existsSync(`${root}.env`)) process.loadEnvFile(`${root}.env`);

// Porta própria da API nos e2e: não colide com uma API de desenvolvimento na 3000.
const apiPort = process.env.E2E_API_PORT ?? '3100';
const env = { API_PORT: apiPort };
const reuseExistingServer = !process.env.CI;
// Com E2E_ALL_BROWSERS=1 (noturno) acrescentam-se o Firefox e o Safari de desktop.
const todosBrowsers = process.env.E2E_ALL_BROWSERS === '1';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { trace: 'on-first-retry' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'webkit-ipad',
      use: { ...devices['iPad (gen 7)'] },
      testMatch: /registo\.spec\.ts/,
    },
    ...(todosBrowsers
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],
  webServer: [
    {
      name: 'api',
      command: 'pnpm --filter @scp/api build && pnpm --filter @scp/api start',
      cwd: root,
      env,
      url: `http://localhost:${apiPort}/saude`,
      reuseExistingServer,
      timeout: 120_000,
    },
    {
      name: 'gestao',
      // --port na linha de comandos sobrepõe-se à porta do vite.config.ts.
      command: `pnpm --filter @scp/gestao exec vite --port ${portGestao} --strictPort`,
      cwd: root,
      env,
      url: urlGestao,
      reuseExistingServer,
    },
    {
      name: 'registo',
      // O service worker só existe na build: preview em vez de dev.
      command: `pnpm --filter @scp/registo exec vite build && pnpm --filter @scp/registo exec vite preview --port ${portRegisto} --strictPort`,
      cwd: root,
      env,
      url: urlRegisto,
      reuseExistingServer,
      timeout: 120_000,
    },
  ],
});

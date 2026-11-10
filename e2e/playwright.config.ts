import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

import { portaGestao, portaRegisto, urlGestao, urlRegisto } from './ports.js';

const raiz = fileURLToPath(new URL('..', import.meta.url));

// Variáveis locais (DATABASE_URL, ...) vêm do .env da raiz; no CI vêm do ambiente.
// loadEnvFile não sobrepõe variáveis já definidas.
if (existsSync(`${raiz}.env`)) process.loadEnvFile(`${raiz}.env`);

// Porta própria da API nos e2e: não colide com uma API de desenvolvimento na 3000.
const portaApi = process.env.E2E_API_PORT ?? '3100';
const env = { API_PORT: portaApi };
const reuseExistingServer = !process.env.CI;

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
  ],
  webServer: [
    {
      name: 'api',
      command: 'pnpm --filter @scp/api build && pnpm --filter @scp/api start',
      cwd: raiz,
      env,
      url: `http://localhost:${portaApi}/saude`,
      reuseExistingServer,
      timeout: 120_000,
    },
    {
      name: 'gestao',
      // --port na linha de comandos sobrepõe-se à porta do vite.config.ts.
      command: `pnpm --filter @scp/gestao exec vite --port ${portaGestao} --strictPort`,
      cwd: raiz,
      env,
      url: urlGestao,
      reuseExistingServer,
    },
    {
      name: 'registo',
      // O service worker só existe na build: preview em vez de dev.
      command: `pnpm --filter @scp/registo exec vite build && pnpm --filter @scp/registo exec vite preview --port ${portaRegisto} --strictPort`,
      cwd: raiz,
      env,
      url: urlRegisto,
      reuseExistingServer,
      timeout: 120_000,
    },
  ],
});

import { coverage } from '@scp/config/vitest/coverage';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    coverage: coverage('integration'),
    // Testes de integração: precisam do Docker (Testcontainers) e correm só com `pnpm test:integration`.
    include: ['test/**/*.integration.test.ts', 'test/**/*.seguranca.test.ts'],
    // O primeiro arranque pode ter de descarregar a imagem do Postgres.
    hookTimeout: 180_000,
    testTimeout: 60_000,
  },
});

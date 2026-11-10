import base from '@scp/config/eslint/base';
import react from '@scp/config/eslint/react';

const reactFiles = [
  'apps/gestao/**/*.{ts,tsx}',
  'apps/registo/**/*.{ts,tsx}',
  'packages/ui/**/*.{ts,tsx}',
];

export default [
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/node_modules/**',
      '.superpowers/**',
      '.claude/**',
      'playwright-report/**',
      'test-results/**',
      // Gerado pela hey-api (pnpm generate:api-client): nunca se edita à mão.
      'packages/api-client/src/**',
      // Gerado pelo plugin do TanStack Router (commitado para o typecheck funcionar sem correr o Vite).
      '**/routeTree.gen.ts',
    ],
  },
  ...base,
  ...react.map((config) => ({ ...config, files: reactFiles })),
];

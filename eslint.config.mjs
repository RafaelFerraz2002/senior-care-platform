import base from '@scp/config/eslint/base';
import react from '@scp/config/eslint/react';

const ficheirosReact = [
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
    ],
  },
  ...base,
  ...react.map((config) => ({ ...config, files: ficheirosReact })),
];

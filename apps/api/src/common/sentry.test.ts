import { describe, expect, it } from 'vitest';

import { initSentry } from './sentry.js';

describe('initSentry', () => {
  it('não inicializa o Sentry sem SENTRY_DSN', () => {
    expect(initSentry({ databaseUrl: 'x', apiPort: 3000, logLevel: 'info' })).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('recusa arrancar sem DATABASE_URL', () => {
    expect(() => loadConfig({})).toThrowError('Variável de ambiente em falta: DATABASE_URL');
  });

  it('usa a porta 3000 por omissão', () => {
    const config = loadConfig({ DATABASE_URL: 'postgresql://app:x@localhost:5440/scp' });

    expect(config.apiPort).toBe(3000);
    expect(config.logLevel).toBe('info');
    expect(config.sentryDsn).toBeUndefined();
  });

  it('lê a porta e o nível de log do ambiente', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgresql://app:x@localhost:5440/scp',
      API_PORT: '3010',
      LOG_LEVEL: 'debug',
      SENTRY_DSN: 'https://exemplo.invalid/1',
    });

    expect(config).toEqual({
      databaseUrl: 'postgresql://app:x@localhost:5440/scp',
      apiPort: 3010,
      logLevel: 'debug',
      sentryDsn: 'https://exemplo.invalid/1',
    });
  });

  it('usa a porta 3000 quando API_PORT está vazia', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgresql://app:x@localhost:5440/scp',
      API_PORT: '',
    });
    expect(config.apiPort).toBe(3000);
  });

  it('recusa uma API_PORT inválida', () => {
    for (const valor of ['abc', '0', '70000', '30.5', '-1']) {
      expect(() =>
        loadConfig({ DATABASE_URL: 'postgresql://app:x@localhost:5440/scp', API_PORT: valor }),
      ).toThrowError(`API_PORT inválida: ${valor}`);
    }
  });
});

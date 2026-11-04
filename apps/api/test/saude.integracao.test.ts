import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { BaseDeDadosService } from '../src/base-de-dados/index.js';
import { createApp } from '../src/criar-app.js';
import { type PostgresDeTeste, startTestPostgres } from './postgres-de-teste.js';

describe('GET /saude (com Postgres real)', () => {
  let postgres: PostgresDeTeste;
  let app: INestApplication;
  let baseUrl: string;
  let postgresParado = false;

  beforeAll(async () => {
    postgres = await startTestPostgres();
    app = await createApp({ databaseUrl: postgres.url });
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
    if (!postgresParado) {
      await postgres?.stop();
    }
  });

  it('responde ok com a base de dados ligada', async () => {
    const resposta = await fetch(`${baseUrl}/saude`);

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ estado: 'ok', baseDeDados: 'ok' });
  });

  it('liga-se com o papel app, que não é superutilizador', async () => {
    const linhas = await app
      .get(BaseDeDadosService)
      .consultar<{ current_user: string; rolsuper: boolean; rolbypassrls: boolean }>(
        'SELECT current_user, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user',
      );

    expect(linhas).toEqual([{ current_user: 'app', rolsuper: false, rolbypassrls: false }]);
  });

  it('não abre CORS a origens estranhas', async () => {
    const resposta = await fetch(`${baseUrl}/saude`, {
      headers: { Origin: 'https://exemplo.invalid' },
    });

    expect(resposta.headers.get('access-control-allow-origin')).toBeNull();
  });

  // Este teste fica por último: pára o Postgres.
  it('responde 503 sem derrubar a API quando a base de dados está em baixo', async () => {
    await postgres.stop();
    postgresParado = true;

    const resposta = await fetch(`${baseUrl}/saude`);
    expect(resposta.status).toBe(503);
    expect(await resposta.json()).toEqual({ estado: 'erro', baseDeDados: 'erro' });

    // A API continua viva: responde a um segundo pedido (um erro não tratado da pool deitava o processo abaixo).
    const outra = await fetch(`${baseUrl}/saude`);
    expect(outra.status).toBe(503);
  });
});

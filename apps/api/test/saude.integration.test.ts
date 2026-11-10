import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../src/create-app.js';
import { type TestPostgres, startTestPostgres } from './test-postgres.js';

describe('GET /saude (com Postgres real)', () => {
  let postgres: TestPostgres;
  let app: INestApplication;
  let baseUrl: string;
  let postgresStopped = false;

  beforeAll(async () => {
    postgres = await startTestPostgres();
    app = await createApp({ databaseUrl: postgres.url });
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
    if (!postgresStopped) {
      await postgres?.stop();
    }
  });

  it('responde ok com a base de dados ligada', async () => {
    const response = await fetch(`${baseUrl}/saude`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', database: 'ok' });
  });

  it('liga-se com o papel app, que não é superutilizador', async () => {
    // O pedido ao /saude obriga a pool real da API a ligar-se.
    await fetch(`${baseUrl}/saude`);

    const rows = await postgres.queryAsSuperuser(
      `SELECT a.usename, r.rolsuper, r.rolbypassrls
         FROM pg_stat_activity a JOIN pg_roles r ON r.rolname = a.usename
        WHERE a.datname = 'scp_test' AND a.backend_type = 'client backend'
          AND a.pid <> pg_backend_pid()
        GROUP BY 1, 2, 3`,
    );
    const all = await postgres.queryAsSuperuser(
      `SELECT DISTINCT usename FROM pg_stat_activity
        WHERE datname = 'scp_test' AND backend_type = 'client backend'
          AND pid <> pg_backend_pid()`,
    );

    expect(rows).toEqual(['app|f|f']);
    expect(all).toEqual(['app']);
  });

  it('não abre CORS a origens estranhas', async () => {
    const response = await fetch(`${baseUrl}/saude`, {
      headers: { Origin: 'https://exemplo.invalid' },
    });

    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  // Este teste fica por último: pára o Postgres.
  it('responde 503 sem derrubar a API quando a base de dados está em baixo', async () => {
    await postgres.stop();
    postgresStopped = true;

    const response = await fetch(`${baseUrl}/saude`);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'error', database: 'error' });

    // A API continua viva: responde a um segundo pedido (um erro não tratado da pool deitava o processo abaixo).
    const other = await fetch(`${baseUrl}/saude`);
    expect(other.status).toBe(503);
  });
});

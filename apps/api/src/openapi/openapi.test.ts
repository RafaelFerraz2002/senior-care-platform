import { readFile } from 'node:fs/promises';

import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../criar-app.js';
import { generateOpenApiDocument, openApiPath } from './gerar-openapi.js';

describe('OpenAPI', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // URL de substituição: o teste nunca se liga à base de dados (a pool é preguiçosa).
    app = await createApp({ databaseUrl: 'postgresql://app:sem-ligacao@localhost:1/sem-ligacao' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('o openapi.json versionado está igual ao gerado a partir do código', async () => {
    const committed: unknown = JSON.parse(await readFile(openApiPath, 'utf8'));

    expect(generateOpenApiDocument(app)).toEqual(committed);
  });

  it('documenta GET /saude com o schema SaudeResposta', () => {
    const document = generateOpenApiDocument(app);

    expect(document.paths['/saude']?.get).toMatchObject({
      operationId: 'getSaude',
      responses: {
        '200': {
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/SaudeResposta' } },
          },
        },
        '503': {
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/SaudeResposta' } },
          },
        },
      },
    });
    expect(document.components?.schemas?.['SaudeResposta']).toMatchObject({
      properties: { estado: expect.any(Object), baseDeDados: expect.any(Object) },
    });
  });
});

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

import { createApp } from '../criar-app.js';

/** O openapi.json versionado, na raiz de apps/api (o mesmo caminho a partir de src/ e de dist/). */
export const openApiPath = fileURLToPath(new URL('../../openapi.json', import.meta.url));

/**
 * Gera o documento OpenAPI a partir dos controllers e dos schemas Zod de `@scp/shared`
 * (o `@nestjs/swagger` converte-os com o JSON Schema do Zod). Não põe a app à escuta.
 */
export function generateOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Senior Care Platform API')
    .setVersion('0.0.0')
    .build();

  return SwaggerModule.createDocument(app, config);
}

/** Ordena as chaves dos objetos (não a ordem dos arrays), para o ficheiro não mudar sem motivo. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, child]) => [key, sortKeys(child)]),
    );
  }
  return value;
}

export function serializeOpenApiDocument(document: OpenAPIObject): string {
  return `${JSON.stringify(sortKeys(document), null, 2)}\n`;
}

// Corrido pelo `pnpm gerar:api-client` (a partir de dist/): escreve o apps/api/openapi.json.
if (import.meta.main) {
  // URL de substituição: o gerador nunca se liga à base de dados (a pool é preguiçosa).
  const app = await createApp({
    databaseUrl: 'postgresql://app:sem-ligacao@localhost:1/sem-ligacao',
  });
  const document = generateOpenApiDocument(app);
  await app.close();
  await writeFile(openApiPath, serializeOpenApiDocument(document));
  console.log(`OpenAPI escrito em ${openApiPath}`);
}

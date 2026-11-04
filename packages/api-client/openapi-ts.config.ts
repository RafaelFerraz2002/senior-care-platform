import { defineConfig } from '@hey-api/openapi-ts';

// Gera o cliente a partir do OpenAPI da API. O src/ é gerado: nunca se edita à mão
// (regenera-se com `pnpm gerar:api-client` na raiz).
export default defineConfig({
  input: '../../apps/api/openapi.json',
  output: {
    path: 'src',
    clean: true,
    // ESM no Node (NodeNext) exige a extensão nos imports relativos.
    module: { extension: '.js' },
  },
  plugins: [
    // O `client` também sai no index, para as apps definirem o `baseUrl` (ex.: '/api').
    { name: '@hey-api/client-fetch', includeInEntry: true },
    '@hey-api/typescript',
    '@hey-api/sdk',
    { name: '@tanstack/react-query', includeInEntry: true },
  ],
});

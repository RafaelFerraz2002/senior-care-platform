import { fileURLToPath, URL } from 'node:url';

import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';

// Raiz do repositório: os padrões dos elementos são relativos a ela, e não ao cwd. Sem isto, o
// `eslint .` corrido dentro de um pacote (turbo run lint) não reconhece nenhum elemento e não avisa.
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

const typesWithoutDatabase = ['app-api', 'app-web', 'package', 'api-module'];

/** Configuração base partilhada: typescript-eslint, complexidade e fronteiras entre módulos. */
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs}'],
    plugins: { boundaries },
    settings: {
      'boundaries/root-path': repoRoot,
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
      },
      // Os elementos mais específicos vêm primeiro: cada ficheiro pertence a um só elemento.
      'boundaries/elements': [
        { type: 'api-module', pattern: 'apps/api/src/modules/*' },
        { type: 'api-database', pattern: 'apps/api/src/database' },
        { type: 'app-api', pattern: 'apps/api' },
        { type: 'app-web', pattern: ['apps/gestao', 'apps/registo'] },
        { type: 'package', pattern: 'packages/*' },
      ],
    },
    rules: {
      complexity: ['error', 10],
      '@typescript-eslint/no-unused-vars': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          checkAllOrigins: true,
          policies: [
            // Bibliotecas externas e módulos do Node: permitidos a todos.
            { allow: { to: { module: { origin: ['external', 'core'] } } } },
            // As apps web só dependem de pacotes (nunca da API nem uma da outra).
            {
              from: { element: { type: 'app-web' } },
              allow: { to: { element: { type: 'package' } } },
            },
            {
              from: { element: { type: 'package' } },
              allow: { to: { element: { type: 'package' } } },
            },
            {
              from: { element: { types: ['app-api', 'api-module', 'api-database'] } },
              allow: {
                to: {
                  element: { types: ['app-api', 'api-module', 'api-database', 'package'] },
                },
              },
            },
            // Um módulo da API só importa o index.ts de outro módulo.
            {
              disallow: {
                to: { element: { type: 'api-module' }, file: { path: '!**/index.ts' } },
              },
              message: 'Um módulo da API só pode ser importado pelo seu index.ts.',
            },
            // A camada da base de dados também só se importa pelo seu index.ts.
            {
              disallow: {
                to: { element: { type: 'api-database' }, file: { path: '!**/index.ts' } },
              },
              message: 'A camada da base de dados só pode ser importada pelo seu index.ts.',
            },
            // Só a camada da base de dados importa o pg.
            {
              from: { element: { types: typesWithoutDatabase } },
              disallow: { dependency: { source: 'pg' } },
              message: 'Só o código em apps/api/src/database pode importar o pg.',
            },
          ],
        },
      ],
    },
  },
];

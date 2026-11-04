import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';

const tiposSemBaseDeDados = ['app-api', 'app-web', 'pacote', 'api-modulo'];

/** Configuração base partilhada: typescript-eslint, complexidade e fronteiras entre módulos. */
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
      },
      // Os elementos mais específicos vêm primeiro: cada ficheiro pertence a um só elemento.
      'boundaries/elements': [
        { type: 'api-modulo', pattern: 'apps/api/src/modulos/*' },
        { type: 'api-base-de-dados', pattern: 'apps/api/src/base-de-dados' },
        { type: 'app-api', pattern: 'apps/api' },
        { type: 'app-web', pattern: ['apps/gestao', 'apps/registo'] },
        { type: 'pacote', pattern: 'packages/*' },
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
              allow: { to: { element: { type: 'pacote' } } },
            },
            {
              from: { element: { type: 'pacote' } },
              allow: { to: { element: { type: 'pacote' } } },
            },
            {
              from: { element: { types: ['app-api', 'api-modulo', 'api-base-de-dados'] } },
              allow: {
                to: {
                  element: { types: ['app-api', 'api-modulo', 'api-base-de-dados', 'pacote'] },
                },
              },
            },
            // Um módulo da API só importa o index.ts de outro módulo.
            {
              disallow: {
                to: { element: { type: 'api-modulo' }, file: { path: '!**/index.ts' } },
              },
              message: 'Um módulo da API só pode ser importado pelo seu index.ts.',
            },
            // Só a camada da base de dados importa o pg.
            {
              from: { element: { types: tiposSemBaseDeDados } },
              disallow: { dependency: { source: 'pg' } },
              message: 'Só o código em apps/api/src/base-de-dados pode importar o pg.',
            },
          ],
        },
      ],
    },
  },
];

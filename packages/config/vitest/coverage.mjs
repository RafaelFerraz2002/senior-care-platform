// Cobertura v8 partilhada: só os `.ts` em `src/` contam (ADR-005, estratégia de testes).
// `enabled: false` por omissão; liga-se com `--coverage` (CI) e o lcov alimenta o diff-cover.

const EXCLUDE = [
  '**/*.test.ts',
  '**/*.gen.ts',
  '**/*.d.ts',
  '**/*.config.ts',
  '**/migrations/**',
  'src/main.ts',
  // Pontos de entrada (CLI), como o `main.ts`.
  'src/**/*-cli.ts',
];

/**
 * @param {'unit' | 'integration'} directory
 */
export function coverage(directory) {
  return {
    provider: /** @type {const} */ ('v8'),
    enabled: false,
    reporter: ['lcov', 'text-summary'],
    reportsDirectory: `coverage/${directory}`,
    include: ['src/**/*.ts'],
    exclude: EXCLUDE,
  };
}

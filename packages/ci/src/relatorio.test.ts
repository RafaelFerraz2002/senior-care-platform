import { describe, expect, it } from 'vitest';
import { buildRelatorio } from './relatorio.ts';

const excecao = {
  tipo: 'v8-ignore',
  ficheiro: 'apps/api/src/x.ts',
  linha: 12,
  texto: '/* v8 ignore next */',
} as const;

describe('buildRelatorio', () => {
  it('mostra a cobertura das linhas alteradas, a global e as exceções', () => {
    const texto = buildRelatorio({
      alteradas: { percentagem: 85, linhas: 40 },
      global: 72.3,
      excecoes: [excecao],
      minimo: 80,
    });

    expect(texto).toBe(`## Relatório do CI

**Cobertura das linhas alteradas:** 85,0% (40 linhas; mínimo 80%)
**Cobertura global (informativa):** 72,3%

### Exceções introduzidas por este PR

| Tipo        | Ficheiro            | Linha |
| ----------- | ------------------- | ----- |
| \`v8 ignore\` | \`apps/api/src/x.ts\` | 12    |

As exceções só entram com autorização do dono, dada pelo merge (ADR-005).
`);
  });

  it('diz que não há linhas que contem quando o PR não mexe em código contado', () => {
    const texto = buildRelatorio({
      alteradas: { percentagem: 100, linhas: 0 },
      global: null,
      excecoes: [],
      minimo: 80,
    });

    expect(texto).toContain(
      '**Cobertura das linhas alteradas:** sem linhas que contem para a cobertura.\n',
    );
    expect(texto).not.toContain('global');
  });

  it('diz que a cobertura está indisponível quando o job cobertura não chegou ao fim', () => {
    const texto = buildRelatorio({ alteradas: null, global: null, excecoes: [], minimo: 80 });

    expect(texto).toContain(
      '**Cobertura das linhas alteradas:** indisponível (o job `cobertura` não chegou ao fim).\n',
    );
  });

  it('diz sem exceções quando o PR não introduz nenhuma', () => {
    const texto = buildRelatorio({
      alteradas: { percentagem: 90, linhas: 10 },
      global: 80,
      excecoes: [],
      minimo: 80,
    });

    expect(texto).toContain('### Exceções introduzidas por este PR\n\nSem exceções.\n');
    expect(texto).not.toContain('| Tipo');
  });

  it('dá nome legível a cada tipo de exceção', () => {
    const tipos = [
      'teste-desligado',
      'eslint-disable',
      'ts-ignore',
      'tamanho-apps',
      'audit-ignorada',
    ] as const;
    const texto = buildRelatorio({
      alteradas: null,
      global: null,
      excecoes: tipos.map((tipo) => ({ ...excecao, tipo })),
      minimo: 80,
    });

    expect(texto).toContain('Teste desligado');
    expect(texto).toContain('`eslint-disable`');
    expect(texto).toContain('`@ts-ignore` / `@ts-expect-error`');
    expect(texto).toContain('Valor de referência em `app-sizes.json`');
    expect(texto).toContain('Vulnerabilidade ignorada no audit');
  });
});

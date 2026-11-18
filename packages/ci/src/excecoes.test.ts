import { describe, expect, it } from 'vitest';

import { findExcecoes } from './excecoes.ts';

function diffDe(ficheiro: string, hunk: string, linhas: string[]): string {
  return [
    `diff --git a/${ficheiro} b/${ficheiro}`,
    `--- a/${ficheiro}`,
    `+++ b/${ficheiro}`,
    hunk,
    ...linhas,
  ].join('\n');
}

describe('findExcecoes', () => {
  it('encontra um v8 ignore numa linha acrescentada, com o ficheiro e a linha do ficheiro novo', () => {
    const diff = diffDe('apps/api/src/x.ts', '@@ -10,0 +11,2 @@', [
      '+const a = 1;',
      '+  /* v8 ignore next */',
    ]);
    expect(findExcecoes(diff)).toEqual([
      {
        tipo: 'v8-ignore',
        ficheiro: 'apps/api/src/x.ts',
        linha: 12,
        texto: '/* v8 ignore next */',
      },
    ]);
  });

  it('ignora as linhas removidas e os ficheiros apagados', () => {
    const removida = diffDe('a.ts', '@@ -1,1 +0,0 @@', ['-// eslint-disable']);
    const apagado = [
      'diff --git a/b.ts b/b.ts',
      'deleted file mode 100644',
      '--- a/b.ts',
      '+++ /dev/null',
      '@@ -1,1 +0,0 @@',
      '-it.skip(',
    ].join('\n');
    expect(findExcecoes(`${removida}\n${apagado}`)).toEqual([]);
  });

  it('reconhece testes desligados com skip, todo e fixme', () => {
    const diff = diffDe('a.test.ts', '@@ -0,0 +1,3 @@', [
      "+it.skip('x', () => {});",
      "+test.todo('y');",
      "+test.fixme('z', () => {});",
    ]);
    expect(findExcecoes(diff).map((e) => e.tipo)).toEqual([
      'teste-desligado',
      'teste-desligado',
      'teste-desligado',
    ]);
  });

  it('reconhece eslint-disable, @ts-ignore e @ts-expect-error', () => {
    const diff = diffDe('a.ts', '@@ -0,0 +1,3 @@', [
      '+// eslint-disable-next-line no-console',
      '+// @ts-ignore',
      '+// @ts-expect-error motivo',
    ]);
    expect(findExcecoes(diff).map((e) => e.tipo)).toEqual([
      'eslint-disable',
      'ts-ignore',
      'ts-ignore',
    ]);
  });

  it('marca uma só vez a mudança ao app-sizes.json', () => {
    const diff = diffDe('app-sizes.json', '@@ -3,0 +4,2 @@', [
      '+  "gestao": 200,',
      '+  "registo": 100',
    ]);
    expect(findExcecoes(diff)).toEqual([
      { tipo: 'tamanho-apps', ficheiro: 'app-sizes.json', linha: 4, texto: '"gestao": 200,' },
    ]);
  });

  it('marca uma vulnerabilidade ignorada no pnpm-workspace.yaml', () => {
    const diff = diffDe('pnpm-workspace.yaml', '@@ -5,0 +6,2 @@', [
      '+    - GHSA-xxxx-yyyy-zzzz',
      '+  - packages/*',
    ]);
    expect(findExcecoes(diff)).toEqual([
      {
        tipo: 'audit-ignorada',
        ficheiro: 'pnpm-workspace.yaml',
        linha: 6,
        texto: '- GHSA-xxxx-yyyy-zzzz',
      },
    ]);
  });

  it('não marca comentários do pnpm-workspace.yaml que citam um aviso', () => {
    const diff = diffDe('pnpm-workspace.yaml', '@@ -5,0 +6,1 @@', [
      '+# Sem GHSA-xxxx-yyyy-zzzz ignorados: o audit falha.',
    ]);
    expect(findExcecoes(diff)).toEqual([]);
  });

  it('marca um gitleaks:allow em qualquer ficheiro', () => {
    const diff = [
      diffDe('config/x.yml', '@@ -1,0 +2,1 @@', ['+token: abc # gitleaks:allow']),
      diffDe('apps/api/src/x.ts', '@@ -0,0 +1,1 @@', ["+const chave = 'abc'; // gitleaks:allow"]),
    ].join('\n');
    expect(findExcecoes(diff)).toEqual([
      {
        tipo: 'segredo-ignorado',
        ficheiro: 'config/x.yml',
        linha: 2,
        texto: 'token: abc # gitleaks:allow',
      },
      {
        tipo: 'segredo-ignorado',
        ficheiro: 'apps/api/src/x.ts',
        linha: 1,
        texto: "const chave = 'abc'; // gitleaks:allow",
      },
    ]);
  });

  it('não marca o gitleaks:allow citado entre acentos graves na documentação', () => {
    const diff = diffDe('CONTRIBUTING.md', '@@ -0,0 +1,1 @@', [
      '+Um `gitleaks:allow` conta como exceção.',
    ]);
    expect(findExcecoes(diff)).toEqual([]);
  });

  it('marca cada linha acrescentada ao .gitleaksignore', () => {
    const diff = diffDe('.gitleaksignore', '@@ -0,0 +1,2 @@', [
      '+abc123:apps/api/src/x.ts:generic-api-key:4',
      '+def456:e2e/y.ts:generic-api-key:9',
    ]);
    expect(findExcecoes(diff)).toEqual([
      {
        tipo: 'segredo-ignorado',
        ficheiro: '.gitleaksignore',
        linha: 1,
        texto: 'abc123:apps/api/src/x.ts:generic-api-key:4',
      },
      {
        tipo: 'segredo-ignorado',
        ficheiro: '.gitleaksignore',
        linha: 2,
        texto: 'def456:e2e/y.ts:generic-api-key:9',
      },
    ]);
  });

  it('marca uma só vez a mudança ao .gitleaks.toml', () => {
    const diff = diffDe('.gitleaks.toml', '@@ -0,0 +1,3 @@', [
      '+[allowlist]',
      '+paths = ["e2e/"]',
      '+regexes = ["abc"]',
    ]);
    expect(findExcecoes(diff)).toEqual([
      { tipo: 'segredo-ignorado', ficheiro: '.gitleaks.toml', linha: 1, texto: '[allowlist]' },
    ]);
  });

  it('não marca os ficheiros do relatório, que citam os padrões de propósito', () => {
    const diff = [
      diffDe('packages/ci/src/relatorio.ts', '@@ -0,0 +1,1 @@', ['+// eslint-disable']),
      diffDe('packages/ci/src/relatorio.test.ts', '@@ -0,0 +1,1 @@', ['+// v8 ignore next']),
    ].join('\n');
    expect(findExcecoes(diff)).toEqual([]);
  });

  it('não marca padrões citados em documentação', () => {
    const diff = diffDe('CONTRIBUTING.md', '@@ -0,0 +1,1 @@', ['+Não uses eslint-disable.']);
    expect(findExcecoes(diff)).toEqual([]);
  });

  it('não marca os ficheiros do próprio detetor', () => {
    const diff = diffDe('packages/ci/src/excecoes.test.ts', '@@ -0,0 +1,1 @@', [
      '+/* v8 ignore next */',
    ]);
    expect(findExcecoes(diff)).toEqual([]);
  });

  it('segue o ficheiro renomeado pelo nome novo', () => {
    const diff = [
      'diff --git a/a.ts b/b.ts',
      'similarity index 80%',
      'rename from a.ts',
      'rename to b.ts',
      '--- a/a.ts',
      '+++ b/b.ts',
      '@@ -0,0 +1,1 @@',
      '+// eslint-disable-next-line',
    ].join('\n');
    expect(findExcecoes(diff)).toEqual([
      { tipo: 'eslint-disable', ficheiro: 'b.ts', linha: 1, texto: '// eslint-disable-next-line' },
    ]);
  });
});

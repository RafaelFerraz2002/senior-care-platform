import { describe, expect, it } from 'vitest';
import { globalDoLcov, mergeLcov, pacoteDoLcov, rewriteLcovPaths, sumLcov } from './lcov.ts';

function registo(ficheiro: string, linhas: [number, number][]): string {
  const cobertas = linhas.filter(([, n]) => n > 0).length;
  return [
    'TN:',
    `SF:${ficheiro}`,
    ...linhas.map(([linha, n]) => `DA:${linha},${n}`),
    `LF:${linhas.length}`,
    `LH:${cobertas}`,
    'end_of_record',
    '',
  ].join('\n');
}

function linhasNumeradas(inicio: number, total: number, cobertas: number): [number, number][] {
  return Array.from({ length: total }, (_, i) => [inicio + i, i < cobertas ? 1 : 0]);
}

describe('rewriteLcovPaths', () => {
  it('põe os caminhos relativos à raiz do repositório', () => {
    const relativo = registo('src/config.ts', [[1, 1]]);
    const absoluto = registo('/repo/apps/api/src/config.ts', [[1, 1]]);

    expect(rewriteLcovPaths(relativo, 'apps/api', '/repo')).toContain(
      'SF:apps/api/src/config.ts\n',
    );
    expect(rewriteLcovPaths(absoluto, 'apps/api', '/repo')).toContain(
      'SF:apps/api/src/config.ts\n',
    );
  });

  it('deixa como está um caminho absoluto fora do repositório', () => {
    const fora = registo('/outro/x.ts', [[1, 1]]);

    expect(rewriteLcovPaths(fora, 'apps/api', '/repo')).toContain('SF:/outro/x.ts\n');
  });
});

describe('mergeLcov', () => {
  it('junta o mesmo ficheiro de dois relatórios ficando com a linha coberta', () => {
    const a = registo('apps/api/src/x.ts', [
      [3, 0],
      [4, 1],
    ]);
    const b = registo('apps/api/src/x.ts', [
      [3, 2],
      [5, 0],
    ]);

    const junto = mergeLcov([a, b]);

    expect(junto).toContain('DA:3,2\n');
    expect(junto).toContain('DA:4,1\n');
    expect(junto).toContain('DA:5,0\n');
    expect(junto).toContain('LF:3\n');
    expect(junto).toContain('LH:2\n');
  });

  it('ordena a saída por ficheiro', () => {
    const junto = mergeLcov([registo('b.ts', [[1, 1]]), registo('a.ts', [[1, 1]])]);

    expect(junto.indexOf('SF:a.ts')).toBeLessThan(junto.indexOf('SF:b.ts'));
  });
});

describe('sumLcov', () => {
  it('soma as linhas de todos os ficheiros', () => {
    const lcov = [
      registo('a.ts', linhasNumeradas(1, 10, 8)),
      registo('b.ts', linhasNumeradas(1, 10, 2)),
    ].join('');

    expect(sumLcov(lcov)).toEqual({ linhas: 20, cobertas: 10, percentagem: 50 });
  });

  it('dá 100% quando não há linhas', () => {
    expect(sumLcov('')).toEqual({ linhas: 0, cobertas: 0, percentagem: 100 });
  });
});

describe('pacoteDoLcov', () => {
  it('devolve a pasta do pacote a partir do caminho do lcov.info', () => {
    expect(pacoteDoLcov('/repo', '/repo/apps/api/coverage/unit/lcov.info')).toBe('apps/api');
    expect(pacoteDoLcov('/repo/', '/repo/packages/ci/coverage/seguranca/lcov.info')).toBe(
      'packages/ci',
    );
  });
});

describe('globalDoLcov', () => {
  it('dá a percentagem global do lcov', () => {
    expect(globalDoLcov(registo('a.ts', linhasNumeradas(1, 10, 5)))).toBe(50);
  });

  it('não dá percentagem quando o lcov falta ou não tem linhas', () => {
    expect(globalDoLcov(null)).toBeNull();
    expect(globalDoLcov('')).toBeNull();
  });
});

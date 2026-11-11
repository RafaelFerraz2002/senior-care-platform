import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeLcov, pacoteDoLcov, rewriteLcovPaths } from './lcov.ts';

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));

function writeSaida(saida: string, conteudo: string): void {
  mkdirSync(dirname(saida), { recursive: true });
  writeFileSync(saida, conteudo);
}

/**
 * Descobre `{apps,packages}/*\/coverage/<tipo>/lcov.info`. O que conta é definido só pelo
 * `coverage.include` do vitest de cada pacote: sem `coverage(...)` não há lcov e o pacote fica de fora.
 */
function findLcovs(tipo: string): string[] {
  return ['apps', 'packages'].flatMap((grupo) => {
    const pasta = join(REPO_ROOT, grupo);
    if (!existsSync(pasta)) return [];
    return readdirSync(pasta)
      .map((nome) => join(pasta, nome, 'coverage', tipo, 'lcov.info'))
      .filter((ficheiro) => existsSync(ficheiro));
  });
}

function collect(tipo: string, saida: string): void {
  const conteudos = findLcovs(tipo).map((ficheiro) =>
    rewriteLcovPaths(readFileSync(ficheiro, 'utf8'), pacoteDoLcov(REPO_ROOT, ficheiro), REPO_ROOT),
  );
  if (conteudos.length === 0) console.log(`Sem cobertura de ${tipo}.`);
  writeSaida(saida, mergeLcov(conteudos));
}

function merge(saida: string, entradas: string[]): void {
  const conteudos = entradas.filter((e) => existsSync(e)).map((e) => readFileSync(e, 'utf8'));
  writeSaida(saida, mergeLcov(conteudos));
}

const [comando, ...argumentos] = process.argv.slice(2);
if (comando === 'collect' && argumentos.length === 2) {
  collect(argumentos[0]!, argumentos[1]!);
} else if (comando === 'merge' && argumentos.length >= 1) {
  merge(argumentos[0]!, argumentos.slice(1));
} else {
  console.error('Uso: lcov-cli.ts collect <tipo> <saida> | merge <saida> <entrada>...');
  process.exitCode = 1;
}

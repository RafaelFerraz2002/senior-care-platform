import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUNTED_PACKAGES, mergeLcov, rewriteLcovPaths } from './lcov.ts';

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));

function writeSaida(saida: string, conteudo: string): void {
  mkdirSync(dirname(saida), { recursive: true });
  writeFileSync(saida, conteudo);
}

function collect(tipo: string, saida: string): void {
  const conteudos = COUNTED_PACKAGES.flatMap((pacote) => {
    const ficheiro = join(REPO_ROOT, pacote, 'coverage', tipo, 'lcov.info');
    return existsSync(ficheiro)
      ? [rewriteLcovPaths(readFileSync(ficheiro, 'utf8'), pacote, REPO_ROOT)]
      : [];
  });
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

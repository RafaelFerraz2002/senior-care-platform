import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { findExcecoes } from './excecoes.ts';
import { sumLcov } from './lcov.ts';
import { buildRelatorio, type DadosRelatorio } from './relatorio.ts';

const MINIMO_COBERTURA = 80;

const { values } = parseArgs({
  options: {
    lcov: { type: 'string' },
    'diff-cover': { type: 'string' },
    diff: { type: 'string' },
    saida: { type: 'string' },
  },
});

function readSeExiste(ficheiro: string | undefined): string | null {
  return ficheiro !== undefined && existsSync(ficheiro) ? readFileSync(ficheiro, 'utf8') : null;
}

function alteradasDoDiffCover(json: string | null): DadosRelatorio['alteradas'] {
  if (json === null) return null;
  const dados = JSON.parse(json) as { total_percent_covered: number; total_num_lines: number };
  return { percentagem: dados.total_percent_covered, linhas: dados.total_num_lines };
}

if (values.saida === undefined) {
  console.error('Uso: relatorio-cli.ts --lcov <f> --diff-cover <json> --diff <f> --saida <md>');
  process.exit(1);
}

const lcov = readSeExiste(values.lcov);
const diff = readSeExiste(values.diff);
const texto = buildRelatorio({
  alteradas: alteradasDoDiffCover(readSeExiste(values['diff-cover'])),
  global: lcov === null ? null : sumLcov(lcov).percentagem,
  excecoes: diff === null ? [] : findExcecoes(diff),
  minimo: MINIMO_COBERTURA,
});
mkdirSync(dirname(values.saida), { recursive: true });
writeFileSync(values.saida, texto);

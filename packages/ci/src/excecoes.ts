export type TipoExcecao =
  | 'v8-ignore'
  | 'teste-desligado'
  | 'eslint-disable'
  | 'ts-ignore'
  | 'tamanho-apps'
  | 'audit-ignorada'
  | 'segredo-ignorado';

export interface Excecao {
  tipo: TipoExcecao;
  ficheiro: string;
  linha: number;
  texto: string;
}

// Estes ficheiros contêm os padrões de propósito (o detetor, o relatório e os testes de ambos).
const FICHEIROS_IGNORADOS = [
  'packages/ci/src/excecoes.ts',
  'packages/ci/src/excecoes.test.ts',
  'packages/ci/src/relatorio.ts',
  'packages/ci/src/relatorio.test.ts',
];

// Só entradas de lista com o id de um aviso (`- GHSA-…`), nunca comentários.
const ENTRADA_AVISO = /^-\s+['"]?(GHSA-|CVE-)/;

// Ficheiros em que qualquer mudança é uma exceção, contada uma só vez (na primeira linha acrescentada).
const UMA_VEZ_POR_FICHEIRO: Record<string, TipoExcecao> = {
  'app-sizes.json': 'tamanho-apps',
  '.gitleaks.toml': 'segredo-ignorado',
};

// Um `gitleaks:allow` citado entre acentos graves num .md é documentação, não uma exceção.
const GITLEAKS_ALLOW = /gitleaks:allow/;
const GITLEAKS_ALLOW_CITADO = /`gitleaks:allow`/;

const EXTENSOES_CODIGO = /\.(ts|tsx|mts|cts|js|mjs|cjs)$/;

const PADROES_CODIGO: { tipo: TipoExcecao; padrao: RegExp }[] = [
  { tipo: 'v8-ignore', padrao: /v8 ignore/ },
  { tipo: 'teste-desligado', padrao: /\.(skip|todo|fixme)\(/ },
  { tipo: 'eslint-disable', padrao: /eslint-disable/ },
  { tipo: 'ts-ignore', padrao: /@ts-ignore|@ts-expect-error/ },
];

function segredoIgnorado(ficheiro: string, texto: string): boolean {
  if (ficheiro === '.gitleaksignore') return texto !== '';
  if (!GITLEAKS_ALLOW.test(texto)) return false;
  return !(ficheiro.endsWith('.md') && GITLEAKS_ALLOW_CITADO.test(texto));
}

function tiposDaLinha(ficheiro: string, texto: string): TipoExcecao[] {
  const tipos: TipoExcecao[] = [];
  if (EXTENSOES_CODIGO.test(ficheiro)) {
    tipos.push(
      ...PADROES_CODIGO.filter(({ padrao }) => padrao.test(texto)).map(({ tipo }) => tipo),
    );
  }
  if (ficheiro === 'pnpm-workspace.yaml' && ENTRADA_AVISO.test(texto)) tipos.push('audit-ignorada');
  if (segredoIgnorado(ficheiro, texto)) tipos.push('segredo-ignorado');
  return tipos;
}

function excecoesDaLinha(ficheiro: string, linha: number, texto: string): Excecao[] {
  if (FICHEIROS_IGNORADOS.includes(ficheiro)) return [];
  const tipoDoFicheiro = UMA_VEZ_POR_FICHEIRO[ficheiro];
  if (tipoDoFicheiro !== undefined) return [{ tipo: tipoDoFicheiro, ficheiro, linha, texto }];
  return tiposDaLinha(ficheiro, texto).map((tipo) => ({ tipo, ficheiro, linha, texto }));
}

function ficheiroNovo(cabecalho: string): string | null {
  const destino = cabecalho.slice(4);
  return destino === '/dev/null' ? null : destino.replace(/^b\//, '');
}

/** Exceções de uma linha acrescentada, contando só uma vez os ficheiros de UMA_VEZ_POR_FICHEIRO. */
function excecoesAcrescentada(
  ficheiro: string,
  linha: number,
  texto: string,
  jaMarcado: boolean,
): Excecao[] {
  const umaVez = ficheiro in UMA_VEZ_POR_FICHEIRO;
  return umaVez && jaMarcado ? [] : excecoesDaLinha(ficheiro, linha, texto);
}

/** Deteta as exceções aos checks nas linhas acrescentadas de um `git diff --unified=0`. */
export function findExcecoes(diff: string): Excecao[] {
  const excecoes: Excecao[] = [];
  let ficheiro: string | null = null;
  let linha = 0;
  let marcados = 0;

  for (const bruta of diff.split('\n')) {
    if (bruta.startsWith('diff --git ')) {
      ficheiro = null;
      marcados = 0;
    } else if (bruta.startsWith('+++ ')) {
      ficheiro = ficheiroNovo(bruta);
    } else if (bruta.startsWith('@@')) {
      linha = Number(/\+(\d+)/.exec(bruta)?.[1] ?? 0);
    } else if (bruta.startsWith('+') && ficheiro !== null) {
      const novas = excecoesAcrescentada(ficheiro, linha, bruta.slice(1).trim(), marcados > 0);
      marcados += novas.length;
      excecoes.push(...novas);
      linha += 1;
    }
  }
  return excecoes;
}

export type TipoExcecao =
  | 'v8-ignore'
  | 'teste-desligado'
  | 'eslint-disable'
  | 'ts-ignore'
  | 'tamanho-apps'
  | 'audit-ignorada';

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

const EXTENSOES_CODIGO = /\.(ts|tsx|mts|cts|js|mjs|cjs)$/;

const PADROES_CODIGO: { tipo: TipoExcecao; padrao: RegExp }[] = [
  { tipo: 'v8-ignore', padrao: /v8 ignore/ },
  { tipo: 'teste-desligado', padrao: /\.(skip|todo|fixme)\(/ },
  { tipo: 'eslint-disable', padrao: /eslint-disable/ },
  { tipo: 'ts-ignore', padrao: /@ts-ignore|@ts-expect-error/ },
];

function tiposDaLinha(ficheiro: string, texto: string): TipoExcecao[] {
  if (EXTENSOES_CODIGO.test(ficheiro)) {
    return PADROES_CODIGO.filter(({ padrao }) => padrao.test(texto)).map(({ tipo }) => tipo);
  }
  if (ficheiro === 'pnpm-workspace.yaml' && ENTRADA_AVISO.test(texto)) return ['audit-ignorada'];
  return [];
}

function excecoesDaLinha(ficheiro: string, linha: number, texto: string): Excecao[] {
  if (FICHEIROS_IGNORADOS.includes(ficheiro)) return [];
  if (ficheiro === 'app-sizes.json') return [{ tipo: 'tamanho-apps', ficheiro, linha, texto }];
  return tiposDaLinha(ficheiro, texto).map((tipo) => ({ tipo, ficheiro, linha, texto }));
}

function ficheiroNovo(cabecalho: string): string | null {
  const destino = cabecalho.slice(4);
  return destino === '/dev/null' ? null : destino.replace(/^b\//, '');
}

/** Deteta as exceções aos checks nas linhas acrescentadas de um `git diff --unified=0`. */
export function findExcecoes(diff: string): Excecao[] {
  const excecoes: Excecao[] = [];
  let ficheiro: string | null = null;
  let linha = 0;
  let tamanhoMarcado = false;

  for (const bruta of diff.split('\n')) {
    if (bruta.startsWith('diff --git ')) {
      ficheiro = null;
      tamanhoMarcado = false;
    } else if (bruta.startsWith('+++ ')) {
      ficheiro = ficheiroNovo(bruta);
    } else if (bruta.startsWith('@@')) {
      linha = Number(/\+(\d+)/.exec(bruta)?.[1] ?? 0);
    } else if (bruta.startsWith('+') && ficheiro !== null) {
      // app-sizes.json: uma só exceção por ficheiro, na primeira linha acrescentada.
      const novas = excecoesDaLinha(ficheiro, linha, bruta.slice(1).trim()).filter(
        (e) => e.tipo !== 'tamanho-apps' || !tamanhoMarcado,
      );
      tamanhoMarcado ||= novas.some((e) => e.tipo === 'tamanho-apps');
      excecoes.push(...novas);
      linha += 1;
    }
  }
  return excecoes;
}

import type { Excecao, TipoExcecao } from './excecoes.ts';

export interface DadosRelatorio {
  alteradas: { percentagem: number; linhas: number } | null;
  global: number | null;
  excecoes: Excecao[];
  minimo: number;
}

const NOMES_TIPOS: Record<TipoExcecao, string> = {
  'v8-ignore': '`v8 ignore`',
  'teste-desligado': 'Teste desligado',
  'eslint-disable': '`eslint-disable`',
  'ts-ignore': '`@ts-ignore` / `@ts-expect-error`',
  'tamanho-apps': 'Valor de referência em `app-sizes.json`',
  'audit-ignorada': 'Vulnerabilidade ignorada no audit',
};

function formatPercentagem(valor: number): string {
  return `${valor.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function linhaAlteradas({ alteradas, minimo }: DadosRelatorio): string {
  const titulo = '**Cobertura das linhas alteradas:**';
  if (alteradas === null) {
    return `${titulo} indisponível (o job \`cobertura\` não chegou ao fim).`;
  }
  if (alteradas.linhas === 0) return `${titulo} sem linhas que contem para a cobertura.`;
  return `${titulo} ${formatPercentagem(alteradas.percentagem)} (${alteradas.linhas} linhas; mínimo ${minimo}%)`;
}

function tabela(linhas: string[][]): string {
  const larguras = linhas[0]!.map((_, i) => Math.max(...linhas.map((l) => l[i]!.length)));
  const formatLinha = (celulas: string[]) =>
    `| ${celulas.map((c, i) => c.padEnd(larguras[i]!)).join(' | ')} |`;
  const separador = `| ${larguras.map((n) => '-'.repeat(n)).join(' | ')} |`;
  const [cabecalho, ...corpo] = linhas;
  return [formatLinha(cabecalho!), separador, ...corpo.map(formatLinha)].join('\n');
}

function secaoExcecoes(excecoes: Excecao[]): string[] {
  const titulo = '### Exceções introduzidas por este PR';
  if (excecoes.length === 0) return [titulo, '', 'Sem exceções.'];
  const linhas = [
    ['Tipo', 'Ficheiro', 'Linha'],
    ...excecoes.map((e) => [NOMES_TIPOS[e.tipo], `\`${e.ficheiro}\``, String(e.linha)]),
  ];
  return [
    titulo,
    '',
    tabela(linhas),
    '',
    'As exceções só entram com autorização do dono, dada pelo merge (ADR-005).',
  ];
}

/** Texto (markdown) do comentário que o job `relatorio` põe no PR. */
export function buildRelatorio(dados: DadosRelatorio): string {
  const cobertura = [linhaAlteradas(dados)];
  if (dados.global !== null) {
    cobertura.push(`**Cobertura global (informativa):** ${formatPercentagem(dados.global)}`);
  }
  return ['## Relatório do CI', '', ...cobertura, '', ...secaoExcecoes(dados.excecoes), ''].join(
    '\n',
  );
}

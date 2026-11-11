export interface SomaLcov {
  linhas: number;
  cobertas: number;
  percentagem: number;
}

/** Linhas de cada ficheiro (`SF`): número da linha -> vezes executada. */
type Ficheiros = Map<string, Map<number, number>>;

function caminhoNaRaiz(caminho: string, pacote: string, repoRoot: string): string {
  const unido = caminho.replaceAll('\\', '/');
  const raiz = `${repoRoot.replaceAll('\\', '/').replace(/\/+$/, '')}/`;
  if (unido.startsWith(raiz)) return unido.slice(raiz.length);
  if (unido.startsWith('/')) return unido;
  return `${pacote}/${unido.replace(/^\.\//, '')}`;
}

/** Põe os `SF:` relativos à raiz do repositório, que é o que o `diff-cover` espera. */
export function rewriteLcovPaths(lcov: string, pacote: string, repoRoot: string): string {
  return lcov
    .split('\n')
    .map((linha) =>
      linha.startsWith('SF:') ? `SF:${caminhoNaRaiz(linha.slice(3), pacote, repoRoot)}` : linha,
    )
    .join('\n');
}

function parseLcov(lcov: string, destino: Ficheiros): void {
  let linhas: Map<number, number> | null = null;
  for (const linha of lcov.split('\n')) {
    if (linha.startsWith('SF:')) {
      const ficheiro = linha.slice(3);
      linhas = destino.get(ficheiro) ?? new Map();
      destino.set(ficheiro, linhas);
    } else if (linha.startsWith('DA:') && linhas !== null) {
      const [numero, vezes] = linha.slice(3).split(',').map(Number);
      linhas.set(numero!, Math.max(linhas.get(numero!) ?? 0, vezes!));
    }
  }
}

/** Junta vários relatórios: por ficheiro e por linha fica o maior número de execuções. */
export function mergeLcov(conteudos: string[]): string {
  const ficheiros: Ficheiros = new Map();
  for (const conteudo of conteudos) parseLcov(conteudo, ficheiros);

  return [...ficheiros.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([ficheiro, linhas]) => {
      const ordenadas = [...linhas.entries()].sort(([a], [b]) => a - b);
      const cobertas = ordenadas.filter(([, vezes]) => vezes > 0).length;
      return [
        `SF:${ficheiro}`,
        ...ordenadas.map(([numero, vezes]) => `DA:${numero},${vezes}`),
        `LF:${ordenadas.length}`,
        `LH:${cobertas}`,
        'end_of_record',
        '',
      ].join('\n');
    })
    .join('');
}

/** Totais de um relatório; sem linhas, a cobertura é 100%. */
export function sumLcov(lcov: string): SomaLcov {
  const ficheiros: Ficheiros = new Map();
  parseLcov(lcov, ficheiros);

  let linhas = 0;
  let cobertas = 0;
  for (const doFicheiro of ficheiros.values()) {
    linhas += doFicheiro.size;
    cobertas += [...doFicheiro.values()].filter((vezes) => vezes > 0).length;
  }
  return { linhas, cobertas, percentagem: linhas === 0 ? 100 : (cobertas / linhas) * 100 };
}

/** Percentagem global de um lcov; sem lcov ou sem linhas não há percentagem (nunca 100%). */
export function globalDoLcov(lcov: string | null): number | null {
  if (lcov === null) return null;
  const soma = sumLcov(lcov);
  return soma.linhas === 0 ? null : soma.percentagem;
}

/** Pasta do pacote (relativa à raiz) a que pertence um `<pacote>/coverage/<tipo>/lcov.info`. */
export function pacoteDoLcov(repoRoot: string, ficheiro: string): string {
  const raiz = `${repoRoot.replaceAll('\\', '/').replace(/\/+$/, '')}/`;
  const relativo = ficheiro.replaceAll('\\', '/').slice(raiz.length);
  return relativo.slice(0, relativo.indexOf('/coverage/'));
}

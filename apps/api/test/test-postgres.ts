import { fileURLToPath } from 'node:url';

import { PostgreSqlContainer } from '@testcontainers/postgresql';

const initDir = fileURLToPath(new URL('../../../docker/postgres/init', import.meta.url));

const baseDeDados = 'scp_teste';
const passwordSuperutilizador = 'superutilizador-de-teste';
const passwordApp = 'app-de-teste';
// Mensagem do Testcontainers quando não encontra nenhum Docker a correr.
const semRuntime = 'Could not find a working container runtime strategy';

export interface TestPostgres {
  /** URL de ligação com o papel `app` (não o superutilizador). */
  url: string;
  /**
   * Corre SQL como superutilizador dentro do contentor (psql), para o teste inspecionar a base de dados
   * sem a API ter de expor uma via de SQL arbitrário. Devolve as linhas, com colunas separadas por `|`.
   */
  consultarComoSuperutilizador(sql: string): Promise<string[]>;
  stop(): Promise<void>;
}

/**
 * Arranca um Postgres 17 descartável com o mesmo script de arranque do docker compose
 * (que cria o papel `app`) e devolve o URL com esse papel.
 */
export async function startTestPostgres(): Promise<TestPostgres> {
  try {
    const container = await new PostgreSqlContainer('postgres:17')
      .withDatabase(baseDeDados)
      .withUsername('postgres')
      .withPassword(passwordSuperutilizador)
      .withEnvironment({ APP_DB_PASSWORD: passwordApp })
      .withCopyDirectoriesToContainer([{ source: initDir, target: '/docker-entrypoint-initdb.d' }])
      .start();

    const url = `postgresql://app:${passwordApp}@${container.getHost()}:${container.getPort()}/${baseDeDados}`;
    return {
      url,
      consultarComoSuperutilizador: async (sql) => {
        const { output, exitCode } = await container.exec([
          'psql',
          '-U',
          'postgres',
          '-d',
          baseDeDados,
          '-Atc',
          sql,
        ]);
        if (exitCode !== 0) {
          throw new Error(`psql falhou (${exitCode}): ${output}`);
        }
        return output.split('\n').filter((linha) => linha !== '');
      },
      stop: async () => {
        await container.stop();
      },
    };
  } catch (cause) {
    // Só o "Docker indisponível" ganha a mensagem em português; qualquer outro erro passa com a sua.
    if (cause instanceof Error && cause.message.includes(semRuntime)) {
      throw new Error(
        'É preciso o Docker a correr para os testes de integração (pnpm test:integration).',
        { cause },
      );
    }
    throw cause;
  }
}

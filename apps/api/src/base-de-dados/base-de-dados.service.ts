import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import pg from 'pg';

export const BASE_DE_DADOS_URL = Symbol('BASE_DE_DADOS_URL');

const TIMEOUT_MS = 2000;

/**
 * Único sítio da API que fala com o Postgres (o `pg` não é importado noutro lado).
 * A pool é preguiçosa: não abre ligações até haver a primeira consulta.
 */
@Injectable()
export class BaseDeDadosService implements OnModuleDestroy {
  private readonly logger = new Logger(BaseDeDadosService.name);
  private readonly pool: pg.Pool;

  constructor(@Inject(BASE_DE_DADOS_URL) databaseUrl: string) {
    this.pool = new pg.Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: TIMEOUT_MS,
      query_timeout: TIMEOUT_MS,
    });
    // Sem este handler, uma ligação inativa que caia (base de dados em baixo) deitava o processo abaixo.
    // Só se regista o código do erro: a mensagem pode trazer o anfitrião ou o utilizador.
    this.pool.on('error', (erro: Error & { code?: string }) => {
      this.logger.warn(`Ligação à base de dados perdida (${erro.code ?? 'sem código'})`);
    });
  }

  /** `SELECT 1` com timeout de 2 s. Devolve `false` em vez de lançar erro. */
  async verificarLigacao(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async consultar<T extends object>(sql: string, valores: unknown[] = []): Promise<T[]> {
    const resultado = await this.pool.query<T & pg.QueryResultRow>(sql, valores);
    return resultado.rows;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

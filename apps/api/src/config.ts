export interface Config {
  databaseUrl: string;
  apiPort: number;
  sentryDsn?: string;
  logLevel: string;
}

/** Lê a configuração do ambiente. Falha logo ao arrancar se faltar uma variável obrigatória. */
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const databaseUrl = env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('Variável de ambiente em falta: DATABASE_URL');
  }

  const config: Config = {
    databaseUrl,
    apiPort: lerPorta(env['API_PORT']),
    logLevel: env['LOG_LEVEL'] ?? 'info',
  };
  const sentryDsn = env['SENTRY_DSN'];
  if (sentryDsn) {
    config.sentryDsn = sentryDsn;
  }
  return config;
}

/** Vazio ou ausente dá 3000; caso contrário tem de ser um inteiro entre 1 e 65535. */
function lerPorta(valor: string | undefined): number {
  if (valor === undefined || valor === '') {
    return 3000;
  }
  const porta = Number(valor);
  if (!/^\d+$/.test(valor) || porta < 1 || porta > 65535) {
    throw new Error(`API_PORT inválida: ${valor}`);
  }
  return porta;
}

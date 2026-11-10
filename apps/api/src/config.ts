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
    apiPort: readPort(env['API_PORT']),
    logLevel: env['LOG_LEVEL'] ?? 'info',
  };
  const sentryDsn = env['SENTRY_DSN'];
  if (sentryDsn) {
    config.sentryDsn = sentryDsn;
  }
  return config;
}

/** Vazio ou ausente dá 3000; caso contrário tem de ser um inteiro entre 1 e 65535. */
function readPort(value: string | undefined): number {
  if (value === undefined || value === '') {
    return 3000;
  }
  const port = Number(value);
  if (!/^\d+$/.test(value) || port < 1 || port > 65535) {
    throw new Error(`API_PORT inválida: ${value}`);
  }
  return port;
}

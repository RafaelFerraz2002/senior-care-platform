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
    apiPort: Number(env['API_PORT'] ?? 3000),
    logLevel: env['LOG_LEVEL'] ?? 'info',
  };
  const sentryDsn = env['SENTRY_DSN'];
  if (sentryDsn) {
    config.sentryDsn = sentryDsn;
  }
  return config;
}

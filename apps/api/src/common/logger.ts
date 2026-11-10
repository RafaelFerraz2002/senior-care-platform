import { type LoggerService } from '@nestjs/common';
import { pino, type DestinationStream, type Logger } from 'pino';

/**
 * Caminhos que nunca chegam aos logs (ADR-006, logs e Sentry sem dados pessoais):
 * só IDs, sem corpos, headers de autenticação, cookies nem IP.
 */
export const redactedPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body',
  'req.remoteAddress',
  'res.body',
  'res.headers["set-cookie"]',
];

export function createLogger(level: string, destination?: DestinationStream): Logger {
  return pino({ level, redact: { paths: redactedPaths, remove: true } }, destination);
}

/** Adaptador para o Nest escrever pelo pino, com a mesma filtragem. */
export class NestPinoLogger implements LoggerService {
  constructor(private readonly logger: Logger) {}

  log(message: unknown, ...rest: unknown[]): void {
    this.write('info', message, rest);
  }
  error(message: unknown, ...rest: unknown[]): void {
    this.write('error', message, rest);
  }
  warn(message: unknown, ...rest: unknown[]): void {
    this.write('warn', message, rest);
  }
  debug(message: unknown, ...rest: unknown[]): void {
    this.write('debug', message, rest);
  }
  fatal(message: unknown, ...rest: unknown[]): void {
    this.write('fatal', message, rest);
  }
  verbose(message: unknown, ...rest: unknown[]): void {
    this.write('trace', message, rest);
  }

  // O Nest chama `error(mensagem, pilha, contexto)` e, nos outros níveis, `log(mensagem, contexto)`.
  // Num `error` sem contexto só chega a pilha, por isso o contexto só se lê de `error` com 2 ou mais
  // argumentos extra. A pilha nunca é registada (traz a mensagem do erro e caminhos): fica fora dos logs.
  private write(
    level: 'info' | 'error' | 'warn' | 'debug' | 'trace' | 'fatal',
    message: unknown,
    rest: unknown[],
  ): void {
    const min = level === 'error' ? 2 : 1;
    const candidate = rest.length >= min ? rest.at(-1) : undefined;
    const context =
      typeof candidate === 'string' && !candidate.includes('\n') ? candidate : undefined;
    // A mensagem é registada tal como vem: não pode levar dados pessoais. Erros da base de dados
    // registam-se só pelo `code` (como faz o `DatabaseService`), nunca pela mensagem do driver.
    const text =
      typeof message === 'string' ? message : message instanceof Error ? message.name : 'evento';
    this.logger[level]({ context }, text);
  }
}

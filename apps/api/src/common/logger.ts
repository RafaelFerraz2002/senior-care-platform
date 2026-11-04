import { type LoggerService } from '@nestjs/common';
import { pino, type DestinationStream, type Logger } from 'pino';

/**
 * Caminhos que nunca chegam aos logs (ADR-006, logs e Sentry sem dados pessoais):
 * só IDs, sem corpos, headers de autenticação, cookies nem IP.
 */
export const caminhosOcultos = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body',
  'req.remoteAddress',
  'res.body',
  'res.headers["set-cookie"]',
];

export function createLogger(level: string, destino?: DestinationStream): Logger {
  return pino({ level, redact: { paths: caminhosOcultos, remove: true } }, destino);
}

/** Adaptador para o Nest escrever pelo pino, com a mesma filtragem. */
export class NestPinoLogger implements LoggerService {
  constructor(private readonly logger: Logger) {}

  log(mensagem: unknown, ...resto: unknown[]): void {
    this.escrever('info', mensagem, resto);
  }
  error(mensagem: unknown, ...resto: unknown[]): void {
    this.escrever('error', mensagem, resto);
  }
  warn(mensagem: unknown, ...resto: unknown[]): void {
    this.escrever('warn', mensagem, resto);
  }
  debug(mensagem: unknown, ...resto: unknown[]): void {
    this.escrever('debug', mensagem, resto);
  }
  verbose(mensagem: unknown, ...resto: unknown[]): void {
    this.escrever('trace', mensagem, resto);
  }

  // O Nest chama `error(mensagem, pilha, contexto)` e, nos outros níveis, `log(mensagem, contexto)`.
  // Num `error` sem contexto só chega a pilha, por isso o contexto só se lê de `error` com 2 ou mais
  // argumentos extra. A pilha nunca é registada (traz a mensagem do erro e caminhos): fica fora dos logs.
  private escrever(
    nivel: 'info' | 'error' | 'warn' | 'debug' | 'trace',
    mensagem: unknown,
    resto: unknown[],
  ): void {
    const minimo = nivel === 'error' ? 2 : 1;
    const candidato = resto.length >= minimo ? resto.at(-1) : undefined;
    const contexto =
      typeof candidato === 'string' && !candidato.includes('\n') ? candidato : undefined;
    // A mensagem é registada tal como vem: não pode levar dados pessoais. Erros da base de dados
    // registam-se só pelo `code` (como faz o `base-de-dados`), nunca pela mensagem do driver.
    const texto =
      typeof mensagem === 'string'
        ? mensagem
        : mensagem instanceof Error
          ? mensagem.name
          : 'evento';
    this.logger[nivel]({ contexto }, texto);
  }
}

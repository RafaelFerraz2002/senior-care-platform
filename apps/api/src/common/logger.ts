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

  // O Nest passa o contexto (nome do módulo) como último argumento de texto. Os restantes
  // argumentos (pilhas de erro, objetos) não são serializados: podem arrastar dados pessoais.
  private escrever(
    nivel: 'info' | 'error' | 'warn' | 'debug' | 'trace',
    mensagem: unknown,
    resto: unknown[],
  ): void {
    const contexto = resto.findLast((valor) => typeof valor === 'string');
    const texto =
      typeof mensagem === 'string'
        ? mensagem
        : mensagem instanceof Error
          ? mensagem.name
          : 'evento';
    this.logger[nivel]({ contexto }, texto);
  }
}

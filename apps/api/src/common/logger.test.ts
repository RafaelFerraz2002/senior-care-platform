import { Writable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { createLogger, NestPinoLogger } from './logger.js';

function memoryLog(): { lines: string[]; destination: Writable } {
  const lines: string[] = [];
  const destination = new Writable({
    write(chunk: Buffer, _encoding, cb) {
      lines.push(chunk.toString());
      cb();
    },
  });
  return { lines, destination };
}

describe('createLogger', () => {
  it('não escreve o corpo do pedido nem os headers de autenticação', () => {
    const { lines, destination } = memoryLog();
    const logger = createLogger('info', destination);

    logger.info(
      {
        req: {
          id: 'pedido-1',
          remoteAddress: '203.0.113.7',
          body: { nome: 'Maria Fictícia' },
          headers: { authorization: 'Bearer x', cookie: 'sessao=abc', 'x-pedido': 'ok' },
        },
        res: { statusCode: 200, body: { nome: 'Maria Fictícia' } },
      },
      'pedido concluído',
    );

    const output = lines.join('');
    expect(output).toContain('pedido-1');
    expect(output).not.toContain('Maria Fictícia');
    expect(output).not.toContain('Bearer');
    expect(output).not.toContain('sessao=abc');
    expect(output).not.toContain('203.0.113.7');
  });

  it('respeita o nível configurado', () => {
    const { lines, destination } = memoryLog();
    const logger = createLogger('warn', destination);
    logger.info('ignorado');
    logger.warn('visível');
    expect(lines.join('')).toContain('visível');
    expect(lines.join('')).not.toContain('ignorado');
  });
});

describe('NestPinoLogger', () => {
  function createNest() {
    const { lines, destination } = memoryLog();
    return { lines, nest: new NestPinoLogger(createLogger('info', destination)) };
  }
  const stack = 'Error: Maria Fictícia\n    at f (/app/a.js:1:1)';

  it('nunca regista a pilha como contexto num erro sem contexto', () => {
    const { lines, nest } = createNest();
    nest.error('falhou', stack);
    const output = lines.join('');
    expect(output).toContain('falhou');
    expect(output).not.toContain('Maria Fictícia');
    expect(output).not.toContain('/app/a.js');
    expect(JSON.parse(output).context).toBeUndefined();
  });

  it('regista o contexto de um erro e não a pilha', () => {
    const { lines, nest } = createNest();
    nest.error('falhou', stack, 'ModuloX');
    const output = lines.join('');
    expect(JSON.parse(output).context).toBe('ModuloX');
    expect(output).not.toContain('Maria Fictícia');
  });

  it('regista o contexto dos outros níveis', () => {
    const { lines, nest } = createNest();
    nest.log('arrancou', 'NestFactory');
    expect(JSON.parse(lines.join('')).context).toBe('NestFactory');
  });

  it('regista os erros fatais', () => {
    const { lines, nest } = createNest();
    nest.fatal('caiu', 'NestFactory');
    const line = JSON.parse(lines.join(''));
    expect(line.level).toBe(60);
    expect(line.msg).toBe('caiu');
    expect(line.context).toBe('NestFactory');
  });
});

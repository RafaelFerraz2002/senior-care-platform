import { Writable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { createLogger } from './logger.js';

function logParaMemoria(): { linhas: string[]; destino: Writable } {
  const linhas: string[] = [];
  const destino = new Writable({
    write(chunk: Buffer, _codificacao, cb) {
      linhas.push(chunk.toString());
      cb();
    },
  });
  return { linhas, destino };
}

describe('createLogger', () => {
  it('não escreve o corpo do pedido nem os headers de autenticação', () => {
    const { linhas, destino } = logParaMemoria();
    const logger = createLogger('info', destino);

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

    const saida = linhas.join('');
    expect(saida).toContain('pedido-1');
    expect(saida).not.toContain('Maria Fictícia');
    expect(saida).not.toContain('Bearer');
    expect(saida).not.toContain('sessao=abc');
    expect(saida).not.toContain('203.0.113.7');
  });

  it('respeita o nível configurado', () => {
    const { linhas, destino } = logParaMemoria();
    const logger = createLogger('warn', destino);
    logger.info('ignorado');
    logger.warn('visível');
    expect(linhas.join('')).toContain('visível');
    expect(linhas.join('')).not.toContain('ignorado');
  });
});

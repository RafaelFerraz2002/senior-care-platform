import { describe, expect, it, vi } from 'vitest';

import { client, getSaude, getSaudeOptions } from '../src/index.js';

describe('cliente gerado', () => {
  it('chama GET /saude no baseUrl definido pela app', async () => {
    const fetchFalso = vi.fn<typeof fetch>(async () =>
      Response.json({ status: 'ok', database: 'ok' }),
    );
    // No browser as apps usam '/api'; no Node o Request precisa de um URL absoluto.
    client.setConfig({ baseUrl: 'http://localhost:5173/api', fetch: fetchFalso });

    const { data, error } = await getSaude();

    expect(error).toBeUndefined();
    expect(data).toEqual({ status: 'ok', database: 'ok' });
    const pedido = fetchFalso.mock.calls[0]?.[0];
    expect(pedido instanceof Request ? pedido.url : pedido).toBe('http://localhost:5173/api/saude');
  });

  it('expõe as opções do TanStack Query para GET /saude', () => {
    const opcoes = getSaudeOptions();

    expect(opcoes.queryKey[0]).toMatchObject({ _id: 'getSaude' });
    expect(opcoes.queryFn).toBeTypeOf('function');
  });
});

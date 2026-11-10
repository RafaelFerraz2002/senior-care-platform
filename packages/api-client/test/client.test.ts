import { describe, expect, it, vi } from 'vitest';

import { client, getSaude, getSaudeOptions } from '../src/index.js';

describe('cliente gerado', () => {
  it('chama GET /saude no baseUrl definido pela app', async () => {
    const fakeFetch = vi.fn<typeof fetch>(async () =>
      Response.json({ status: 'ok', database: 'ok' }),
    );
    // No browser as apps usam '/api'; no Node o Request precisa de um URL absoluto.
    client.setConfig({ baseUrl: 'http://localhost:5173/api', fetch: fakeFetch });

    const { data, error } = await getSaude();

    expect(error).toBeUndefined();
    expect(data).toEqual({ status: 'ok', database: 'ok' });
    const request = fakeFetch.mock.calls[0]?.[0];
    expect(request instanceof Request ? request.url : request).toBe(
      'http://localhost:5173/api/saude',
    );
  });

  it('expõe as opções do TanStack Query para GET /saude', () => {
    const options = getSaudeOptions();

    expect(options.queryKey[0]).toMatchObject({ _id: 'getSaude' });
    expect(options.queryFn).toBeTypeOf('function');
  });
});

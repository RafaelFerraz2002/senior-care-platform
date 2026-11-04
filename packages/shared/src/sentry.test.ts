import { describe, expect, it } from 'vitest';

import { scrubSentryEvent } from './sentry.js';

function criarEvento() {
  return {
    event_id: 'abc',
    message: 'erro',
    tags: { organizacao: 'org-1', pedido: 'ped-1' },
    user: { id: 'pessoa-1', ip_address: '203.0.113.7', username: 'Maria Fictícia' },
    request: {
      url: '/utentes',
      method: 'POST',
      cookies: { sessao: 'abc' },
      headers: { authorization: 'Bearer x' },
      data: { nome: 'Maria Fictícia' },
      env: { REMOTE_ADDR: '203.0.113.7' },
    },
    contexts: { geo: { city: 'Lisboa' }, runtime: { name: 'node' } },
    exception: {
      values: [
        {
          type: 'Error',
          stacktrace: {
            frames: [{ function: 'f', filename: 'a.js', vars: { nome: 'Maria Fictícia' } }],
          },
        },
      ],
    },
  };
}

describe('scrubSentryEvent', () => {
  it('remove utilizador, IP, cookies, headers, corpo e variáveis locais', () => {
    const limpo = scrubSentryEvent(criarEvento());
    const texto = JSON.stringify(limpo);

    expect(limpo.user).toBeUndefined();
    expect(limpo.request.cookies).toBeUndefined();
    expect(limpo.request.headers).toBeUndefined();
    expect(limpo.request.data).toBeUndefined();
    expect(limpo.request.env).toBeUndefined();
    expect(limpo.contexts.geo).toBeUndefined();
    expect(limpo.exception.values[0]?.stacktrace.frames[0]?.vars).toBeUndefined();
    expect(texto).not.toContain('Maria Fictícia');
    expect(texto).not.toContain('Bearer');
    expect(texto).not.toContain('203.0.113.7');
  });

  it('mantém o que é útil e não é pessoal', () => {
    const limpo = scrubSentryEvent(criarEvento());
    expect(limpo.tags).toEqual({ organizacao: 'org-1', pedido: 'ped-1' });
    expect(limpo.request.url).toBe('/utentes');
    expect(limpo.contexts.runtime).toEqual({ name: 'node' });
  });

  it('aceita eventos sem os campos opcionais', () => {
    expect(scrubSentryEvent({ request: {} })).toEqual({ request: {} });
  });
});

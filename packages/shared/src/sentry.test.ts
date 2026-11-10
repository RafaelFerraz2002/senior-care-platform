import { describe, expect, it } from 'vitest';

import { scrubSentryEvent } from './sentry.js';

function createEvent() {
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
  it('reduz o URL do pedido à origem e ao caminho', () => {
    const event = createEvent();
    event.request.url =
      'https://gestao.exemplo.invalid/utentes?nome=Maria%20Fict%C3%ADcia#nota=privada';
    const text = JSON.stringify(scrubSentryEvent(event));
    expect(event.request.url).toBe('https://gestao.exemplo.invalid/utentes');
    expect(text).not.toContain('Maria');
    expect(text).not.toContain('privada');
  });

  it('corta a query e o fragmento de URLs relativos ou inválidos', () => {
    for (const [input, expected] of [
      ['/utentes?nome=Maria#nota=x', '/utentes'],
      ['/utentes#nota=x', '/utentes'],
      ['nao é um url?segredo=1', 'nao é um url'],
    ] as const) {
      const event = createEvent();
      event.request.url = input;
      expect(scrubSentryEvent(event).request.url).toBe(expected);
    }
  });

  it('apaga os dados extra', () => {
    const event = { ...createEvent(), extra: { nome: 'Maria Fictícia' } };
    const scrubbed = scrubSentryEvent(event);
    expect(scrubbed.extra).toBeUndefined();
    expect(JSON.stringify(scrubbed)).not.toContain('Maria Fictícia');
  });

  it('remove utilizador, IP, cookies, headers, corpo e variáveis locais', () => {
    const scrubbed = scrubSentryEvent(createEvent());
    const text = JSON.stringify(scrubbed);

    expect(scrubbed.user).toBeUndefined();
    expect(scrubbed.request.cookies).toBeUndefined();
    expect(scrubbed.request.headers).toBeUndefined();
    expect(scrubbed.request.data).toBeUndefined();
    expect(scrubbed.request.env).toBeUndefined();
    expect(scrubbed.contexts.geo).toBeUndefined();
    expect(scrubbed.exception.values[0]?.stacktrace.frames[0]?.vars).toBeUndefined();
    expect(text).not.toContain('Maria Fictícia');
    expect(text).not.toContain('Bearer');
    expect(text).not.toContain('203.0.113.7');
  });

  it('mantém o que é útil e não é pessoal', () => {
    const scrubbed = scrubSentryEvent(createEvent());
    expect(scrubbed.tags).toEqual({ organizacao: 'org-1', pedido: 'ped-1' });
    expect(scrubbed.request.url).toBe('/utentes');
    expect(scrubbed.contexts.runtime).toEqual({ name: 'node' });
  });

  it('aceita eventos sem os campos opcionais', () => {
    expect(scrubSentryEvent({ request: {} })).toEqual({ request: {} });
  });
});

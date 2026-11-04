/**
 * Filtragem dos eventos do Sentry (ADR-006, secção 9). Partilhada pela API e pelas duas apps web.
 * Sem imports do SDK nem de módulos do Node, para correr também no browser.
 */

interface FrameLike {
  vars?: unknown;
}

/** O mínimo da forma de um evento do Sentry de que o filtro precisa (compatível com os tipos do SDK). */
export interface SentryEventLike {
  user?: unknown;
  request?: {
    cookies?: unknown;
    headers?: unknown;
    data?: unknown;
    env?: unknown;
    query_string?: unknown;
  };
  // `object` porque o tipo `Contexts` do SDK não tem assinatura de índice.
  contexts?: object;
  exception?: {
    values?: { stacktrace?: { frames?: FrameLike[] } }[];
  };
}

/** Opções de init comuns às três apps: sem PII e sem rasto de navegação (pode ter URLs e mensagens com dados). */
export const opcoesSentrySemPii = {
  sendDefaultPii: false,
  maxBreadcrumbs: 0,
} as const;

/** Remove o que o ADR-006 proíbe: utilizador, IP, cookies, headers, corpo, geolocalização e variáveis locais. */
export function scrubSentryEvent<T extends SentryEventLike>(event: T): T {
  delete event.user;
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
    delete event.request.env;
    delete event.request.query_string;
  }
  if (event.contexts) {
    delete (event.contexts as { geo?: unknown }).geo;
  }
  for (const excecao of event.exception?.values ?? []) {
    for (const frame of excecao.stacktrace?.frames ?? []) {
      delete frame.vars;
    }
  }
  return event;
}

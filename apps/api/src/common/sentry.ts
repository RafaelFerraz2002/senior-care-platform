import * as Sentry from '@sentry/node';
import { opcoesSentrySemPii, scrubSentryEvent } from '@scp/shared';

import type { Config } from '../config.js';

/** Liga o Sentry só se houver DSN (ADR-006, secção 9). Devolve se ligou. */
export function initSentry(config: Config): boolean {
  if (!config.sentryDsn) {
    return false;
  }
  Sentry.init({
    dsn: config.sentryDsn,
    ...opcoesSentrySemPii,
    includeLocalVariables: false,
    beforeSend: (evento) => scrubSentryEvent(evento),
  });
  return true;
}

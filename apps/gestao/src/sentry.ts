import { sentryNoPiiOptions, scrubSentryEvent } from '@scp/shared';
import * as Sentry from '@sentry/react';

/** Só arranca o Sentry se houver DSN; sem PII (ADR-006). */
export function initSentry(dsn: string | undefined) {
  if (!dsn) return;
  Sentry.init({ dsn, ...sentryNoPiiOptions, beforeSend: scrubSentryEvent });
}

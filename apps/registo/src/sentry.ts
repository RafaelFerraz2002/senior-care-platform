import { opcoesSentrySemPii, scrubSentryEvent } from '@scp/shared';
import * as Sentry from '@sentry/react';

/** Só arranca o Sentry se houver DSN; sem PII (ADR-006). */
export function iniciarSentry(dsn: string | undefined) {
  if (!dsn) return;
  Sentry.init({ dsn, ...opcoesSentrySemPii, beforeSend: scrubSentryEvent });
}

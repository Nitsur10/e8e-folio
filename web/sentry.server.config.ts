import * as Sentry from '@sentry/nextjs';
import { observabilityEnabled, scrubEvent } from './lib/sentry-scrub';

if (observabilityEnabled()) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  });
}

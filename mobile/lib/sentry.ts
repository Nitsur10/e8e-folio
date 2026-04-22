import * as Sentry from '@sentry/react-native';
import type { ErrorEvent } from '@sentry/react-native';

const SECRET_KEY_RE = /(sk-[a-zA-Z0-9_-]{20,}|sk_live_[a-zA-Z0-9]+|sk_test_[a-zA-Z0-9]+)/g;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'apikey',
  'x-api-key',
  'x-supabase-auth',
]);

function scrubString(value: string): string {
  return value.replace(SECRET_KEY_RE, '[REDACTED_KEY]').replace(EMAIL_RE, '[REDACTED_EMAIL]');
}

function scrubHeaders(
  headers: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!headers) return headers;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = SENSITIVE_HEADERS.has(k.toLowerCase()) ? '[REDACTED]' : v;
  }
  return out;
}

function scrubEvent(event: ErrorEvent): ErrorEvent | null {
  if (event.request) {
    event.request.headers = scrubHeaders(
      event.request.headers as Record<string, unknown>
    ) as typeof event.request.headers;
    if (typeof event.request.data === 'string') {
      event.request.data = scrubString(event.request.data);
    }
  }

  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
  }

  if (event.message) {
    event.message = scrubString(event.message);
  }

  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      if (ex.value) ex.value = scrubString(ex.value);
    }
  }

  return event;
}

function enabled(): boolean {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return false;
  if (__DEV__ && process.env.EXPO_PUBLIC_SENTRY_ENABLE_DEV !== 'true') return false;
  return true;
}

export function initSentry() {
  if (!enabled()) return;
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  });
}

export { Sentry };

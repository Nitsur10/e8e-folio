import type { ErrorEvent, EventHint } from '@sentry/nextjs';

const SECRET_KEY_RE = /(sk-[a-zA-Z0-9_-]{20,}|sk_live_[a-zA-Z0-9]+|sk_test_[a-zA-Z0-9]+)/g;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'apikey',
  'x-api-key',
  'x-supabase-auth',
]);

function scrubString(value: string): string {
  return value.replace(SECRET_KEY_RE, '[REDACTED_KEY]').replace(EMAIL_RE, '[REDACTED_EMAIL]');
}

function scrubHeaders(headers: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!headers) return headers;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = SENSITIVE_HEADERS.has(k.toLowerCase()) ? '[REDACTED]' : v;
  }
  return out;
}

export function scrubEvent(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  if (event.request) {
    event.request.headers = scrubHeaders(event.request.headers as Record<string, unknown>) as typeof event.request.headers;
    if (typeof event.request.data === 'string') {
      event.request.data = scrubString(event.request.data);
    }
    if (event.request.query_string && typeof event.request.query_string === 'string') {
      event.request.query_string = scrubString(event.request.query_string);
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

  if (event.extra) {
    for (const [k, v] of Object.entries(event.extra)) {
      if (typeof v === 'string') event.extra[k] = scrubString(v);
    }
  }

  return event;
}

export function observabilityEnabled(): boolean {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  if (!dsn) return false;
  if (process.env.NODE_ENV !== 'production' && process.env.SENTRY_ENABLE_DEV !== 'true') {
    return false;
  }
  return true;
}

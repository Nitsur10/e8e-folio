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
const SENSITIVE_KEY_RE = /(password|token|secret|api[_-]?key|authorization|email)/i;
const MAX_SCRUB_DEPTH = 6;

function scrubString(value: string): string {
  return value.replace(SECRET_KEY_RE, '[REDACTED_KEY]').replace(EMAIL_RE, '[REDACTED_EMAIL]');
}

function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_SCRUB_DEPTH) return value;
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY_RE.test(k) ? '[REDACTED]' : scrubValue(v, depth + 1);
    }
    return out;
  }
  return value;
}

function scrubHeaders(headers: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!headers) return headers;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = SENSITIVE_HEADERS.has(k.toLowerCase()) ? '[REDACTED]' : v;
  }
  return out;
}

function scrubQueryString(qs: unknown): unknown {
  if (typeof qs === 'string') return scrubString(qs);
  if (Array.isArray(qs)) {
    // Sentry can represent query_string as an array of [key, value] tuples.
    return qs.map((entry) => {
      if (Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string') {
        const [key, val] = entry;
        if (SENSITIVE_KEY_RE.test(key)) return [key, '[REDACTED]'];
        return [key, typeof val === 'string' ? scrubString(val) : val];
      }
      return entry;
    });
  }
  return qs;
}

export function scrubEvent(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  if (event.request) {
    event.request.headers = scrubHeaders(event.request.headers as Record<string, unknown>) as typeof event.request.headers;
    if (event.request.data !== undefined && event.request.data !== null) {
      event.request.data = scrubValue(event.request.data) as typeof event.request.data;
    }
    if (event.request.query_string !== undefined) {
      event.request.query_string = scrubQueryString(event.request.query_string) as typeof event.request.query_string;
    }
    if (typeof event.request.url === 'string') {
      event.request.url = scrubString(event.request.url);
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
      const frames = ex.stacktrace?.frames;
      if (frames) {
        for (const frame of frames) {
          if (typeof frame.abs_path === 'string') frame.abs_path = scrubString(frame.abs_path);
          if (typeof frame.filename === 'string') frame.filename = scrubString(frame.filename);
        }
      }
    }
  }

  if (event.extra) {
    event.extra = scrubValue(event.extra) as typeof event.extra;
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

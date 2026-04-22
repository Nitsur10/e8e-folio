import { ALPACA_PAPER_BASE_URL, assertPaperKey } from './live-key';

export interface AlpacaCredentials {
  keyId: string;
  secret: string;
}

export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  cash: string;
  portfolio_value: string;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
}

export class AlpacaError extends Error {
  readonly code:
    | 'unauthorized'
    | 'forbidden'
    | 'not_found'
    | 'rate_limited'
    | 'timeout'
    | 'network'
    | 'unexpected';
  readonly status: number;
  constructor(code: AlpacaError['code'], status: number, message: string) {
    super(message);
    this.name = 'AlpacaError';
    this.code = code;
    this.status = status;
  }
}

const ALPACA_TIMEOUT_MS = 8_000;

// Public-safe error messages. We never surface upstream response bodies to
// callers because they can include request IDs, account hints, or — in the
// network branch — error objects whose `cause` may carry request headers
// including the APCA secret. One static message per status class.
function mapStatus(status: number): AlpacaError {
  if (status === 401) return new AlpacaError('unauthorized', status, 'Alpaca rejected credentials');
  if (status === 403) return new AlpacaError('forbidden', status, 'Alpaca denied access');
  if (status === 404) return new AlpacaError('not_found', status, 'Alpaca endpoint not found');
  if (status === 429) return new AlpacaError('rate_limited', status, 'Alpaca rate-limited');
  return new AlpacaError('unexpected', status, `Alpaca returned status ${status}`);
}

async function alpacaFetch<T>(
  creds: AlpacaCredentials,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  assertPaperKey(creds.keyId);
  // new URL(path, base) refuses host rewrites via `//evil.com` or relative
  // tricks. assertHost() is defense in depth if this ever takes user input.
  const url = new URL(path, ALPACA_PAPER_BASE_URL);
  if (url.host !== new URL(ALPACA_PAPER_BASE_URL).host) {
    throw new AlpacaError('unexpected', 0, 'alpaca host mismatch');
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ALPACA_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      signal: ac.signal,
      headers: {
        'APCA-API-KEY-ID': creds.keyId,
        'APCA-API-SECRET-KEY': creds.secret,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      throw new AlpacaError('timeout', 0, 'alpaca request timed out');
    }
    throw new AlpacaError('network', 0, 'network error contacting Alpaca');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    // Drain body to free the socket, but never surface it.
    await res.text().catch(() => '');
    throw mapStatus(res.status);
  }
  return (await res.json()) as T;
}

export function getAccount(creds: AlpacaCredentials): Promise<AlpacaAccount> {
  return alpacaFetch<AlpacaAccount>(creds, '/v2/account');
}

export interface AlpacaVerifyResult {
  account_number: string;
  status: string;
  cash: string;
  portfolio_value: string;
  trading_blocked: boolean;
}

export async function verifyCredentials(creds: AlpacaCredentials): Promise<AlpacaVerifyResult> {
  const acct = await getAccount(creds);
  return {
    account_number: acct.account_number,
    status: acct.status,
    cash: acct.cash,
    portfolio_value: acct.portfolio_value,
    trading_blocked: acct.trading_blocked,
  };
}

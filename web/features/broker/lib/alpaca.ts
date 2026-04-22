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
  // Paper accounts have no live-funded fields; we expose a subset only.
}

export class AlpacaError extends Error {
  readonly code:
    | 'unauthorized'
    | 'forbidden'
    | 'not_found'
    | 'rate_limited'
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

function mapStatus(status: number, body: string): AlpacaError {
  if (status === 401) return new AlpacaError('unauthorized', status, 'Alpaca rejected credentials');
  if (status === 403) return new AlpacaError('forbidden', status, 'Alpaca denied access');
  if (status === 404) return new AlpacaError('not_found', status, 'Alpaca endpoint not found');
  if (status === 429) return new AlpacaError('rate_limited', status, 'Alpaca rate-limited');
  return new AlpacaError('unexpected', status, `Alpaca ${status}: ${body.slice(0, 200)}`);
}

async function alpacaFetch<T>(
  creds: AlpacaCredentials,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  assertPaperKey(creds.keyId);
  const url = `${ALPACA_PAPER_BASE_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        'APCA-API-KEY-ID': creds.keyId,
        'APCA-API-SECRET-KEY': creds.secret,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
  } catch (err) {
    throw new AlpacaError('network', 0, `network error: ${String(err)}`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw mapStatus(res.status, body);
  }
  return (await res.json()) as T;
}

export function getAccount(creds: AlpacaCredentials): Promise<AlpacaAccount> {
  return alpacaFetch<AlpacaAccount>(creds, '/v2/account');
}

// Verify returns a normalized payload the UI can display without leaking
// Alpaca's full account response.
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

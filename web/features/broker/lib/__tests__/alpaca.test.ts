import { test } from 'node:test';
import assert from 'node:assert/strict';

import { verifyCredentials, AlpacaError, _internal } from '../alpaca';
import { ALPACA_PAPER_BASE_URL, LiveKeyRejectedError } from '../live-key';

type FetchFn = typeof globalThis.fetch;

function withMockedFetch(mock: FetchFn, fn: () => Promise<void>): Promise<void> {
  const orig = globalThis.fetch;
  globalThis.fetch = mock;
  return fn().finally(() => {
    globalThis.fetch = orig;
  });
}

function response(status: number, body: unknown): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('alpaca: live key short-circuits before any network call', async () => {
  let called = false;
  await withMockedFetch(
    (async () => {
      called = true;
      return response(200, {});
    }) as FetchFn,
    async () => {
      await assert.rejects(
        () => verifyCredentials({ keyId: 'AKLIVE12345', secret: 'verysecret1234567890' }),
        LiveKeyRejectedError
      );
    }
  );
  assert.equal(called, false);
});

test('alpaca: 401 maps to unauthorized', async () => {
  await withMockedFetch(
    (async () => response(401, { message: 'bad creds' })) as FetchFn,
    async () => {
      await assert.rejects(
        () => verifyCredentials({ keyId: 'PKGOOD1234567890', secret: 'verysecret1234567890' }),
        (err: unknown) => err instanceof AlpacaError && err.code === 'unauthorized'
      );
    }
  );
});

test('alpaca: 403 maps to forbidden', async () => {
  await withMockedFetch(
    (async () => response(403, { message: 'nope' })) as FetchFn,
    async () => {
      await assert.rejects(
        () => verifyCredentials({ keyId: 'PKGOOD1234567890', secret: 'verysecret1234567890' }),
        (err: unknown) => err instanceof AlpacaError && err.code === 'forbidden'
      );
    }
  );
});

test('alpaca: 429 maps to rate_limited', async () => {
  await withMockedFetch(
    (async () => response(429, { message: 'slow down' })) as FetchFn,
    async () => {
      await assert.rejects(
        () => verifyCredentials({ keyId: 'PKGOOD1234567890', secret: 'verysecret1234567890' }),
        (err: unknown) => err instanceof AlpacaError && err.code === 'rate_limited'
      );
    }
  );
});

test('alpaca: 404 maps to not_found', async () => {
  await withMockedFetch(
    (async () => response(404, { message: 'no' })) as FetchFn,
    async () => {
      await assert.rejects(
        () => verifyCredentials({ keyId: 'PKGOOD1234567890', secret: 'verysecret1234567890' }),
        (err: unknown) => err instanceof AlpacaError && err.code === 'not_found'
      );
    }
  );
});

test('alpaca: 500 maps to unexpected and does not leak body', async () => {
  await withMockedFetch(
    (async () => response(500, 'x'.repeat(500))) as FetchFn,
    async () => {
      await assert.rejects(
        () => verifyCredentials({ keyId: 'PKGOOD1234567890', secret: 'verysecret1234567890' }),
        (err: unknown) => {
          if (!(err instanceof AlpacaError)) return false;
          if (err.code !== 'unexpected') return false;
          return !err.message.includes('x'.repeat(50));
        }
      );
    }
  );
});

test('alpaca: network error maps to network code with generic message', async () => {
  await withMockedFetch(
    (async () => {
      throw new TypeError('fetch failed');
    }) as FetchFn,
    async () => {
      await assert.rejects(
        () => verifyCredentials({ keyId: 'PKGOOD1234567890', secret: 'verysecret1234567890' }),
        (err: unknown) => {
          if (!(err instanceof AlpacaError)) return false;
          if (err.code !== 'network') return false;
          // Must not include the original error string.
          return !err.message.includes('fetch failed');
        }
      );
    }
  );
});

test('alpaca: AbortError maps to timeout code', async () => {
  await withMockedFetch(
    (async () => {
      const err = new Error('aborted') as Error & { name: string };
      err.name = 'AbortError';
      throw err;
    }) as FetchFn,
    async () => {
      await assert.rejects(
        () => verifyCredentials({ keyId: 'PKGOOD1234567890', secret: 'verysecret1234567890' }),
        (err: unknown) => err instanceof AlpacaError && err.code === 'timeout'
      );
    }
  );
});

test('alpaca: assertSameHost rejects cross-origin URLs', () => {
  assert.throws(
    () => _internal.assertSameHost(new URL('https://evil.com/v2/account')),
    (err: unknown) =>
      err instanceof AlpacaError &&
      err.code === 'unexpected' &&
      err.message === 'alpaca host mismatch'
  );
  assert.doesNotThrow(() =>
    _internal.assertSameHost(new URL(`${ALPACA_PAPER_BASE_URL}/v2/account`))
  );
});

test('alpaca: happy path hits GET /v2/account with credential headers', async () => {
  const mockAccount = {
    id: 'uuid-1',
    account_number: 'PA123',
    status: 'ACTIVE',
    currency: 'USD',
    cash: '100000.00',
    portfolio_value: '100000.00',
    pattern_day_trader: false,
    trading_blocked: false,
  };

  await withMockedFetch(
    (async (url, init) => {
      assert.equal(String(url), 'https://paper-api.alpaca.markets/v2/account');
      assert.equal((init as RequestInit | undefined)?.method ?? 'GET', 'GET');
      const headers = new Headers((init as RequestInit | undefined)?.headers);
      assert.equal(headers.get('Content-Type'), 'application/json');
      assert.equal(headers.get('APCA-API-KEY-ID'), 'PKGOOD1234567890');
      assert.equal(headers.get('APCA-API-SECRET-KEY'), 'verysecret1234567890');
      return response(200, mockAccount);
    }) as FetchFn,
    async () => {
      const out = await verifyCredentials({
        keyId: 'PKGOOD1234567890',
        secret: 'verysecret1234567890',
      });
      assert.equal(out.account_number, 'PA123');
      assert.equal(out.status, 'ACTIVE');
      assert.equal(out.trading_blocked, false);
      assert.ok(!('id' in out));
    }
  );
});

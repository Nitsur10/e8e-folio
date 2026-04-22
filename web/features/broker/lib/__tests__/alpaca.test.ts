import { test } from 'node:test';
import assert from 'node:assert/strict';

import { verifyCredentials, AlpacaError } from '../alpaca';
import { LiveKeyRejectedError } from '../live-key';

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
    async () => {
      called = true;
      return response(200, {});
    },
    async () => {
      await assert.rejects(
        () => verifyCredentials({ keyId: 'AKLIVE12345', secret: 'verysecret1234567890' }),
        LiveKeyRejectedError
      );
    }
  );
  assert.equal(called, false, 'fetch must not be invoked for live keys');
});

test('alpaca: 401 maps to AlpacaError(unauthorized)', async () => {
  await withMockedFetch(
    async () => response(401, { message: 'bad creds' }),
    async () => {
      await assert.rejects(
        () => verifyCredentials({ keyId: 'PKGOOD1234567890', secret: 'verysecret1234567890' }),
        (err: unknown) => {
          assert.ok(err instanceof AlpacaError);
          assert.equal((err as AlpacaError).code, 'unauthorized');
          return true;
        }
      );
    }
  );
});

test('alpaca: 403 maps to AlpacaError(forbidden)', async () => {
  await withMockedFetch(
    async () => response(403, { message: 'nope' }),
    async () => {
      await assert.rejects(
        () => verifyCredentials({ keyId: 'PKGOOD1234567890', secret: 'verysecret1234567890' }),
        (err: unknown) => {
          assert.ok(err instanceof AlpacaError);
          assert.equal((err as AlpacaError).code, 'forbidden');
          return true;
        }
      );
    }
  );
});

test('alpaca: 429 maps to AlpacaError(rate_limited)', async () => {
  await withMockedFetch(
    async () => response(429, { message: 'slow down' }),
    async () => {
      await assert.rejects(
        () => verifyCredentials({ keyId: 'PKGOOD1234567890', secret: 'verysecret1234567890' }),
        (err: unknown) => {
          assert.ok(err instanceof AlpacaError);
          assert.equal((err as AlpacaError).code, 'rate_limited');
          return true;
        }
      );
    }
  );
});

test('alpaca: happy path returns normalized verify payload', async () => {
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
    async (url, init) => {
      assert.ok(String(url).startsWith('https://paper-api.alpaca.markets'));
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('APCA-API-KEY-ID'), 'PKGOOD1234567890');
      assert.equal(headers.get('APCA-API-SECRET-KEY'), 'verysecret1234567890');
      return response(200, mockAccount);
    },
    async () => {
      const out = await verifyCredentials({
        keyId: 'PKGOOD1234567890',
        secret: 'verysecret1234567890',
      });
      assert.equal(out.account_number, 'PA123');
      assert.equal(out.status, 'ACTIVE');
      assert.equal(out.trading_blocked, false);
      assert.ok(!('id' in out), 'verify result must not leak internal account id');
    }
  );
});

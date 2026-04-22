import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseConnectPayload } from '../schemas';

test('schemas: accepts well-formed payload', () => {
  const out = parseConnectPayload({ keyId: 'PKABCDEFGHIJKLMN', secret: 'verysecret1234567890abc' });
  assert.equal(out.ok, true);
  if (out.ok) {
    assert.equal(out.value.keyId, 'PKABCDEFGHIJKLMN');
  }
});

test('schemas: rejects empty body', () => {
  const out = parseConnectPayload(null);
  assert.equal(out.ok, false);
});

test('schemas: rejects short secret', () => {
  const out = parseConnectPayload({ keyId: 'PKABCDEFGHIJKLMN', secret: 'tooshort' });
  assert.equal(out.ok, false);
  if (!out.ok) assert.ok(out.errors.find((e) => e.field === 'secret'));
});

test('schemas: rejects lowercase keyId', () => {
  const out = parseConnectPayload({ keyId: 'pkabcdefghijklmn', secret: 'verysecret1234567890abc' });
  assert.equal(out.ok, false);
  if (!out.ok) assert.ok(out.errors.find((e) => e.field === 'keyId'));
});

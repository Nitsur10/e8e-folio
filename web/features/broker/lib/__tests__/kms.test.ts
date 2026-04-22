import { test } from 'node:test';
import assert from 'node:assert/strict';

import { encryptSecret, decryptSecret, _internal } from '../kms';

function setLocalKey() {
  process.env.FOLIO_KMS_KEY_ID = 'local:test';
  process.env.FOLIO_KMS_LOCAL_KEY = 'test-local-master-passphrase-for-unit-tests';
}

test('kms envelope: round-trip restores plaintext (local path)', async () => {
  setLocalKey();
  const plaintext = 'PKTEST123456ABCDEFGH';
  const { ciphertext, kmsKeyId } = await encryptSecret(plaintext);
  assert.equal(kmsKeyId, 'local:dev');
  assert.ok(Buffer.isBuffer(ciphertext));
  assert.notEqual(ciphertext.toString('utf8'), plaintext);
  const restored = await decryptSecret(ciphertext);
  assert.equal(restored, plaintext);
});

test('kms envelope: two encryptions of the same plaintext produce different ciphertexts', async () => {
  setLocalKey();
  const pt = 'secret-value';
  const a = await encryptSecret(pt);
  const b = await encryptSecret(pt);
  assert.ok(!a.ciphertext.equals(b.ciphertext), 'iv/edk should randomize ciphertext');
});

test('kms envelope: tampered ciphertext fails authentication', async () => {
  setLocalKey();
  const { ciphertext } = await encryptSecret('abc123');
  // Flip a byte in the ciphertext body (past the header + iv + tag).
  const tampered = Buffer.from(ciphertext);
  tampered[tampered.length - 1] ^= 0x01;
  await assert.rejects(() => decryptSecret(tampered));
});

test('kms envelope: unknown version byte is rejected', async () => {
  const junk = Buffer.alloc(1 + 2 + 12 + 16 + 1, 0);
  junk[0] = 0x55;
  junk.writeUInt16BE(0, 1);
  await assert.rejects(() => decryptSecret(junk), /unknown envelope version/);
});

test('kms envelope: truncated ciphertext is rejected', async () => {
  await assert.rejects(() => decryptSecret(Buffer.from([_internal.VERSION_LOCAL, 0x00])));
});

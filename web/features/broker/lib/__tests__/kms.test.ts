import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

import { encryptSecret, decryptSecret, _internal } from '../kms';

const TRACKED_ENV = ['KMS_KEY_ID', 'KMS_LOCAL_MASTER_KEY', 'NODE_ENV'] as const;
const snapshot: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of TRACKED_ENV) snapshot[k] = process.env[k];
  delete (process.env as Record<string, string | undefined>).KMS_KEY_ID;
  delete (process.env as Record<string, string | undefined>).KMS_LOCAL_MASTER_KEY;
});

afterEach(() => {
  _internal.setClientForTesting(null);
  for (const k of TRACKED_ENV) {
    const prev = snapshot[k];
    if (prev === undefined) delete (process.env as Record<string, string | undefined>)[k];
    else (process.env as Record<string, string>)[k] = prev;
  }
});

function useLocalKms() {
  process.env.KMS_LOCAL_MASTER_KEY = 'test-local-master-passphrase-for-unit-tests';
}

test('kms envelope: local round-trip restores plaintext', async () => {
  useLocalKms();
  const plaintext = 'PKTEST123456ABCDEFGH';
  const { ciphertext, kmsKeyId } = await encryptSecret(plaintext);
  assert.equal(kmsKeyId, 'local:dev');
  assert.ok(Buffer.isBuffer(ciphertext));
  assert.notEqual(ciphertext.toString('utf8'), plaintext);
  const restored = await decryptSecret(ciphertext);
  assert.equal(restored, plaintext);
});

test('kms envelope: local two encryptions randomize ciphertext', async () => {
  useLocalKms();
  const a = await encryptSecret('secret-value');
  const b = await encryptSecret('secret-value');
  assert.ok(!a.ciphertext.equals(b.ciphertext));
});

test('kms envelope: tampered ct byte fails auth', async () => {
  useLocalKms();
  const { ciphertext } = await encryptSecret('abc123');
  const tampered = Buffer.from(ciphertext);
  tampered[tampered.length - 1] ^= 0x01;
  await assert.rejects(() => decryptSecret(tampered));
});

test('kms envelope: tampered tag byte fails auth', async () => {
  useLocalKms();
  const { ciphertext } = await encryptSecret('abc123');
  const tampered = Buffer.from(ciphertext);
  // tag sits just before the ct, 16 bytes wide. Flip a byte inside it.
  tampered[tampered.length - 17] ^= 0x01;
  await assert.rejects(() => decryptSecret(tampered));
});

test('kms envelope: unknown version byte is rejected', async () => {
  useLocalKms();
  const junk = Buffer.alloc(1 + 2 + 12 + 16 + 1, 0);
  junk[0] = 0x55;
  junk.writeUInt16BE(0, 1);
  await assert.rejects(() => decryptSecret(junk), /unknown envelope version/);
});

test('kms envelope: truncated ciphertext is rejected', async () => {
  useLocalKms();
  await assert.rejects(
    () => decryptSecret(Buffer.from([_internal.VERSION_LOCAL, 0x00])),
    /ciphertext too short/
  );
});

test('kms envelope: local path refuses to run in production', async () => {
  useLocalKms();
  (process.env as Record<string, string>).NODE_ENV = 'production';
  await assert.rejects(() => encryptSecret('x'), /KMS_KEY_ID is required in production/);
});

test('kms envelope: local envelope rejected by decryptSecret in production', async () => {
  useLocalKms();
  // Encrypt in dev …
  const { ciphertext } = await encryptSecret('x');
  // … then pretend we crossed into prod.
  (process.env as Record<string, string>).NODE_ENV = 'production';
  await assert.rejects(() => decryptSecret(ciphertext), /local-dev envelope rejected/);
});

test('kms envelope: missing KMS_LOCAL_MASTER_KEY throws a clear error', async () => {
  delete process.env.KMS_LOCAL_MASTER_KEY;
  await assert.rejects(() => encryptSecret('x'), /KMS_LOCAL_MASTER_KEY missing/);
});

test('kms envelope: AWS KMS path round-trips through injected fake client', async () => {
  process.env.KMS_KEY_ID = 'arn:aws:kms:us-east-1:111:key/fake';

  const fakeDataKey = randomBytes(32);
  // Simulate KMS by storing the plaintext data key keyed by its edk.
  const store = new Map<string, Buffer>();

  _internal.setClientForTesting({
    async send(command: unknown) {
      const cmdName = (command as { constructor: { name: string } }).constructor.name;
      if (cmdName === 'GenerateDataKeyCommand') {
        const edk = Buffer.concat([Buffer.from('EDK:'), randomBytes(180)]);
        store.set(edk.toString('hex'), fakeDataKey);
        return {
          Plaintext: new Uint8Array(fakeDataKey),
          CiphertextBlob: new Uint8Array(edk),
          KeyId: 'arn:aws:kms:us-east-1:111:key/fake',
        };
      }
      if (cmdName === 'DecryptCommand') {
        const input = (command as { input: { CiphertextBlob: Uint8Array } }).input;
        const edk = Buffer.from(input.CiphertextBlob);
        const pt = store.get(edk.toString('hex'));
        if (!pt) throw new Error('unknown edk');
        return { Plaintext: new Uint8Array(pt) };
      }
      throw new Error(`unexpected command: ${cmdName}`);
    },
  });

  const { ciphertext, kmsKeyId } = await encryptSecret('PKKMSTEST1234567890');
  assert.equal(kmsKeyId, 'arn:aws:kms:us-east-1:111:key/fake');
  assert.equal(ciphertext[0], _internal.VERSION_KMS);
  const restored = await decryptSecret(ciphertext);
  assert.equal(restored, 'PKKMSTEST1234567890');
});

test('kms envelope: round-trips unicode and empty plaintext', async () => {
  useLocalKms();
  for (const pt of ['', 'a\0b', '秘密🔑', 'x'.repeat(500)]) {
    const { ciphertext } = await encryptSecret(pt);
    assert.equal(await decryptSecret(ciphertext), pt);
  }
});

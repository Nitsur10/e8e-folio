import {
  KMSClient,
  GenerateDataKeyCommand,
  DecryptCommand,
} from '@aws-sdk/client-kms';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHmac,
} from 'node:crypto';

// Envelope encryption layout (single bytea column):
//   [version:1][edk_len:2-be][edk:edk_len][iv:12][tag:16][ciphertext:*]
//
// version 0x01 → AWS KMS (edk is the KMS-encrypted data key)
// version 0x7f → local-dev (edk is the HMAC of the local master over the iv)
//
// The AES-GCM data key is 32 bytes (AES-256). Keys never leave memory for
// longer than the request that uses them — no caching.

const VERSION_KMS = 0x01;
const VERSION_LOCAL = 0x7f;
const IV_LEN = 12;
const TAG_LEN = 16;
const DATA_KEY_LEN = 32;

let kmsClient: KMSClient | null = null;
function getClient(): KMSClient {
  if (!kmsClient) {
    kmsClient = new KMSClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
  }
  return kmsClient;
}

function kmsKeyId(): string | null {
  const id = process.env.FOLIO_KMS_KEY_ID;
  if (!id || id === '' || id.startsWith('local:')) return null;
  return id;
}

function localMasterKey(): Buffer {
  const raw = process.env.FOLIO_KMS_LOCAL_KEY;
  if (!raw) {
    throw new Error(
      'FOLIO_KMS_KEY_ID not set and FOLIO_KMS_LOCAL_KEY missing — cannot encrypt'
    );
  }
  // Accept hex or base64. Derive a stable 32-byte key via HMAC if the input
  // isn't already 32 bytes after decode.
  let buf: Buffer;
  try {
    buf = Buffer.from(raw, 'base64');
    if (buf.length !== 32) throw new Error('not 32');
  } catch {
    buf = createHmac('sha256', 'folio.e8e/local-kms').update(raw).digest();
  }
  if (buf.length !== 32) {
    buf = createHmac('sha256', 'folio.e8e/local-kms').update(raw).digest();
  }
  return buf;
}

export interface EncryptResult {
  ciphertext: Buffer;
  kmsKeyId: string;
}

export async function encryptSecret(plaintext: string): Promise<EncryptResult> {
  const keyId = kmsKeyId();
  if (keyId) {
    return encryptWithKms(plaintext, keyId);
  }
  return encryptLocal(plaintext);
}

export async function decryptSecret(ciphertext: Buffer): Promise<string> {
  if (ciphertext.length < 1 + 2 + IV_LEN + TAG_LEN) {
    throw new Error('ciphertext too short');
  }
  const version = ciphertext[0];
  if (version === VERSION_KMS) return decryptKms(ciphertext);
  if (version === VERSION_LOCAL) return decryptLocal(ciphertext);
  throw new Error(`unknown envelope version: 0x${version.toString(16)}`);
}

async function encryptWithKms(plaintext: string, keyId: string): Promise<EncryptResult> {
  const kms = getClient();
  const out = await kms.send(
    new GenerateDataKeyCommand({ KeyId: keyId, KeySpec: 'AES_256' })
  );
  if (!out.Plaintext || !out.CiphertextBlob) {
    throw new Error('KMS GenerateDataKey returned empty payload');
  }
  const dataKey = Buffer.from(out.Plaintext);
  const edk = Buffer.from(out.CiphertextBlob);
  try {
    const envelope = sealAesGcm(VERSION_KMS, dataKey, edk, Buffer.from(plaintext, 'utf8'));
    return { ciphertext: envelope, kmsKeyId: out.KeyId ?? keyId };
  } finally {
    dataKey.fill(0);
  }
}

async function decryptKms(envelope: Buffer): Promise<string> {
  const { edk, iv, tag, ct } = parseEnvelope(envelope);
  const kms = getClient();
  const out = await kms.send(new DecryptCommand({ CiphertextBlob: edk }));
  if (!out.Plaintext) throw new Error('KMS Decrypt returned empty payload');
  const dataKey = Buffer.from(out.Plaintext);
  try {
    return openAesGcm(dataKey, iv, tag, ct).toString('utf8');
  } finally {
    dataKey.fill(0);
  }
}

function encryptLocal(plaintext: string): EncryptResult {
  const master = localMasterKey();
  const dataKey = randomBytes(DATA_KEY_LEN);
  try {
    // Wrap the data key by XORing it with HMAC(master, iv). The iv is part
    // of the envelope, so we can reproduce the HMAC on decrypt. This is a
    // local-dev shim only — production paths go through AWS KMS.
    const iv = randomBytes(IV_LEN);
    const wrap = createHmac('sha256', master).update(iv).digest().subarray(0, DATA_KEY_LEN);
    const edk = Buffer.alloc(DATA_KEY_LEN);
    for (let i = 0; i < DATA_KEY_LEN; i++) edk[i] = dataKey[i] ^ wrap[i];

    const cipher = createCipheriv('aes-256-gcm', dataKey, iv);
    const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    const envelope = writeEnvelope(VERSION_LOCAL, edk, iv, tag, ct);
    return { ciphertext: envelope, kmsKeyId: 'local:dev' };
  } finally {
    dataKey.fill(0);
    master.fill(0);
  }
}

function decryptLocal(envelope: Buffer): string {
  const master = localMasterKey();
  const { edk, iv, tag, ct } = parseEnvelope(envelope);
  if (edk.length !== DATA_KEY_LEN) throw new Error('local edk length mismatch');
  const wrap = createHmac('sha256', master).update(iv).digest().subarray(0, DATA_KEY_LEN);
  const dataKey = Buffer.alloc(DATA_KEY_LEN);
  try {
    for (let i = 0; i < DATA_KEY_LEN; i++) dataKey[i] = edk[i] ^ wrap[i];
    return openAesGcm(dataKey, iv, tag, ct).toString('utf8');
  } finally {
    dataKey.fill(0);
    master.fill(0);
  }
}

function sealAesGcm(
  version: number,
  dataKey: Buffer,
  edk: Buffer,
  plaintext: Buffer
): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', dataKey, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return writeEnvelope(version, edk, iv, tag, ct);
}

function openAesGcm(dataKey: Buffer, iv: Buffer, tag: Buffer, ct: Buffer): Buffer {
  const decipher = createDecipheriv('aes-256-gcm', dataKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

function writeEnvelope(
  version: number,
  edk: Buffer,
  iv: Buffer,
  tag: Buffer,
  ct: Buffer
): Buffer {
  if (iv.length !== IV_LEN) throw new Error('iv length');
  if (tag.length !== TAG_LEN) throw new Error('tag length');
  if (edk.length > 0xffff) throw new Error('edk too large');
  const out = Buffer.alloc(1 + 2 + edk.length + IV_LEN + TAG_LEN + ct.length);
  let o = 0;
  out[o++] = version;
  out.writeUInt16BE(edk.length, o);
  o += 2;
  edk.copy(out, o);
  o += edk.length;
  iv.copy(out, o);
  o += IV_LEN;
  tag.copy(out, o);
  o += TAG_LEN;
  ct.copy(out, o);
  return out;
}

interface EnvelopeParts {
  edk: Buffer;
  iv: Buffer;
  tag: Buffer;
  ct: Buffer;
}

function parseEnvelope(envelope: Buffer): EnvelopeParts {
  let o = 1; // skip version (already read by caller)
  const edkLen = envelope.readUInt16BE(o);
  o += 2;
  if (envelope.length < o + edkLen + IV_LEN + TAG_LEN) {
    throw new Error('envelope truncated');
  }
  const edk = envelope.subarray(o, o + edkLen);
  o += edkLen;
  const iv = envelope.subarray(o, o + IV_LEN);
  o += IV_LEN;
  const tag = envelope.subarray(o, o + TAG_LEN);
  o += TAG_LEN;
  const ct = envelope.subarray(o);
  return { edk, iv, tag, ct };
}

// Exported for unit tests so they can force the local path deterministically.
export const _internal = {
  VERSION_KMS,
  VERSION_LOCAL,
  writeEnvelope,
  parseEnvelope,
};

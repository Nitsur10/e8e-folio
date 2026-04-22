// Hand-rolled validators. Adding zod for one feature isn't worth the dep
// weight yet; T2.2 signal envelopes will introduce zod across features.

export interface ConnectPayload {
  keyId: string;
  secret: string;
}

export interface ValidationError {
  field: 'keyId' | 'secret';
  message: string;
}

export function parseConnectPayload(input: unknown): {
  ok: true;
  value: ConnectPayload;
} | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      errors: [{ field: 'keyId', message: 'Request body must be a JSON object' }],
    };
  }
  const body = input as Record<string, unknown>;
  const keyId = typeof body.keyId === 'string' ? body.keyId.trim() : '';
  const secret = typeof body.secret === 'string' ? body.secret.trim() : '';

  if (!keyId) errors.push({ field: 'keyId', message: 'API key is required' });
  else if (keyId.length < 12 || keyId.length > 64) {
    errors.push({ field: 'keyId', message: 'API key length looks wrong' });
  } else if (!/^[A-Z0-9]+$/.test(keyId)) {
    errors.push({ field: 'keyId', message: 'API key must be uppercase alphanumeric' });
  }

  if (!secret) errors.push({ field: 'secret', message: 'API secret is required' });
  else if (secret.length < 20 || secret.length > 128) {
    errors.push({ field: 'secret', message: 'API secret length looks wrong' });
  } else if (!/^[A-Za-z0-9/+=]+$/.test(secret)) {
    errors.push({ field: 'secret', message: 'API secret has unexpected characters' });
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { keyId, secret } };
}

import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { parseConnectPayload } from '@/features/broker/lib/schemas';
import { assertPaperKey, LiveKeyRejectedError } from '@/features/broker/lib/live-key';
import { verifyCredentials, AlpacaError } from '@/features/broker/lib/alpaca';
import { encryptSecret } from '@/features/broker/lib/kms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const sb = await getServerSupabase();
  const { data: userRes, error: authErr } = await sb.auth.getUser();
  if (authErr) {
    return NextResponse.json({ error: 'auth_error' }, { status: 401 });
  }
  const user = userRes?.user;
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = parseConnectPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: 'invalid_payload', details: parsed.errors }, { status: 400 });
  }
  const { keyId, secret } = parsed.value;

  try {
    assertPaperKey(keyId);
  } catch (err) {
    if (err instanceof LiveKeyRejectedError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: 400 });
    }
    throw err;
  }

  try {
    await verifyCredentials({ keyId, secret });
  } catch (err) {
    if (err instanceof AlpacaError) {
      // Never echo err.message — it may contain upstream body fragments or
      // cause chains that include the secret. The code alone is caller-safe.
      return NextResponse.json(
        { error: 'alpaca_verification_failed', code: err.code },
        { status: err.code === 'unauthorized' || err.code === 'forbidden' ? 400 : 502 }
      );
    }
    throw err;
  }

  const [encKey, encSecret] = await Promise.all([encryptSecret(keyId), encryptSecret(secret)]);

  // Use the user-scoped SSR client; RLS policy "broker owner" on
  // broker_connections restricts writes to auth.uid() = user_id, so an
  // accidentally forgotten predicate still fails closed.
  const { error: upsertError } = await sb.from('broker_connections').upsert(
    {
      user_id: user.id,
      broker: 'alpaca_paper',
      encrypted_key: toBytea(encKey.ciphertext),
      encrypted_secret: toBytea(encSecret.ciphertext),
      kms_key_id: encKey.kmsKeyId,
      verified_at: new Date().toISOString(),
      revoked_at: null,
    },
    { onConflict: 'user_id,broker' }
  );
  if (upsertError) {
    return NextResponse.json({ error: 'persistence_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const sb = await getServerSupabase();
  const { data: userRes, error: authErr } = await sb.auth.getUser();
  if (authErr) {
    return NextResponse.json({ error: 'auth_error' }, { status: 401 });
  }
  const user = userRes?.user;
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const { error } = await sb
    .from('broker_connections')
    .delete()
    .eq('user_id', user.id)
    .eq('broker', 'alpaca_paper');
  if (error) {
    return NextResponse.json({ error: 'revoke_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

function toBytea(buf: Buffer): string {
  return '\\x' + buf.toString('hex');
}

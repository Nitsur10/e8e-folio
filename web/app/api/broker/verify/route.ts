import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptSecret } from '@/features/broker/lib/kms';
import { verifyCredentials, AlpacaError } from '@/features/broker/lib/alpaca';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const sb = await getServerSupabase();
  const { data: userRes } = await sb.auth.getUser();
  const user = userRes?.user;
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from('broker_connections')
    .select('encrypted_key,encrypted_secret,revoked_at')
    .eq('user_id', user.id)
    .eq('broker', 'alpaca_paper')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'lookup_failed', message: error.message }, { status: 500 });
  }
  if (!row || row.revoked_at) {
    return NextResponse.json({ error: 'not_connected' }, { status: 404 });
  }

  const encKey = fromBytea(row.encrypted_key as unknown as string | Buffer);
  const encSecret = fromBytea(row.encrypted_secret as unknown as string | Buffer);
  const [keyId, secret] = await Promise.all([decryptSecret(encKey), decryptSecret(encSecret)]);

  try {
    const account = await verifyCredentials({ keyId, secret });
    await admin
      .from('broker_connections')
      .update({ verified_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('broker', 'alpaca_paper');
    return NextResponse.json({ ok: true, account });
  } catch (err) {
    if (err instanceof AlpacaError) {
      return NextResponse.json(
        { error: 'alpaca_verification_failed', code: err.code, message: err.message },
        { status: err.code === 'unauthorized' || err.code === 'forbidden' ? 400 : 502 }
      );
    }
    throw err;
  }
}

// PostgREST returns bytea as a `\x`-prefixed hex string by default.
function fromBytea(value: string | Buffer): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (typeof value !== 'string') throw new Error('unexpected bytea payload');
  if (value.startsWith('\\x')) return Buffer.from(value.slice(2), 'hex');
  // Some Supabase client configs return base64. Fall back.
  return Buffer.from(value, 'base64');
}

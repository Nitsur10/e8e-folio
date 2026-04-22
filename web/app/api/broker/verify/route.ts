import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { decryptSecret } from '@/features/broker/lib/kms';
import { verifyCredentials, AlpacaError } from '@/features/broker/lib/alpaca';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const sb = await getServerSupabase();
  const { data: userRes, error: authErr } = await sb.auth.getUser();
  if (authErr) {
    return NextResponse.json({ error: 'auth_error' }, { status: 401 });
  }
  const user = userRes?.user;
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const { data: row, error } = await sb
    .from('broker_connections')
    .select('encrypted_key,encrypted_secret,revoked_at')
    .eq('user_id', user.id)
    .eq('broker', 'alpaca_paper')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  }
  if (!row || row.revoked_at) {
    return NextResponse.json({ error: 'not_connected' }, { status: 404 });
  }

  const encKey = fromBytea(row.encrypted_key as unknown as string | Buffer);
  const encSecret = fromBytea(row.encrypted_secret as unknown as string | Buffer);
  const [keyId, secret] = await Promise.all([decryptSecret(encKey), decryptSecret(encSecret)]);

  try {
    const account = await verifyCredentials({ keyId, secret });
    // Only touch verified_at on non-revoked rows; the .is('revoked_at', null)
    // guard prevents a verify/revoke race from reviving a revoked row.
    await sb
      .from('broker_connections')
      .update({ verified_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('broker', 'alpaca_paper')
      .is('revoked_at', null);
    return NextResponse.json({ ok: true, account });
  } catch (err) {
    if (err instanceof AlpacaError) {
      return NextResponse.json(
        { error: 'alpaca_verification_failed', code: err.code },
        { status: err.code === 'unauthorized' || err.code === 'forbidden' ? 400 : 502 }
      );
    }
    throw err;
  }
}

function fromBytea(value: string | Buffer): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (typeof value !== 'string' || !value.startsWith('\\x')) {
    throw new Error('unexpected bytea payload shape');
  }
  const hex = value.slice(2);
  if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error('malformed bytea hex');
  }
  return Buffer.from(hex, 'hex');
}

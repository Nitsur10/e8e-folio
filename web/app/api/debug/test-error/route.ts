import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NODE_ENV === 'production' && process.env.FOLIO_ALLOW_DEBUG_ROUTES !== 'true') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  throw new Error('folio.e8e test error — verifying Sentry capture');
}

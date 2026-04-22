import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Default-deny. Debug probes are only reachable in local `next dev`
// or when an operator explicitly sets FOLIO_ALLOW_DEBUG_ROUTES=true.
function debugEnabled(): boolean {
  if (process.env.FOLIO_ALLOW_DEBUG_ROUTES === 'true') return true;
  return process.env.NODE_ENV === 'development';
}

export async function GET() {
  if (!debugEnabled()) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  throw new Error('folio.e8e test error — verifying Sentry capture');
}

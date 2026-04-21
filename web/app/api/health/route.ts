import { NextResponse } from 'next/server';

// Force dynamic rendering — prevents build-time execution
export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {};
  let healthy = true;

  // Check environment variables first
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  checks.env = missingVars.length === 0 ? 'ok' : 'error';
  if (missingVars.length > 0) healthy = false;

  // Check Supabase connectivity (only if env vars are present)
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createServerClient } = await import('@/lib/supabase');
      const supabase = createServerClient();
      const { error } = await supabase.from('feedback_items').select('id').limit(1);
      if (error) throw error;
      checks.supabase = 'ok';
    } catch {
      checks.supabase = 'error';
      healthy = false;
    }
  } else {
    checks.supabase = 'error';
  }

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      checks,
      ...(missingVars.length > 0 && { missing_env: missingVars }),
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}

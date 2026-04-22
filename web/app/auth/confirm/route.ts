import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Only a short allow-list of post-confirm destinations is safe. Anything
// else is silently coerced back to the default to prevent a verified
// session being routed to an attacker-chosen internal path.
const SAFE_NEXT = new Set(['/', '/verify-mfa', '/verify-mfa?enroll=1']);
const DEFAULT_NEXT = '/verify-mfa?enroll=1';

function safeNext(raw: string | null): string {
  if (!raw) return DEFAULT_NEXT;
  return SAFE_NEXT.has(raw) ? raw : DEFAULT_NEXT;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = safeNext(searchParams.get('next'));

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/sign-in?error=bad_confirm_link`);
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    return NextResponse.redirect(`${origin}/sign-in?error=expired_link`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

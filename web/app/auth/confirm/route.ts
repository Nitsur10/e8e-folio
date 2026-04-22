import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/verify-mfa?enroll=1';

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

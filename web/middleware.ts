import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

// Paths that do NOT require an authenticated user.
const UNAUTH_PATHS = new Set(['/sign-in', '/sign-up', '/verify-email', '/tokens']);
const UNAUTH_PREFIXES = ['/auth/', '/api/', '/_next/', '/favicon'];

// Paths reachable while authenticated but still at AAL1 (before MFA upgrade).
const AAL1_ALLOWED = new Set(['/verify-mfa', '/verify-email']);

function isUnauthPath(pathname: string): boolean {
  if (UNAUTH_PATHS.has(pathname)) return true;
  return UNAUTH_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // No Supabase wired yet (e.g. preview builds without env) — let everything through.
    return NextResponse.next({ request });
  }

  const { user, mfaRequired, response } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Unauthenticated visitors: allow only the whitelist, redirect everything else to sign-in.
  if (!user) {
    if (isUnauthPath(pathname)) return response;
    const signIn = request.nextUrl.clone();
    signIn.pathname = '/sign-in';
    signIn.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signIn);
  }

  // Authenticated visitors.
  // Keep them out of sign-in / sign-up pages.
  if (pathname === '/sign-in' || pathname === '/sign-up') {
    const home = request.nextUrl.clone();
    home.pathname = '/';
    return NextResponse.redirect(home);
  }

  // AAL1-only user (signed in but MFA not satisfied): pin them to /verify-mfa.
  if (mfaRequired && !AAL1_ALLOWED.has(pathname) && !pathname.startsWith('/auth/')) {
    const verify = request.nextUrl.clone();
    verify.pathname = '/verify-mfa';
    verify.search = '';
    return NextResponse.redirect(verify);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

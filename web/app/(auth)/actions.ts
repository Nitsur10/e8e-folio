'use server';

import { redirect } from 'next/navigation';
import { authStrings, validateEmail, validatePassword, validateTotpCode } from '@folio/shared';
import { getServerSupabase } from '@/lib/supabase/server';

type FormState = { error: string | null };

export async function signUpAction(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const emailErr = validateEmail(email);
  if (emailErr) return { error: emailErr };
  const passErr = validatePassword(password);
  if (passErr) return { error: passErr };

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    if (/already registered/i.test(error.message)) {
      return { error: 'An account already exists for that email.' };
    }
    return { error: authStrings.errors.unknown };
  }

  redirect('/verify-email');
}

export async function signInAction(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const emailErr = validateEmail(email);
  if (emailErr) return { error: emailErr };
  if (!password) return { error: 'Password is required.' };

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (/email not confirmed/i.test(error.message)) {
      return { error: authStrings.errors.email_not_verified };
    }
    if (/rate/i.test(error.message)) {
      return { error: authStrings.errors.rate_limited };
    }
    return { error: authStrings.errors.invalid_credentials };
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel && aal.nextLevel !== aal.currentLevel) {
    redirect('/verify-mfa');
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasVerifiedTotp = factors?.totp?.some((f) => f.status === 'verified');
  if (!hasVerifiedTotp) {
    redirect('/verify-mfa?enroll=1');
  }

  redirect('/');
}

export async function verifyMfaAction(_: FormState, formData: FormData): Promise<FormState> {
  const code = String(formData.get('code') ?? '');
  const codeErr = validateTotpCode(code);
  if (codeErr) return { error: codeErr };

  const supabase = await getServerSupabase();

  // Enrollment passes factorId explicitly; otherwise resolve the user's verified TOTP factor.
  let factorId = String(formData.get('factorId') ?? '');
  if (!factorId) {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    factorId = factors?.totp?.find((f) => f.status === 'verified')?.id ?? '';
  }
  if (!factorId) return { error: authStrings.errors.unknown };

  const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeErr || !challenge) return { error: authStrings.errors.mfa_invalid };

  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (verifyErr) return { error: authStrings.errors.mfa_invalid };

  redirect('/');
}

export async function enrollMfaAction(): Promise<
  { factorId: string; qr: string; secret: string } | { error: string }
> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'folio.e8e',
  });
  if (error || !data) return { error: authStrings.errors.unknown };
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

export async function signOutAction() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  redirect('/sign-in');
}

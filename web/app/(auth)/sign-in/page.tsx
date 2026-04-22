'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { authStrings } from '@folio/shared';
import { signInAction } from '../actions';

const initial = { error: null as string | null };

export default function SignInPage() {
  const [state, action, pending] = useActionState(signInAction, initial);
  const s = authStrings.signIn;

  return (
    <>
      <h1 className="auth-title">{s.title}</h1>
      <p className="auth-subtitle">{s.subtitle}</p>

      <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="auth-field">
          <label htmlFor="email">{s.emailLabel}</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="auth-field">
          <label htmlFor="password">{s.passwordLabel}</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        {state.error ? <div className="auth-error">{state.error}</div> : null}

        <button className="auth-btn" type="submit" disabled={pending}>
          {pending ? 'Signing in…' : s.submit}
        </button>
      </form>

      <p className="auth-footer">
        {s.noAccount} <Link href="/sign-up">{s.signUp}</Link>
      </p>
    </>
  );
}

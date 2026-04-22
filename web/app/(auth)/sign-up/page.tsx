'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { authStrings } from '@folio/shared';
import { signUpAction } from '../actions';

const initial = { error: null as string | null };

export default function SignUpPage() {
  const [state, action, pending] = useActionState(signUpAction, initial);
  const s = authStrings.signUp;

  return (
    <>
      <h1 className="auth-title">
        Join <em>folio.e8e</em>
      </h1>
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
            autoComplete="new-password"
            required
          />
          <span className="hint">{s.passwordHint}</span>
        </div>

        {state.error ? <div className="auth-error">{state.error}</div> : null}

        <button className="auth-btn" type="submit" disabled={pending}>
          {pending ? 'Creating account…' : s.submit}
        </button>
      </form>

      <p className="auth-footer">
        {s.haveAccount} <Link href="/sign-in">{s.signIn}</Link>
      </p>
      <p className="auth-legal">{s.legal}</p>
    </>
  );
}

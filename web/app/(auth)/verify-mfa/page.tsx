'use client';

import * as React from 'react';
import { useActionState, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authStrings } from '@folio/shared';
import { enrollMfaAction, verifyMfaAction } from '../actions';

const initial = { error: null as string | null };

function VerifyMfa() {
  const params = useSearchParams();
  const isEnrollment = params.get('enroll') === '1';
  const [enroll, setEnroll] = useState<
    { factorId: string; qr: string; secret: string } | { error: string } | null
  >(null);
  const [state, action, pending] = useActionState(verifyMfaAction, initial);

  useEffect(() => {
    if (!isEnrollment) return;
    let cancelled = false;
    enrollMfaAction().then((result) => {
      if (!cancelled) setEnroll(result);
    });
    return () => {
      cancelled = true;
    };
  }, [isEnrollment]);

  const copy = isEnrollment ? authStrings.enrollMfa : authStrings.verifyMfa;
  const enrollReady = enroll && 'factorId' in enroll ? enroll : null;
  const enrollError = enroll && 'error' in enroll ? enroll.error : null;
  const errorMessage = state.error ?? enrollError;
  const qrSrc = enrollReady
    ? `data:image/svg+xml;utf8,${encodeURIComponent(enrollReady.qr)}`
    : null;

  return (
    <>
      <h1 className="auth-title">{copy.title}</h1>
      <p className="auth-subtitle">{copy.subtitle}</p>

      {isEnrollment && enrollReady && qrSrc ? (
        <>
          <div className="mfa-qr">
            <img
              src={qrSrc}
              alt="TOTP QR code. If your screen reader can't use this, the secret below is equivalent."
              aria-describedby="mfa-secret-label mfa-secret-value"
              width={200}
              height={200}
            />
          </div>
          <div>
            <div id="mfa-secret-label" className="auth-subtitle" style={{ marginBottom: 6 }}>
              {authStrings.enrollMfa.secretFallback}
            </div>
            <div id="mfa-secret-value" className="mfa-secret">
              {enrollReady.secret}
            </div>
          </div>
        </>
      ) : null}

      <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {enrollReady ? <input type="hidden" name="factorId" value={enrollReady.factorId} /> : null}
        <div className="auth-field">
          <label htmlFor="code">6-digit code</label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={6}
            required
          />
        </div>

        {errorMessage ? <div className="auth-error">{errorMessage}</div> : null}

        <button className="auth-btn" type="submit" disabled={pending}>
          {pending ? 'Verifying…' : copy.submit}
        </button>
      </form>
    </>
  );
}

export default function VerifyMfaPage() {
  return (
    <React.Suspense fallback={<p className="auth-subtitle">Loading…</p>}>
      <VerifyMfa />
    </React.Suspense>
  );
}

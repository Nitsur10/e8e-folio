'use client';

import { useActionState, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authStrings } from '@folio/shared';
import { enrollMfaAction, verifyMfaAction } from '../actions';

const initial = { error: null as string | null };

export default function VerifyMfaPage() {
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
            {/* Supabase returns a self-contained SVG; served as data URL to avoid dangerouslySetInnerHTML. */}
            <img src={qrSrc} alt="TOTP QR code" width={200} height={200} />
          </div>
          <div>
            <div className="auth-subtitle" style={{ marginBottom: 6 }}>
              {authStrings.enrollMfa.secretFallback}
            </div>
            <div className="mfa-secret">{enrollReady.secret}</div>
          </div>
        </>
      ) : null}

      <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {enrollReady ? <input type="hidden" name="factorId" value={enrollReady.factorId} /> : null}
        {!isEnrollment ? (
          <input type="hidden" name="factorId" value={params.get('factorId') ?? ''} />
        ) : null}
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

        {state.error || (enroll && 'error' in enroll ? enroll.error : null) ? (
          <div className="auth-error">
            {state.error ?? (enroll && 'error' in enroll ? enroll.error : null)}
          </div>
        ) : null}

        <button className="auth-btn" type="submit" disabled={pending}>
          {pending ? 'Verifying…' : copy.submit}
        </button>
      </form>
    </>
  );
}

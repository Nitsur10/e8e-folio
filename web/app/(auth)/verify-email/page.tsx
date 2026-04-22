import { authStrings } from '@folio/shared';

export default function VerifyEmailPage() {
  const s = authStrings.verifyEmail;
  return (
    <>
      <h1 className="auth-title">{s.title}</h1>
      <p className="auth-subtitle">{s.subtitle}</p>
    </>
  );
}

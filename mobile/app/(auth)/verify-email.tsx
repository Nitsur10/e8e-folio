import { authStrings } from '@folio/shared';
import { AuthScreen, AuthSubtitle, AuthTitle } from './_components';

export default function VerifyEmailScreen() {
  const s = authStrings.verifyEmail;
  return (
    <AuthScreen>
      <AuthTitle>{s.title}</AuthTitle>
      <AuthSubtitle>{s.subtitle}</AuthSubtitle>
    </AuthScreen>
  );
}

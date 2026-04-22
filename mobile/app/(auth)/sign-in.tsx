import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { authStrings, validateEmail } from '@folio/shared';
import { getSupabase } from '../../lib/supabase';
import {
  AuthError,
  AuthField,
  AuthScreen,
  AuthSubtitle,
  AuthTitle,
  PrimaryButton,
} from './_components';
import { theme } from '../../theme';

export default function SignInScreen() {
  const s = authStrings.signIn;
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    setError(null);
    const emailErr = validateEmail(email);
    if (emailErr) return setError(emailErr);
    if (!password) return setError('Password is required.');

    setPending(true);
    try {
      const supabase = getSupabase();
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        if (/email not confirmed/i.test(err.message)) {
          setError(authStrings.errors.email_not_verified);
          return;
        }
        setError(authStrings.errors.invalid_credentials);
        return;
      }

      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasVerifiedTotp = factors?.totp?.some((f) => f.status === 'verified');
      if (!hasVerifiedTotp) {
        router.replace('/verify-mfa?enroll=1');
      } else {
        router.replace('/verify-mfa');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen>
      <AuthTitle>{s.title}</AuthTitle>
      <AuthSubtitle>{s.subtitle}</AuthSubtitle>

      <AuthField
        label={s.emailLabel}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <AuthField
        label={s.passwordLabel}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="password"
      />

      <AuthError message={error} />
      <PrimaryButton onPress={onSubmit} label={s.submit} pending={pending} />

      <View style={{ alignItems: 'center' }}>
        <Text style={{ color: theme.colors.inkDim, fontSize: 13 }}>
          {s.noAccount}{' '}
          <Link href="/sign-up" style={{ color: theme.colors.amber }}>
            {s.signUp}
          </Link>
        </Text>
      </View>
    </AuthScreen>
  );
}

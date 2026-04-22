import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import {
  authStrings,
  validateEmail,
  validatePassword,
} from '@folio/shared';
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

export default function SignUpScreen() {
  const s = authStrings.signUp;
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    setError(null);
    const emailErr = validateEmail(email);
    if (emailErr) return setError(emailErr);
    const passErr = validatePassword(password);
    if (passErr) return setError(passErr);

    setPending(true);
    try {
      const { error: err } = await getSupabase().auth.signUp({ email, password });
      if (err) {
        setError(
          /already registered/i.test(err.message)
            ? 'An account already exists for that email.'
            : authStrings.errors.unknown
        );
        return;
      }
      router.replace('/verify-email');
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen>
      <AuthTitle>Join folio.e8e</AuthTitle>
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
        hint={s.passwordHint}
        textContentType="newPassword"
      />

      <AuthError message={error} />
      <PrimaryButton onPress={onSubmit} label={s.submit} pending={pending} />

      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={{ color: theme.colors.inkDim, fontSize: 13 }}>
          {s.haveAccount}{' '}
          <Link href="/sign-in" style={{ color: theme.colors.amber }}>
            {s.signIn}
          </Link>
        </Text>
      </View>
      <Text
        style={{
          color: theme.colors.inkQuiet,
          fontSize: 11,
          textAlign: 'center',
          lineHeight: 16,
        }}
      >
        {s.legal}
      </Text>
    </AuthScreen>
  );
}

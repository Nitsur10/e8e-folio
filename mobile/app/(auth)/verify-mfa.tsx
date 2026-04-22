import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { authStrings, validateTotpCode } from '@folio/shared';
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

export default function VerifyMfaScreen() {
  const params = useLocalSearchParams<{ enroll?: string }>();
  const isEnrollment = params.enroll === '1';
  const copy = isEnrollment ? authStrings.enrollMfa : authStrings.verifyMfa;
  const router = useRouter();

  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isEnrollment) return;
    let cancelled = false;
    (async () => {
      const supabase = getSupabase();
      const { data, error: err } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'folio.e8e',
      });
      if (cancelled) return;
      if (err || !data) {
        setError(authStrings.errors.unknown);
        return;
      }
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
    })();
    return () => {
      cancelled = true;
    };
  }, [isEnrollment]);

  async function onSubmit() {
    setError(null);
    const codeErr = validateTotpCode(code);
    if (codeErr) return setError(codeErr);

    const supabase = getSupabase();
    let fid = factorId;
    if (!fid) {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      fid = factors?.totp?.[0]?.id ?? null;
    }
    if (!fid) {
      setError(authStrings.errors.unknown);
      return;
    }

    setPending(true);
    try {
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: fid,
      });
      if (challengeErr || !challenge) {
        setError(authStrings.errors.mfa_invalid);
        return;
      }
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: fid,
        challengeId: challenge.id,
        code,
      });
      if (verifyErr) {
        setError(authStrings.errors.mfa_invalid);
        return;
      }
      router.replace('/');
    } finally {
      setPending(false);
    }
  }

  const qrUri = qr ? `data:image/svg+xml;utf8,${encodeURIComponent(qr)}` : null;

  return (
    <AuthScreen>
      <AuthTitle>{copy.title}</AuthTitle>
      <AuthSubtitle>{copy.subtitle}</AuthSubtitle>

      {isEnrollment && qrUri ? (
        <View style={styles.qrWrap}>
          <Image source={{ uri: qrUri }} style={styles.qr} />
        </View>
      ) : null}

      {isEnrollment && secret ? (
        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.colors.inkDim, fontSize: 12 }}>
            {authStrings.enrollMfa.secretFallback}
          </Text>
          <Text style={styles.secret}>{secret}</Text>
        </View>
      ) : null}

      <AuthField
        label="6-digit code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={6}
      />

      <AuthError message={error} />
      <PrimaryButton onPress={onSubmit} label={copy.submit} pending={pending} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  qrWrap: {
    alignSelf: 'center',
    backgroundColor: theme.colors.cream,
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
  },
  qr: {
    width: 200,
    height: 200,
  },
  secret: {
    color: theme.colors.ink,
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radii.sm,
    padding: 10,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});

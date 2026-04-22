import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { initSentry } from '../lib/sentry';
import { theme } from '../theme';

// Expo Router replaces the old index.ts entry point, so Sentry has to be
// wired here rather than in registerRootComponent. No-op until
// EXPO_PUBLIC_SENTRY_DSN is set.
initSentry();

function RootNavigator() {
  const { session, loading, mfaRequired } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const segs = segments as unknown as string[];
    const inAuthGroup = segs[0] === '(auth)';
    const onVerifyMfa = segs[1] === 'verify-mfa';
    if (!session && !inAuthGroup) {
      router.replace('/sign-in');
    } else if (session && mfaRequired && !onVerifyMfa) {
      router.replace('/verify-mfa');
    } else if (session && !mfaRequired && inAuthGroup) {
      router.replace('/');
    }
  }, [session, loading, mfaRequired, segments, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

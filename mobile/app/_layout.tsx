import { Stack, usePathname, useRouter } from 'expo-router';
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

const AUTH_PATHS = ['/sign-in', '/sign-up', '/verify-email', '/verify-mfa'];

function RootNavigator() {
  const { session, loading, mfaRequired } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const onAuthPath = AUTH_PATHS.includes(pathname);
    if (!session && !onAuthPath) {
      router.replace('/sign-in');
    } else if (session && mfaRequired && pathname !== '/verify-mfa') {
      router.replace('/verify-mfa');
    } else if (session && !mfaRequired && onAuthPath) {
      router.replace('/');
    }
  }, [session, loading, mfaRequired, pathname, router]);

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

// Ambient types for environment variables accessed via `process.env` in
// React Native. Expo exposes EXPO_PUBLIC_* at runtime via Babel transform;
// TypeScript needs a declaration since @types/node isn't a mobile dep.
declare const process: {
  env: {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_SENTRY_DSN?: string;
    EXPO_PUBLIC_SENTRY_ENABLE_DEV?: string;
  };
};

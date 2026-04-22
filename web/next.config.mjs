import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {};

// Wrap with withSentryConfig so Sentry's webpack hooks load
// `instrumentation-client.ts` (client-side init) and wire source-map upload
// when SENTRY_AUTH_TOKEN is present. Org/project come from SENTRY_ORG /
// SENTRY_PROJECT at build time; upload is a no-op without SENTRY_AUTH_TOKEN.
export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
});

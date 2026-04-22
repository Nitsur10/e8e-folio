export const authStrings = {
  signUp: {
    title: 'Join folio.e8e',
    subtitle: 'Paper trading. Beta. No card required.',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    passwordHint: 'At least 12 characters. Mix letters, numbers, and symbols.',
    submit: 'Create account',
    haveAccount: 'Already have one?',
    signIn: 'Sign in',
    legal:
      'By creating an account you agree this is paper only — no real money moves. Research tool. Not advice.',
  },
  signIn: {
    title: 'Welcome back',
    subtitle: 'Pick up where you left off.',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    submit: 'Sign in',
    forgot: 'Forgot password?',
    noAccount: 'No account yet?',
    signUp: 'Create one',
  },
  verifyEmail: {
    title: 'Check your inbox',
    subtitle: 'We sent a link. Open it to confirm this email.',
    resend: 'Resend link',
    wrongEmail: 'Use a different email',
  },
  verifyMfa: {
    title: 'Enter your 6-digit code',
    subtitle: 'From your authenticator app.',
    submit: 'Verify',
    lostDevice: 'Lost access to your authenticator?',
  },
  enrollMfa: {
    title: 'Turn on second-factor login',
    subtitle:
      'Scan this code with your authenticator app, then enter a code to confirm.',
    secretFallback: 'Or enter this secret manually:',
    skip: 'Skip for now',
    submit: 'Confirm and continue',
  },
  errors: {
    invalid_credentials: 'Email or password is wrong.',
    email_not_verified: 'Verify your email first. Check your inbox.',
    mfa_required: 'Enter your authenticator code.',
    mfa_invalid: 'That code is wrong or expired.',
    rate_limited: 'Too many attempts. Try again in a minute.',
    unknown: 'Something broke. Try again.',
  },
} as const;

export type AuthStringKey = keyof typeof authStrings;

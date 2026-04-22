export type Tier = 'learner' | 'standard' | 'active' | 'pro';

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  mfaEnrolled: boolean;
  tier: Tier | null;
}

export type AuthStatus =
  | { state: 'loading' }
  | { state: 'unauthenticated' }
  | { state: 'unverified'; user: AuthUser }
  | { state: 'mfa_required'; user: AuthUser }
  | { state: 'authenticated'; user: AuthUser };

export type MFAFactorKind = 'totp';

export interface MFAEnrollChallenge {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}

export interface AuthError {
  code:
    | 'invalid_credentials'
    | 'email_not_verified'
    | 'mfa_required'
    | 'mfa_invalid'
    | 'rate_limited'
    | 'unknown';
  message: string;
}

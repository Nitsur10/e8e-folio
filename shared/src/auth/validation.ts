const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return 'Email is required.';
  if (!EMAIL_RE.test(trimmed)) return 'That email address looks off.';
  return null;
}

export function validatePassword(input: string): string | null {
  if (!input) return 'Password is required.';
  if (input.length < 12) return 'At least 12 characters.';
  if (!/[a-zA-Z]/.test(input) || !/\d/.test(input)) {
    return 'Mix letters and numbers.';
  }
  return null;
}

export function validateTotpCode(input: string): string | null {
  const digits = input.replace(/\s/g, '');
  if (!/^\d{6}$/.test(digits)) return 'Enter the 6-digit code.';
  return null;
}

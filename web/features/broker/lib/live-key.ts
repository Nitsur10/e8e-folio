// Alpaca paper keys are documented to start with "PK". Live trading keys
// start with "AK". We reject anything that doesn't match the paper prefix
// so the platform cannot, even accidentally, hold a live-trading credential.
export const ALPACA_PAPER_KEY_PREFIX = 'PK';
export const ALPACA_PAPER_BASE_URL = 'https://paper-api.alpaca.markets';

export class LiveKeyRejectedError extends Error {
  readonly code = 'live_key_rejected';
  constructor(message = 'Live-trading keys are not accepted. Use Alpaca paper keys only.') {
    super(message);
    this.name = 'LiveKeyRejectedError';
  }
}

export function assertPaperKey(keyId: string): void {
  const trimmed = keyId.trim();
  if (!trimmed.startsWith(ALPACA_PAPER_KEY_PREFIX)) {
    throw new LiveKeyRejectedError();
  }
}

export function looksLikePaperKey(keyId: string): boolean {
  return keyId.trim().startsWith(ALPACA_PAPER_KEY_PREFIX);
}

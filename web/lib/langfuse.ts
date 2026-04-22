import { Langfuse } from 'langfuse';

let _client: Langfuse | null = null;

export function getLangfuse(): Langfuse | null {
  if (_client) return _client;
  const { LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_HOST } = process.env;
  if (!LANGFUSE_PUBLIC_KEY || !LANGFUSE_SECRET_KEY) return null;
  _client = new Langfuse({
    publicKey: LANGFUSE_PUBLIC_KEY,
    secretKey: LANGFUSE_SECRET_KEY,
    baseUrl: LANGFUSE_HOST ?? 'https://cloud.langfuse.com',
  });
  return _client;
}

export async function flushLangfuse(): Promise<void> {
  if (_client) await _client.flushAsync();
}

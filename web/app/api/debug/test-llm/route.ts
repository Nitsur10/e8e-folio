import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { flushLangfuse, getLangfuse } from '@/lib/langfuse';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  if (process.env.NODE_ENV === 'production' && process.env.FOLIO_ALLOW_DEBUG_ROUTES !== 'true') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
  }

  const langfuse = getLangfuse();
  const trace = langfuse?.trace({
    name: 'debug.test-llm',
    metadata: { source: 'debug-route' },
  });
  const generation = trace?.generation({
    name: 'anthropic.haiku',
    model: 'claude-haiku-4-5',
    input: 'ping',
  });

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 32,
      messages: [{ role: 'user', content: 'Reply with a single word: pong' }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    generation?.end({ output: text, usage: { input: msg.usage.input_tokens, output: msg.usage.output_tokens } });
    trace?.update({ output: text });
    await flushLangfuse();

    return NextResponse.json({ ok: true, reply: text, langfuse: !!langfuse });
  } catch (err) {
    generation?.end({ output: String(err), level: 'ERROR' });
    await flushLangfuse();
    throw err;
  }
}

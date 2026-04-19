import Anthropic from '@anthropic-ai/sdk';
import type { LLMCompleteFn } from './core/sources/classify';
import { isStubLLM } from './env';

let cached: Anthropic | null = null;
function client(): Anthropic {
  if (cached) return cached;
  cached = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return cached;
}

export const anthropicComplete: LLMCompleteFn = async ({ system, user, maxTokens }) => {
  if (isStubLLM()) {
    return { content: [{ type: 'text', text: '{"kind":"internal","reason":"stubbed"}' }] };
  }
  const res = await client().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
  return {
    content: res.content.map(c => ({
      type: c.type,
      text: (c as { text?: string }).text ?? '',
    })),
  };
};

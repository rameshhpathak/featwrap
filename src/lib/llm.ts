import type { LLMCompleteFn } from './core/sources/classify';
import { isStubLLM } from './env';

// OpenRouter — OpenAI-compatible chat completions endpoint.
// Model: Anthropic Claude Sonnet 4.5 via OpenRouter.
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_ID = 'anthropic/claude-sonnet-4.5';

interface OpenRouterResponse {
  choices?: Array<{
    message?: { role: string; content: string };
    finish_reason?: string;
  }>;
  error?: { message: string; code?: string | number };
}

export const llmComplete: LLMCompleteFn = async ({ system, user, maxTokens }) => {
  if (isStubLLM()) {
    return { content: [{ type: 'text', text: '{"kind":"internal","reason":"stubbed"}' }] };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://featwrap.app',
      'X-Title': 'Featwrap',
    },
    body: JSON.stringify({
      model: MODEL_ID,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as OpenRouterResponse;
  if (data.error) throw new Error(`OpenRouter error: ${data.error.message}`);

  const text = data.choices?.[0]?.message?.content ?? '';
  return { content: [{ type: 'text', text }] };
};

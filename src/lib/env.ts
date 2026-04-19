import { z } from 'zod';

const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  ELEVENLABS_API_KEY: z.string().min(1),
  ELEVENLABS_VOICE_ID: z.string().min(1),
  COMPOSIO_API_KEY: z.string().min(1),
  COMPOSIO_GITHUB_INTEGRATION_ID: z.string().min(1),
  COMPOSIO_REDIRECT_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SESSION_COOKIE_SECRET: z.string().min(32),
  FEATWRAP_STUB_LLM: z.string().optional(),
  FEATWRAP_STUB_VOICE: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  cached = parsed.data;
  return cached;
}

export function isStubLLM() { return process.env.FEATWRAP_STUB_LLM === '1'; }
export function isStubVoice() { return process.env.FEATWRAP_STUB_VOICE === '1'; }

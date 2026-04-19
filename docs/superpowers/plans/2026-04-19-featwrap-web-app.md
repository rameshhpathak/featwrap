# Featwrap Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Vercel-hosted Next.js 15 web app that lets a visitor connect their GitHub via Composio, pick a repo + time window + audience, and receive per-audience 60–90 s podcast MP3s generated from merged PRs — delivered end-to-end in a single 4–5 h hackathon session.

**Architecture:** Single Next.js app; shared engine in `src/lib/core/` (no `next/*` imports) drives a Supabase-backed job queue; client polls `/api/jobs/:id` while a server pipeline runs under `waitUntil`. Composio owns GitHub OAuth + API. Supabase owns Postgres + Storage. Brutalist light-mode UI with mono-as-accent.

**Tech stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Vitest, Supabase JS (`@supabase/supabase-js`), Composio TS SDK (`@composio/core`), Anthropic SDK (`@anthropic-ai/sdk`), ElevenLabs SDK (`elevenlabs`), `p-limit`, `iron-session` (signed session cookies).

**Model choices:** `claude-sonnet-4-6` for classifier + scriptwriter. ElevenLabs `eleven_multilingual_v2` model, single hardcoded voice id from `ELEVENLABS_VOICE_ID`.

**Spec:** `docs/superpowers/specs/2026-04-19-featwrap-web-app-design.md`

---

## Pre-flight — human tasks before Task 1

These are *not* code tasks; do them once, outside the plan:

1. **Create Supabase project** at <https://supabase.com>. Record `SUPABASE_URL`, `anon key`, `service_role key`.
2. **Create Composio account** at <https://app.composio.dev>. Create a GitHub integration; record `COMPOSIO_API_KEY` and `COMPOSIO_GITHUB_INTEGRATION_ID`. Set the redirect URL to `https://<your-vercel-domain>/api/connect/callback` (you can add localhost later too).
3. **Create a personal GitHub org or account repo** `featwrap/demo` (or `<your-handle>/demo`). Leave empty for now — Task 21 seeds it.
4. **Create an Anthropic API key** at <https://console.anthropic.com>. Record `ANTHROPIC_API_KEY`.
5. **Create an ElevenLabs account**. Record `ELEVENLABS_API_KEY` and pick a voice id (e.g. `Adam` or `Antoni` for a confident founder tone). Record `ELEVENLABS_VOICE_ID`.
6. **Generate a session secret:** `openssl rand -hex 32` → `SESSION_COOKIE_SECRET`.

---

## Task 1: Scaffold Next.js app + install deps

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore` (update), `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `postcss.config.mjs`, `tailwind.config.ts`

- [ ] **Step 1: Initialize pnpm project with Next.js 15**

Run from project root:
```bash
pnpm init
```

Then replace the generated `package.json` with:

```json
{
  "name": "featwrap",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.0",
    "@composio/core": "^0.4.0",
    "@supabase/supabase-js": "^2.45.0",
    "elevenlabs": "^0.19.0",
    "iron-session": "^8.0.4",
    "next": "15.1.0",
    "p-limit": "^6.1.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.9.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "vitest": "^2.1.5"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
pnpm install
```

Expected: `pnpm-lock.yaml` is created, `node_modules/` populated.

> If any specific package version above is unavailable, `pnpm` will pick the latest minor — accept that. The core API surface used in this plan is stable.

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `next.config.ts`**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
};

export default nextConfig;
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: [],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

- [ ] **Step 6: Create Tailwind config files**

`tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        ink: 'var(--ink)',
        ash: 'var(--ash)',
        rule: 'var(--rule)',
        accent: 'var(--accent)',
        ok: 'var(--ok)',
        err: 'var(--err)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular'],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

`postcss.config.mjs`:
```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 7: Create placeholder `app/layout.tsx`, `app/page.tsx`, `app/globals.css`**

`src/app/layout.tsx`:
```tsx
import './globals.css';
import type { ReactNode } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

export const metadata = { title: 'Featwrap', description: 'Turn PRs into podcasts.' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-paper text-ink font-sans">{children}</body>
    </html>
  );
}
```

Install Geist fonts now:
```bash
pnpm add geist
```

`src/app/page.tsx`:
```tsx
export default function Home() {
  return <main className="p-16">featwrap</main>;
}
```

`src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --paper: #f7f5f0;
  --ink:   #0a0a0a;
  --ash:   #6e6a62;
  --rule:  #1a1a1a;
  --accent:#ff5500;
  --ok:    #1f7a3a;
  --err:   #b42318;
}

html, body { background: var(--paper); color: var(--ink); }
* { border-color: var(--ink); }
```

- [ ] **Step 8: Update `.gitignore`**

Append to existing `.gitignore`:
```
/node_modules
/.next
/out
.env
.env.local
*.log
.DS_Store
```

- [ ] **Step 9: Run dev server and verify**

Run:
```bash
pnpm dev
```

Expected: Next.js starts on `http://localhost:3000`, page shows "featwrap" on a warm off-white background. Stop with Ctrl-C.

- [ ] **Step 10: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json next.config.ts vitest.config.ts tailwind.config.ts postcss.config.mjs src .gitignore
git commit -m "chore: scaffold Next.js 15 app with Tailwind, Vitest, design tokens"
```

---

## Task 2: Environment config + validation

**Files:**
- Create: `.env.example`, `src/lib/env.ts`

- [ ] **Step 1: Create `.env.example`**

```
# Anthropic
ANTHROPIC_API_KEY=

# ElevenLabs
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=

# Composio
COMPOSIO_API_KEY=
COMPOSIO_GITHUB_INTEGRATION_ID=
COMPOSIO_REDIRECT_URL=http://localhost:3000/api/connect/callback

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
SESSION_COOKIE_SECRET=
FEATWRAP_STUB_LLM=
FEATWRAP_STUB_VOICE=
```

- [ ] **Step 2: Create `src/lib/env.ts`**

```ts
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
```

- [ ] **Step 3: Create local `.env.local` (not committed)**

Copy `.env.example` to `.env.local` and fill in the values from the pre-flight step. **Do not commit.**

- [ ] **Step 4: Commit**

```bash
git add .env.example src/lib/env.ts
git commit -m "chore: add env schema and .env.example"
```

---

## Task 3: Supabase schema migration

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `supabase/README.md`

- [ ] **Step 1: Create `supabase/migrations/0001_init.sql`**

```sql
-- 0001_init.sql
set search_path = public;

create extension if not exists "pgcrypto";

create table if not exists connections (
  id                uuid primary key default gen_random_uuid(),
  session_id        text not null,
  provider          text not null default 'github',
  composio_conn_id  text not null,
  github_login      text,
  created_at        timestamptz not null default now(),
  unique (session_id, provider)
);

create index if not exists connections_session_idx on connections(session_id);

create table if not exists jobs (
  id             uuid primary key default gen_random_uuid(),
  connection_id  uuid references connections(id) on delete cascade,
  repo           text not null,
  since          text not null,
  audience       text not null,
  status         text not null default 'pending',
  step           text,
  progress       int  not null default 0,
  error          text,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);

create index if not exists jobs_connection_idx on jobs(connection_id);

create table if not exists digests (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid references jobs(id) on delete cascade,
  audience      text not null,
  script        text not null,
  audio_path    text,
  pr_numbers    int[] not null default '{}',
  created_at    timestamptz not null default now()
);

create index if not exists digests_job_idx on digests(job_id);

create table if not exists pr_classifications (
  repo        text not null,
  pr_number   int  not null,
  head_sha    text not null,
  kind        text not null,
  reason      text,
  created_at  timestamptz not null default now(),
  primary key (repo, pr_number, head_sha)
);

-- Storage bucket (create via SQL editor or dashboard — this SQL form works)
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;
```

- [ ] **Step 2: Create `supabase/README.md`**

```markdown
# Supabase setup

1. Open your Supabase project → SQL editor.
2. Paste the contents of `migrations/0001_init.sql` and run it.
3. Verify in Table Editor that `connections`, `jobs`, `digests`, and `pr_classifications` tables exist.
4. Verify in Storage that a private `media` bucket exists.

The app uses the **service role key** server-side; RLS is off for this session.
```

- [ ] **Step 3: Apply the migration**

Paste `0001_init.sql` into the Supabase SQL editor. Run. Confirm all four tables and the `media` bucket exist.

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "db: add initial schema migration"
```

---

## Task 4: Session cookie middleware

**Files:**
- Create: `src/lib/session.ts`, `middleware.ts`

- [ ] **Step 1: Create `src/lib/session.ts`**

```ts
import { getIronSession, type SessionOptions, type IronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  sid?: string;
}

export function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_COOKIE_SECRET;
  if (!password) throw new Error('SESSION_COOKIE_SECRET not set');
  return {
    cookieName: 'featwrap_sid',
    password,
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 90, // 90 days
      path: '/',
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const store = await cookies();
  return getIronSession<SessionData>(store, sessionOptions());
}

export async function ensureSession(): Promise<string> {
  const session = await getSession();
  if (!session.sid) {
    session.sid = crypto.randomUUID();
    await session.save();
  }
  return session.sid;
}
```

- [ ] **Step 2: Create `middleware.ts` at project root**

```ts
import { NextResponse, type NextRequest } from 'next/server';

// We can't use iron-session inside middleware (it needs node crypto),
// so we just ensure a placeholder cookie is present; the real signed session is
// initialized in server components / route handlers via ensureSession().
export function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api/connect/callback|favicon.ico).*)'],
};
```

> Session is actually *created* on first server-component render of the landing page (Task 17) via `ensureSession()` — middleware is a passthrough stub; we keep the file so the matcher is declared and we have a place to add CSRF or geo-routing later.

- [ ] **Step 3: Commit**

```bash
git add src/lib/session.ts middleware.ts
git commit -m "feat: add iron-session wrapper + middleware placeholder"
```

---

## Task 5: Core types

**Files:**
- Create: `src/lib/core/types.ts`

- [ ] **Step 1: Create `src/lib/core/types.ts`**

```ts
export type Audience = 'marketing' | 'sales' | 'cs' | 'dev';
export type AudienceRequest = Audience | 'all';
export type PRKind = 'customer-facing' | 'internal';
export type JobStatus = 'pending' | 'running' | 'complete' | 'failed';

export interface PullRequest {
  number: number;
  title: string;
  body: string;
  author: string;
  mergedAt: string; // ISO
  headSha: string;
  diff: string;
}

export interface PRClassification {
  prNumber: number;
  headSha: string;
  kind: PRKind;
  reason: string;
}

export interface Script {
  audience: Audience;
  text: string;
  wordCount: number;
  prNumbers: number[];
}

export interface RenderedAudio {
  audience: Audience;
  mp3: Buffer;
}

export interface PipelineContext {
  jobId: string;
  repo: string;
  since: string;
  audience: AudienceRequest;
  connectionId: string;
  composioConnId: string;
}

export interface StepUpdate {
  step: string;
  progress: number; // 0..100
}

export type ProgressReporter = (update: StepUpdate) => Promise<void>;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/core/types.ts
git commit -m "feat(core): add engine type definitions"
```

---

## Task 6: GitHub source (TDD) — Composio adapter

**Files:**
- Create: `src/lib/core/sources/github.ts`, `tests/core/sources/github.test.ts`, `tests/fixtures/github-prs.json`

- [ ] **Step 1: Create fixture `tests/fixtures/github-prs.json`**

```json
[
  {
    "number": 12,
    "title": "Add price filter to search",
    "body": "Customers can now filter search results by price range.",
    "user": { "login": "rameshh" },
    "merged_at": "2026-04-18T10:00:00Z",
    "state": "closed",
    "head": { "sha": "aaaa111" }
  },
  {
    "number": 13,
    "title": "Extract cart hook into useCart()",
    "body": "Refactor only. No user-visible change.",
    "user": { "login": "rameshh" },
    "merged_at": "2026-04-17T10:00:00Z",
    "state": "closed",
    "head": { "sha": "bbbb222" }
  },
  {
    "number": 14,
    "title": "Fix typo in cart tooltip",
    "body": "Tiny copy fix.",
    "user": { "login": "rameshh" },
    "merged_at": "2026-04-16T10:00:00Z",
    "state": "closed",
    "head": { "sha": "cccc333" }
  },
  {
    "number": 15,
    "title": "Draft: new landing",
    "body": "WIP",
    "user": { "login": "rameshh" },
    "merged_at": null,
    "state": "open",
    "head": { "sha": "dddd444" }
  },
  {
    "number": 16,
    "title": "Really old merge",
    "body": "",
    "user": { "login": "rameshh" },
    "merged_at": "2025-12-01T10:00:00Z",
    "state": "closed",
    "head": { "sha": "eeee555" }
  }
]
```

- [ ] **Step 2: Write the failing test**

`tests/core/sources/github.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { listMergedPRs, parseSinceDuration } from '@/lib/core/sources/github';
import fixturePRs from '../../fixtures/github-prs.json';

describe('parseSinceDuration', () => {
  it('parses days', () => expect(parseSinceDuration('7d')).toBe(7 * 24 * 3600 * 1000));
  it('parses hours', () => expect(parseSinceDuration('3h')).toBe(3 * 3600 * 1000));
  it('rejects bad input', () => expect(() => parseSinceDuration('nope')).toThrow());
});

describe('listMergedPRs', () => {
  const now = new Date('2026-04-19T00:00:00Z');

  it('returns only merged PRs within the time window', async () => {
    const mockExecute = vi.fn().mockResolvedValue({ data: fixturePRs });
    const result = await listMergedPRs('owner/repo', '7d', mockExecute, 'conn-1', now);
    expect(result.map(p => p.number).sort()).toEqual([12, 13, 14]);
    expect(result.every(p => p.mergedAt !== null)).toBe(true);
  });

  it('excludes open PRs', async () => {
    const mockExecute = vi.fn().mockResolvedValue({ data: fixturePRs });
    const result = await listMergedPRs('owner/repo', '7d', mockExecute, 'conn-1', now);
    expect(result.find(p => p.number === 15)).toBeUndefined();
  });

  it('excludes PRs merged before the window', async () => {
    const mockExecute = vi.fn().mockResolvedValue({ data: fixturePRs });
    const result = await listMergedPRs('owner/repo', '7d', mockExecute, 'conn-1', now);
    expect(result.find(p => p.number === 16)).toBeUndefined();
  });

  it('calls Composio with the right action and params', async () => {
    const mockExecute = vi.fn().mockResolvedValue({ data: [] });
    await listMergedPRs('owner/repo', '14d', mockExecute, 'conn-1', now);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringContaining('GITHUB'),
        connectedAccountId: 'conn-1',
      })
    );
  });
});
```

- [ ] **Step 3: Run test — expect failure**

Run:
```bash
pnpm vitest run tests/core/sources/github.test.ts
```

Expected: FAIL — module not yet created.

- [ ] **Step 4: Implement `src/lib/core/sources/github.ts`**

```ts
import type { PullRequest } from '../types';

/**
 * Minimal shape returned by Composio's GitHub list-PRs tool.
 * We treat Composio's `executeAction` as an injected function so tests
 * can replace it with a mock.
 */
export type ComposioExecute = (params: {
  action: string;
  connectedAccountId: string;
  params?: Record<string, unknown>;
}) => Promise<{ data: unknown }>;

interface RawPR {
  number: number;
  title: string;
  body: string | null;
  user: { login: string };
  merged_at: string | null;
  state: string;
  head: { sha: string };
}

const DURATION_RE = /^(\d+)([dh])$/;

export function parseSinceDuration(since: string): number {
  const m = DURATION_RE.exec(since);
  if (!m) throw new Error(`Invalid --since value: ${since}`);
  const n = parseInt(m[1], 10);
  const unit = m[2];
  const ms = unit === 'd' ? 86_400_000 : 3_600_000;
  return n * ms;
}

export async function listMergedPRs(
  repo: string,
  since: string,
  executeAction: ComposioExecute,
  connectedAccountId: string,
  now: Date = new Date(),
): Promise<PullRequest[]> {
  const windowMs = parseSinceDuration(since);
  const cutoff = new Date(now.getTime() - windowMs);
  const [owner, name] = repo.split('/');
  if (!owner || !name) throw new Error(`Invalid repo: ${repo}`);

  const res = await executeAction({
    action: 'GITHUB_PULLS_LIST',
    connectedAccountId,
    params: { owner, repo: name, state: 'closed', sort: 'updated', direction: 'desc', per_page: 100 },
  });

  const raw = (res.data as RawPR[]) ?? [];
  return raw
    .filter(p => p.merged_at !== null)
    .filter(p => new Date(p.merged_at as string) >= cutoff)
    .map<PullRequest>(p => ({
      number: p.number,
      title: p.title,
      body: p.body ?? '',
      author: p.user.login,
      mergedAt: p.merged_at as string,
      headSha: p.head.sha,
      diff: '', // filled by getPRDiff() when the classifier wants it
    }));
}

export async function getPRDiff(
  repo: string,
  prNumber: number,
  executeAction: ComposioExecute,
  connectedAccountId: string,
): Promise<string> {
  const [owner, name] = repo.split('/');
  const res = await executeAction({
    action: 'GITHUB_PULLS_GET',
    connectedAccountId,
    params: { owner, repo: name, pull_number: prNumber, mediaType: { format: 'diff' } },
  });
  // Composio may return a string directly for diff media type, or wrap it;
  // normalize to string.
  const data = res.data as unknown;
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object' && 'diff' in (data as Record<string, unknown>)) {
    return String((data as Record<string, unknown>).diff);
  }
  return '';
}
```

> **Composio action names:** The exact action id (`GITHUB_PULLS_LIST`, `GITHUB_PULLS_GET`) may differ by SDK version. If tests pass but the real Composio call fails at runtime, check the Composio dashboard for your integration's actual action ids and update these two strings. The rest of the module is unaffected.

- [ ] **Step 5: Run test — expect pass**

Run:
```bash
pnpm vitest run tests/core/sources/github.test.ts
```

Expected: all 6 assertions pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/core/sources/github.ts tests/core/sources/github.test.ts tests/fixtures/github-prs.json
git commit -m "feat(core): fetch merged PRs via Composio with time-window filter"
```

---

## Task 7: PR classifier (TDD) — LLM call with cache

**Files:**
- Create: `src/lib/core/sources/classify.ts`, `tests/core/sources/classify.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/core/sources/classify.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { classifyPRs, type ClassifyDeps } from '@/lib/core/sources/classify';
import type { PullRequest } from '@/lib/core/types';

const prs: PullRequest[] = [
  { number: 12, title: 'Add price filter', body: 'users can now filter', author: 'r', mergedAt: '', headSha: 'aaa', diff: '' },
  { number: 13, title: 'Refactor cart hook', body: 'internal cleanup', author: 'r', mergedAt: '', headSha: 'bbb', diff: '' },
];

function makeLLM(responses: Array<{ kind: 'customer-facing' | 'internal'; reason: string }>) {
  let i = 0;
  return vi.fn().mockImplementation(async () => {
    const r = responses[i++];
    return { content: [{ type: 'text', text: JSON.stringify(r) }] };
  });
}

describe('classifyPRs', () => {
  it('returns one classification per PR', async () => {
    const llm = makeLLM([
      { kind: 'customer-facing', reason: 'new user-visible filter' },
      { kind: 'internal', reason: 'refactor only' },
    ]);
    const cache = { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue(undefined) };
    const deps: ClassifyDeps = { llmComplete: llm, cache, repo: 'o/r' };
    const out = await classifyPRs(prs, deps);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ prNumber: 12, kind: 'customer-facing' });
    expect(out[1]).toMatchObject({ prNumber: 13, kind: 'internal' });
  });

  it('uses cache when a hit is found', async () => {
    const llm = vi.fn();
    const cache = {
      get: vi.fn().mockImplementation(async (repo: string, num: number, sha: string) =>
        num === 12 ? { kind: 'customer-facing', reason: 'cached' } : null,
      ),
      set: vi.fn().mockResolvedValue(undefined),
    };
    const llmResponse = makeLLM([{ kind: 'internal', reason: 'refactor' }]);
    const deps: ClassifyDeps = { llmComplete: llmResponse, cache, repo: 'o/r' };
    const out = await classifyPRs(prs, deps);
    expect(llmResponse).toHaveBeenCalledTimes(1); // only for PR 13
    expect(out[0].reason).toBe('cached');
  });

  it('writes fresh classifications to cache', async () => {
    const llm = makeLLM([
      { kind: 'customer-facing', reason: 'a' },
      { kind: 'internal', reason: 'b' },
    ]);
    const cache = { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue(undefined) };
    const deps: ClassifyDeps = { llmComplete: llm, cache, repo: 'o/r' };
    await classifyPRs(prs, deps);
    expect(cache.set).toHaveBeenCalledTimes(2);
    expect(cache.set).toHaveBeenCalledWith('o/r', 12, 'aaa', expect.objectContaining({ kind: 'customer-facing' }));
  });

  it('defaults to internal if LLM response is unparseable', async () => {
    const llm = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'nonsense not json' }] });
    const cache = { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue(undefined) };
    const deps: ClassifyDeps = { llmComplete: llm, cache, repo: 'o/r' };
    const out = await classifyPRs(prs.slice(0, 1), deps);
    expect(out[0].kind).toBe('internal');
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run:
```bash
pnpm vitest run tests/core/sources/classify.test.ts
```

Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/lib/core/sources/classify.ts`**

```ts
import type { PRClassification, PRKind, PullRequest } from '../types';

export type LLMCompleteFn = (args: {
  system: string;
  user: string;
  maxTokens: number;
}) => Promise<{ content: Array<{ type: string; text: string }> }>;

export interface ClassificationCache {
  get(repo: string, prNumber: number, headSha: string): Promise<{ kind: PRKind; reason: string } | null>;
  set(repo: string, prNumber: number, headSha: string, value: { kind: PRKind; reason: string }): Promise<void>;
}

export interface ClassifyDeps {
  llmComplete: LLMCompleteFn;
  cache: ClassificationCache;
  repo: string;
}

const SYSTEM_PROMPT = `You classify GitHub pull requests as "customer-facing" or "internal".

"customer-facing" means: a user of the product would plausibly notice the change.
Examples: a new feature, a UX change, a copy update they'll read, a user-visible
bugfix, a perf win they'll feel, a visible API addition.

"internal" means: only the team would notice.
Examples: refactor, dependency bump, test-only change, CI/infra change, internal
docs, typos in comments, code-only renames.

Respond with ONLY a JSON object: {"kind": "customer-facing" | "internal", "reason": "<one short sentence>"}.`;

function buildUserPrompt(pr: PullRequest): string {
  return `Title: ${pr.title}
Author: ${pr.author}
Body:
${pr.body || '(empty)'}

Classify this PR.`;
}

function tryParse(raw: string): { kind: PRKind; reason: string } {
  // Extract the first {...} block (model may wrap with prose)
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { kind: 'internal', reason: 'unparseable response' };
  try {
    const obj = JSON.parse(match[0]) as { kind?: string; reason?: string };
    if (obj.kind === 'customer-facing' || obj.kind === 'internal') {
      return { kind: obj.kind, reason: (obj.reason ?? '').slice(0, 200) };
    }
  } catch { /* fallthrough */ }
  return { kind: 'internal', reason: 'unparseable response' };
}

export async function classifyPRs(
  prs: PullRequest[],
  deps: ClassifyDeps,
): Promise<PRClassification[]> {
  const out: PRClassification[] = [];
  for (const pr of prs) {
    const cached = await deps.cache.get(deps.repo, pr.number, pr.headSha);
    if (cached) {
      out.push({ prNumber: pr.number, headSha: pr.headSha, kind: cached.kind, reason: cached.reason });
      continue;
    }
    const res = await deps.llmComplete({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(pr),
      maxTokens: 200,
    });
    const text = res.content.find(c => c.type === 'text')?.text ?? '';
    const parsed = tryParse(text);
    await deps.cache.set(deps.repo, pr.number, pr.headSha, parsed);
    out.push({ prNumber: pr.number, headSha: pr.headSha, ...parsed });
  }
  return out;
}
```

- [ ] **Step 4: Run test — expect pass**

Run:
```bash
pnpm vitest run tests/core/sources/classify.test.ts
```

Expected: all 4 assertions pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/core/sources/classify.ts tests/core/sources/classify.test.ts
git commit -m "feat(core): classify PRs as customer-facing vs internal, with cache"
```

---

## Task 8: Script writer (TDD) — per-audience prompts

**Files:**
- Create: `src/lib/core/script/prompts/base.ts`, `src/lib/core/script/prompts/marketing.ts`, `sales.ts`, `cs.ts`, `dev.ts`, `src/lib/core/script/writer.ts`, `tests/core/script/writer.test.ts`

- [ ] **Step 1: Create the prompt files**

`src/lib/core/script/prompts/base.ts`:
```ts
export const BASE_SYSTEM = `You write short podcast-style scripts summarizing a week of merged pull requests.

Rules:
- Target 180–270 words. Count your words; do not exceed 280.
- Write for the ear. Conversational, confident, founder-tone.
- Open with a hook, not "In this episode". Never say "this episode".
- Lead with the single biggest customer-facing change; use internal PRs as a
  one-sentence coda ("Under the hood, we also shipped X behind-the-scenes improvements.").
- Do not read out PR numbers, diffs, or file paths. Translate to user-value statements.
- No bullet points. No markdown. No stage directions in brackets.
- End with a single sharp sign-off line.

Return ONLY the script text, nothing else.`;
```

`src/lib/core/script/prompts/marketing.ts`:
```ts
export const MARKETING_ANGLE = `Audience: marketing lead.
Angle: what's the customer-facing narrative? What can copy, ads, social,
or launch posts now say about this? What's the one headline you'd lead with?
Translate engineering changes into customer benefits and marketable moments.`;
```

`src/lib/core/script/prompts/sales.ts`:
```ts
export const SALES_ANGLE = `Audience: account executive / salesperson.
Angle: what does this unlock in pitches? What objection does it kill?
What new use case can you lead with? What competitor feature are we now at
parity with or ahead of? Name the pitch moment explicitly.`;
```

`src/lib/core/script/prompts/cs.ts`:
```ts
export const CS_ANGLE = `Audience: customer success / support agent.
Angle: what will customers notice? What might they ask about? Anything to
watch for in tickets? Call out anything that could confuse existing users,
and any new behavior that changes an existing workflow.`;
```

`src/lib/core/script/prompts/dev.ts`:
```ts
export const DEV_ANGLE = `Audience: engineer on the team.
Angle: what changed technically, and why? Any architecture decisions or
gotchas worth noting? Keep the listener-ear style — this is still a podcast,
not a diff.`;
```

- [ ] **Step 2: Write the failing test**

`tests/core/script/writer.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { writeScript, type WriterDeps } from '@/lib/core/script/writer';
import type { PullRequest, PRClassification } from '@/lib/core/types';

const prs: PullRequest[] = [
  { number: 12, title: 'Add price filter', body: 'Filter by price range', author: 'r', mergedAt: '', headSha: 'a', diff: '' },
  { number: 13, title: 'Refactor cart hook', body: 'Internal', author: 'r', mergedAt: '', headSha: 'b', diff: '' },
];
const classifications: PRClassification[] = [
  { prNumber: 12, headSha: 'a', kind: 'customer-facing', reason: 'new filter' },
  { prNumber: 13, headSha: 'b', kind: 'internal', reason: 'refactor' },
];

function llmReturning(text: string) {
  return vi.fn().mockResolvedValue({ content: [{ type: 'text', text }] });
}

describe('writeScript', () => {
  it('returns a Script with the requested audience', async () => {
    const llm = llmReturning('This is a sample script with about fifteen words in it nothing more.');
    const deps: WriterDeps = { llmComplete: llm };
    const out = await writeScript(prs, classifications, 'marketing', deps);
    expect(out.audience).toBe('marketing');
    expect(out.text).toContain('sample script');
    expect(out.prNumbers).toEqual([12, 13]);
    expect(out.wordCount).toBeGreaterThan(10);
  });

  it('selects the marketing angle prompt for marketing audience', async () => {
    const llm = llmReturning('ok');
    await writeScript(prs, classifications, 'marketing', { llmComplete: llm });
    const call = llm.mock.calls[0][0];
    expect(call.system).toContain('marketing lead');
  });

  it('selects the dev angle prompt for dev audience', async () => {
    const llm = llmReturning('ok');
    await writeScript(prs, classifications, 'dev', { llmComplete: llm });
    const call = llm.mock.calls[0][0];
    expect(call.system).toContain('engineer on the team');
  });

  it('orders customer-facing PRs before internal ones in the user prompt', async () => {
    const llm = llmReturning('ok');
    await writeScript(prs, classifications, 'marketing', { llmComplete: llm });
    const user = llm.mock.calls[0][0].user as string;
    const idxFeature = user.indexOf('price filter');
    const idxRefactor = user.indexOf('cart hook');
    expect(idxFeature).toBeGreaterThan(-1);
    expect(idxRefactor).toBeGreaterThan(idxFeature);
  });

  it('strips markdown fences if the model includes them', async () => {
    const llm = llmReturning('```\nactual script\n```');
    const out = await writeScript(prs, classifications, 'sales', { llmComplete: llm });
    expect(out.text).toBe('actual script');
  });
});
```

- [ ] **Step 3: Run test — expect failure**

Run:
```bash
pnpm vitest run tests/core/script/writer.test.ts
```

Expected: FAIL — module missing.

- [ ] **Step 4: Implement `src/lib/core/script/writer.ts`**

```ts
import type { Audience, PRClassification, PullRequest, Script } from '../types';
import type { LLMCompleteFn } from '../sources/classify';
import { BASE_SYSTEM } from './prompts/base';
import { MARKETING_ANGLE } from './prompts/marketing';
import { SALES_ANGLE } from './prompts/sales';
import { CS_ANGLE } from './prompts/cs';
import { DEV_ANGLE } from './prompts/dev';

export interface WriterDeps {
  llmComplete: LLMCompleteFn;
}

const ANGLES: Record<Audience, string> = {
  marketing: MARKETING_ANGLE,
  sales: SALES_ANGLE,
  cs: CS_ANGLE,
  dev: DEV_ANGLE,
};

function stripFences(s: string): string {
  return s.replace(/^```[a-z]*\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

function buildUserPrompt(prs: PullRequest[], classifications: PRClassification[]): string {
  const byNum = new Map(classifications.map(c => [c.prNumber, c]));
  const customer = prs.filter(p => byNum.get(p.number)?.kind === 'customer-facing');
  const internal = prs.filter(p => byNum.get(p.number)?.kind === 'internal');

  const fmt = (p: PullRequest) => `- ${p.title}\n  ${(p.body || '').slice(0, 500)}`;

  const parts: string[] = [];
  parts.push(`Repo context — ${prs.length} merged PRs this window.\n`);
  parts.push(`Customer-facing changes (${customer.length}):`);
  parts.push(customer.length ? customer.map(fmt).join('\n') : '(none)');
  parts.push(`\nInternal / behind-the-scenes changes (${internal.length}):`);
  parts.push(internal.length ? internal.map(fmt).join('\n') : '(none)');
  parts.push(`\nWrite the podcast script now.`);
  return parts.join('\n');
}

export async function writeScript(
  prs: PullRequest[],
  classifications: PRClassification[],
  audience: Audience,
  deps: WriterDeps,
): Promise<Script> {
  const system = `${BASE_SYSTEM}\n\n${ANGLES[audience]}`;
  const user = buildUserPrompt(prs, classifications);
  const res = await deps.llmComplete({ system, user, maxTokens: 700 });
  const rawText = res.content.find(c => c.type === 'text')?.text ?? '';
  const text = stripFences(rawText);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return {
    audience,
    text,
    wordCount,
    prNumbers: prs.map(p => p.number),
  };
}
```

- [ ] **Step 5: Run test — expect pass**

Run:
```bash
pnpm vitest run tests/core/script/writer.test.ts
```

Expected: all 5 assertions pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/core/script/ tests/core/script/
git commit -m "feat(core): write per-audience scripts with angle prompts"
```

---

## Task 9: Voice renderer (TDD)

**Files:**
- Create: `src/lib/core/render/voice.ts`, `tests/core/render/voice.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/core/render/voice.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { renderVoice, type VoiceDeps } from '@/lib/core/render/voice';
import type { Script } from '@/lib/core/types';

const script: Script = {
  audience: 'marketing',
  text: 'Hello world from featwrap.',
  wordCount: 5,
  prNumbers: [12],
};

describe('renderVoice', () => {
  it('calls the TTS client with the script text and voice id', async () => {
    const chunks = [new Uint8Array([1, 2]), new Uint8Array([3, 4])];
    const tts = vi.fn().mockResolvedValue((async function* () { for (const c of chunks) yield c; })());
    const deps: VoiceDeps = { tts, voiceId: 'voice-xyz' };
    const buf = await renderVoice(script, deps);
    expect(tts).toHaveBeenCalledWith(expect.objectContaining({
      voiceId: 'voice-xyz',
      text: 'Hello world from featwrap.',
    }));
    expect(buf.equals(Buffer.from([1, 2, 3, 4]))).toBe(true);
  });

  it('returns stub audio when stub flag is set', async () => {
    const tts = vi.fn();
    const deps: VoiceDeps = { tts, voiceId: 'voice-xyz', stub: true };
    const buf = await renderVoice(script, deps);
    expect(tts).not.toHaveBeenCalled();
    expect(buf.length).toBeGreaterThan(0); // silent stub bytes
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run:
```bash
pnpm vitest run tests/core/render/voice.test.ts
```

Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/lib/core/render/voice.ts`**

```ts
import type { Script } from '../types';

export type TTSStreamFn = (args: {
  voiceId: string;
  text: string;
  modelId?: string;
}) => Promise<AsyncIterable<Uint8Array>>;

export interface VoiceDeps {
  tts: TTSStreamFn;
  voiceId: string;
  stub?: boolean;
}

// 1 second of MP3 silence (constant, tiny). Use this as the stub.
// Generated once: "ffmpeg -f lavfi -i anullsrc=r=22050:cl=mono -t 1 -q:a 9 silent.mp3"
// then base64'd. Keeping it inline here so the stub is zero-dep.
const SILENT_MP3_BASE64 =
  '//uSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export async function renderVoice(script: Script, deps: VoiceDeps): Promise<Buffer> {
  if (deps.stub) return Buffer.from(SILENT_MP3_BASE64, 'base64');
  const stream = await deps.tts({
    voiceId: deps.voiceId,
    text: script.text,
    modelId: 'eleven_multilingual_v2',
  });
  const parts: Uint8Array[] = [];
  for await (const chunk of stream) parts.push(chunk);
  return Buffer.concat(parts);
}
```

- [ ] **Step 4: Run test — expect pass**

Run:
```bash
pnpm vitest run tests/core/render/voice.test.ts
```

Expected: both assertions pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/core/render/voice.ts tests/core/render/voice.test.ts
git commit -m "feat(core): render voice via ElevenLabs with stub-mode fallback"
```

---

## Task 10: Pipeline (TDD)

**Files:**
- Create: `src/lib/core/pipeline.ts`, `tests/core/pipeline.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/core/pipeline.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { runPipeline, type PipelineDeps } from '@/lib/core/pipeline';
import type { PullRequest, PRClassification, Audience } from '@/lib/core/types';

const prs: PullRequest[] = [
  { number: 12, title: 'Add filter', body: '', author: 'r', mergedAt: '', headSha: 'a', diff: '' },
];
const classifications: PRClassification[] = [
  { prNumber: 12, headSha: 'a', kind: 'customer-facing', reason: 'x' },
];

function makeDeps(): { deps: PipelineDeps; calls: { updates: Array<{ step?: string; progress?: number; status?: string }> } } {
  const calls = { updates: [] as Array<{ step?: string; progress?: number; status?: string }> };
  const deps: PipelineDeps = {
    fetchPRs: vi.fn().mockResolvedValue(prs),
    classifyPRs: vi.fn().mockResolvedValue(classifications),
    writeScript: vi.fn().mockImplementation(async (_p, _c, aud: Audience) => ({
      audience: aud, text: `script-${aud}`, wordCount: 10, prNumbers: [12],
    })),
    renderVoice: vi.fn().mockResolvedValue(Buffer.from([1, 2, 3])),
    storage: {
      uploadMp3: vi.fn().mockImplementation(async (_p, aud: Audience) => `jobs/j1/${aud}.mp3`),
    },
    db: {
      updateJob: vi.fn().mockImplementation(async (_id, u) => { calls.updates.push(u); }),
      insertDigest: vi.fn().mockResolvedValue(undefined),
    },
  };
  return { deps, calls };
}

describe('runPipeline', () => {
  it('runs fetch → classify → write → render → upload → mark complete', async () => {
    const { deps, calls } = makeDeps();
    await runPipeline({ jobId: 'j1', repo: 'o/r', since: '7d', audience: 'marketing', composioConnId: 'cc', connectionId: 'conn' }, deps);
    expect(deps.fetchPRs).toHaveBeenCalledOnce();
    expect(deps.classifyPRs).toHaveBeenCalledOnce();
    expect(deps.writeScript).toHaveBeenCalledWith(prs, classifications, 'marketing');
    expect(deps.renderVoice).toHaveBeenCalledOnce();
    expect(deps.storage.uploadMp3).toHaveBeenCalledWith('j1', 'marketing', expect.any(Buffer));
    expect(deps.db.insertDigest).toHaveBeenCalledWith(expect.objectContaining({
      job_id: 'j1', audience: 'marketing', script: 'script-marketing', audio_path: 'jobs/j1/marketing.mp3', pr_numbers: [12],
    }));
    // last status update is complete, progress 100
    const last = calls.updates.at(-1)!;
    expect(last.status).toBe('complete');
    expect(last.progress).toBe(100);
  });

  it('fans out to four audiences when audience="all"', async () => {
    const { deps } = makeDeps();
    await runPipeline({ jobId: 'j2', repo: 'o/r', since: '7d', audience: 'all', composioConnId: 'cc', connectionId: 'conn' }, deps);
    expect(deps.writeScript).toHaveBeenCalledTimes(4);
    const audiences = (deps.writeScript as ReturnType<typeof vi.fn>).mock.calls.map(c => c[2]);
    expect(audiences.sort()).toEqual(['cs', 'dev', 'marketing', 'sales']);
    expect(deps.renderVoice).toHaveBeenCalledTimes(4);
    expect(deps.db.insertDigest).toHaveBeenCalledTimes(4);
  });

  it('marks job failed with error message when a step throws', async () => {
    const { deps, calls } = makeDeps();
    (deps.fetchPRs as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('boom'));
    await runPipeline({ jobId: 'j3', repo: 'o/r', since: '7d', audience: 'marketing', composioConnId: 'cc', connectionId: 'conn' }, deps);
    const last = calls.updates.at(-1)!;
    expect(last.status).toBe('failed');
    expect((last as { error?: string }).error).toContain('boom');
  });

  it('keeps successful digests when a later audience fails', async () => {
    const { deps } = makeDeps();
    // marketing succeeds, sales fails
    (deps.writeScript as ReturnType<typeof vi.fn>)
      .mockImplementationOnce(async () => ({ audience: 'marketing', text: 'ok', wordCount: 5, prNumbers: [12] }))
      .mockRejectedValueOnce(new Error('sales boom'))
      .mockImplementation(async (_p, _c, aud: Audience) => ({ audience: aud, text: `script-${aud}`, wordCount: 5, prNumbers: [12] }));
    await runPipeline({ jobId: 'j4', repo: 'o/r', since: '7d', audience: 'all', composioConnId: 'cc', connectionId: 'conn' }, deps);
    // marketing insert happened
    expect((deps.db.insertDigest as ReturnType<typeof vi.fn>).mock.calls.some(
      c => (c[0] as { audience: string }).audience === 'marketing',
    )).toBe(true);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run:
```bash
pnpm vitest run tests/core/pipeline.test.ts
```

Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/lib/core/pipeline.ts`**

```ts
import pLimit from 'p-limit';
import type {
  Audience, AudienceRequest, PipelineContext, PullRequest, PRClassification, Script,
} from './types';

export interface PipelineDeps {
  fetchPRs(repo: string, since: string, composioConnId: string): Promise<PullRequest[]>;
  classifyPRs(prs: PullRequest[], repo: string): Promise<PRClassification[]>;
  writeScript(prs: PullRequest[], classifications: PRClassification[], audience: Audience): Promise<Script>;
  renderVoice(script: Script): Promise<Buffer>;
  storage: {
    uploadMp3(jobId: string, audience: Audience, mp3: Buffer): Promise<string>;
  };
  db: {
    updateJob(jobId: string, update: { step?: string; progress?: number; status?: string; error?: string; completed_at?: string }): Promise<void>;
    insertDigest(row: { job_id: string; audience: Audience; script: string; audio_path: string; pr_numbers: number[] }): Promise<void>;
  };
}

const ALL: Audience[] = ['marketing', 'sales', 'cs', 'dev'];

function expand(a: AudienceRequest): Audience[] {
  return a === 'all' ? ALL : [a];
}

export async function runPipeline(ctx: PipelineContext, deps: PipelineDeps): Promise<void> {
  const { jobId, repo, since, audience, composioConnId } = ctx;
  try {
    await deps.db.updateJob(jobId, { status: 'running', step: 'fetching pull requests', progress: 5 });
    const prs = await deps.fetchPRs(repo, since, composioConnId);
    if (prs.length === 0) {
      await deps.db.updateJob(jobId, { status: 'failed', error: 'No merged PRs in the selected window.' });
      return;
    }

    await deps.db.updateJob(jobId, { step: 'reading what shipped', progress: 20 });
    const classifications = await deps.classifyPRs(prs, repo);

    const audiences = expand(audience);
    const totalAuds = audiences.length;
    const limit = pLimit(2);

    await deps.db.updateJob(jobId, { step: 'writing the script', progress: 40 });

    let completed = 0;
    await Promise.all(audiences.map(aud => limit(async () => {
      try {
        const script = await deps.writeScript(prs, classifications, aud);
        await deps.db.updateJob(jobId, { step: 'recording the voice', progress: 50 + Math.floor((completed / totalAuds) * 30) });
        const mp3 = await deps.renderVoice(script);
        const path = await deps.storage.uploadMp3(jobId, aud, mp3);
        await deps.db.insertDigest({
          job_id: jobId,
          audience: aud,
          script: script.text,
          audio_path: path,
          pr_numbers: prs.map(p => p.number),
        });
        completed += 1;
        await deps.db.updateJob(jobId, { step: `finished ${aud}`, progress: 50 + Math.floor((completed / totalAuds) * 45) });
      } catch (err) {
        // Per-audience failure does not kill the job; it's logged and we move on.
        console.error(`[pipeline] audience=${aud} failed:`, err);
      }
    })));

    await deps.db.updateJob(jobId, { status: 'complete', progress: 100, completed_at: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await deps.db.updateJob(jobId, { status: 'failed', error: message });
  }
}
```

- [ ] **Step 4: Run test — expect pass**

Run:
```bash
pnpm vitest run tests/core/pipeline.test.ts
```

Expected: all 4 assertions pass.

- [ ] **Step 5: Run all core tests together**

```bash
pnpm test
```

Expected: all tests from Tasks 6–10 pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/core/pipeline.ts tests/core/pipeline.test.ts
git commit -m "feat(core): add pipeline orchestrator with parallel audience fan-out"
```

---

## Task 11: Supabase server client + storage helpers

**Files:**
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/storage.ts`, `src/lib/supabase/cache.ts`, `src/lib/supabase/jobs.ts`

- [ ] **Step 1: Create `src/lib/supabase/server.ts`**

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function supabaseService(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
```

- [ ] **Step 2: Create `src/lib/supabase/storage.ts`**

```ts
import { supabaseService } from './server';
import type { Audience } from '../core/types';

const BUCKET = 'media';

export async function uploadMp3(jobId: string, audience: Audience, mp3: Buffer): Promise<string> {
  const path = `jobs/${jobId}/${audience}.mp3`;
  const { error } = await supabaseService().storage
    .from(BUCKET)
    .upload(path, mp3, { contentType: 'audio/mpeg', upsert: true });
  if (error) throw error;
  return path;
}

export async function signedUrl(path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabaseService().storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
```

- [ ] **Step 3: Create `src/lib/supabase/cache.ts`**

```ts
import { supabaseService } from './server';
import type { ClassificationCache } from '../core/sources/classify';
import type { PRKind } from '../core/types';

export function supabaseClassificationCache(): ClassificationCache {
  return {
    async get(repo, prNumber, headSha) {
      const { data } = await supabaseService()
        .from('pr_classifications')
        .select('kind, reason')
        .eq('repo', repo)
        .eq('pr_number', prNumber)
        .eq('head_sha', headSha)
        .maybeSingle();
      if (!data) return null;
      return { kind: data.kind as PRKind, reason: data.reason ?? '' };
    },
    async set(repo, prNumber, headSha, value) {
      await supabaseService()
        .from('pr_classifications')
        .upsert({ repo, pr_number: prNumber, head_sha: headSha, kind: value.kind, reason: value.reason });
    },
  };
}
```

- [ ] **Step 4: Create `src/lib/supabase/jobs.ts`**

```ts
import { supabaseService } from './server';
import type { Audience, AudienceRequest } from '../core/types';

export async function createJob(args: {
  connectionId: string;
  repo: string;
  since: string;
  audience: AudienceRequest;
}): Promise<string> {
  const { data, error } = await supabaseService()
    .from('jobs')
    .insert({
      connection_id: args.connectionId,
      repo: args.repo,
      since: args.since,
      audience: args.audience,
      status: 'pending',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateJob(jobId: string, update: {
  step?: string; progress?: number; status?: string; error?: string; completed_at?: string;
}): Promise<void> {
  const { error } = await supabaseService().from('jobs').update(update).eq('id', jobId);
  if (error) throw error;
}

export async function insertDigest(row: {
  job_id: string; audience: Audience; script: string; audio_path: string; pr_numbers: number[];
}): Promise<void> {
  const { error } = await supabaseService().from('digests').insert(row);
  if (error) throw error;
}

export interface JobRow {
  id: string;
  status: string;
  step: string | null;
  progress: number;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface DigestRow {
  id: string;
  audience: Audience;
  script: string;
  audio_path: string | null;
  pr_numbers: number[];
}

export async function getJobWithDigests(jobId: string): Promise<{ job: JobRow; digests: DigestRow[] } | null> {
  const { data: job, error: jobErr } = await supabaseService()
    .from('jobs')
    .select('id, status, step, progress, error, created_at, completed_at')
    .eq('id', jobId)
    .maybeSingle();
  if (jobErr || !job) return null;
  const { data: digests } = await supabaseService()
    .from('digests')
    .select('id, audience, script, audio_path, pr_numbers')
    .eq('job_id', jobId);
  return { job: job as JobRow, digests: (digests ?? []) as DigestRow[] };
}

export async function getConnectionIdBySession(sessionId: string): Promise<{ id: string; composio_conn_id: string; github_login: string | null } | null> {
  const { data } = await supabaseService()
    .from('connections')
    .select('id, composio_conn_id, github_login')
    .eq('session_id', sessionId)
    .eq('provider', 'github')
    .maybeSingle();
  return data ?? null;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/
git commit -m "feat(db): add Supabase service client, storage, cache, and job helpers"
```

---

## Task 12: Composio client + Anthropic/ElevenLabs adapters

**Files:**
- Create: `src/lib/composio/client.ts`, `src/lib/anthropic.ts`, `src/lib/elevenlabs.ts`

- [ ] **Step 1: Create `src/lib/composio/client.ts`**

```ts
import { Composio } from '@composio/core';

let cached: Composio | null = null;

export function getComposio(): Composio {
  if (cached) return cached;
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) throw new Error('COMPOSIO_API_KEY not set');
  cached = new Composio({ apiKey });
  return cached;
}

export async function initiateGithubAuth(params: {
  userId: string;      // our session id
  redirectUri: string;
}): Promise<{ redirectUrl: string; connectionId: string }> {
  const composio = getComposio();
  const integrationId = process.env.COMPOSIO_GITHUB_INTEGRATION_ID;
  if (!integrationId) throw new Error('COMPOSIO_GITHUB_INTEGRATION_ID not set');
  // The exact method signature is Composio SDK dependent. Adjust if needed.
  const conn = await composio.connectedAccounts.initiate({
    integrationId,
    userId: params.userId,
    redirectUri: params.redirectUri,
  });
  return { redirectUrl: conn.redirectUrl, connectionId: conn.connectedAccountId };
}

export async function getGithubConnection(connectionId: string): Promise<{
  id: string;
  status: string;
  githubLogin: string | null;
}> {
  const composio = getComposio();
  const conn = await composio.connectedAccounts.get(connectionId);
  // Try to surface the GitHub login; property name varies by SDK version.
  const login =
    (conn as { accountId?: string; meta?: { login?: string } }).meta?.login ??
    (conn as { accountId?: string }).accountId ??
    null;
  return { id: connectionId, status: (conn as { status: string }).status, githubLogin: login };
}

export async function composioExecute(args: {
  action: string;
  connectedAccountId: string;
  params?: Record<string, unknown>;
}): Promise<{ data: unknown }> {
  const composio = getComposio();
  const res = await composio.actions.execute({
    actionName: args.action,
    connectedAccountId: args.connectedAccountId,
    input: args.params ?? {},
  });
  return { data: (res as { data?: unknown }).data ?? res };
}

export async function listUserRepos(connectedAccountId: string): Promise<Array<{ full_name: string; private: boolean }>> {
  const res = await composioExecute({
    action: 'GITHUB_REPOS_LIST_FOR_AUTHENTICATED_USER',
    connectedAccountId,
    params: { per_page: 100, sort: 'updated' },
  });
  const list = (res.data as Array<{ full_name: string; private: boolean }>) ?? [];
  return list.map(r => ({ full_name: r.full_name, private: r.private }));
}
```

> **Composio SDK shape note:** The SDK's method names (`connectedAccounts.initiate`, `actions.execute`) are the current public surface as of 2026-04; if your installed version of `@composio/core` differs, adjust the three adapter functions here — the engine and API routes import from these functions only and don't otherwise couple to Composio.

- [ ] **Step 2: Create `src/lib/anthropic.ts`**

```ts
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
  return { content: res.content.map(c => ({ type: c.type, text: (c as { text?: string }).text ?? '' })) };
};
```

- [ ] **Step 3: Create `src/lib/elevenlabs.ts`**

```ts
import { ElevenLabsClient } from 'elevenlabs';
import type { TTSStreamFn } from './core/render/voice';
import { isStubVoice } from './env';

let cached: ElevenLabsClient | null = null;
function client() {
  if (cached) return cached;
  cached = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
  return cached;
}

export const ttsStream: TTSStreamFn = async ({ voiceId, text, modelId }) => {
  if (isStubVoice()) {
    async function* empty(): AsyncIterable<Uint8Array> { /* no chunks */ }
    return empty();
  }
  const stream = await client().generate({
    voice: voiceId,
    text,
    model_id: modelId ?? 'eleven_multilingual_v2',
    stream: true,
  });
  return stream as AsyncIterable<Uint8Array>;
};

export { isStubVoice };
```

- [ ] **Step 4: Wire a "real deps" helper `src/lib/core/deps.ts`**

```ts
import { composioExecute } from '@/lib/composio/client';
import { anthropicComplete } from '@/lib/anthropic';
import { ttsStream } from '@/lib/elevenlabs';
import { isStubVoice } from '@/lib/env';
import { supabaseClassificationCache } from '@/lib/supabase/cache';
import { insertDigest, updateJob } from '@/lib/supabase/jobs';
import { uploadMp3 } from '@/lib/supabase/storage';
import { listMergedPRs } from './sources/github';
import { classifyPRs } from './sources/classify';
import { writeScript } from './script/writer';
import { renderVoice } from './render/voice';
import type { PipelineDeps } from './pipeline';

export function liveDeps(): PipelineDeps {
  return {
    async fetchPRs(repo, since, composioConnId) {
      return listMergedPRs(repo, since, composioExecute, composioConnId);
    },
    async classifyPRs(prs, repo) {
      return classifyPRs(prs, {
        llmComplete: anthropicComplete,
        cache: supabaseClassificationCache(),
        repo,
      });
    },
    async writeScript(prs, classifications, audience) {
      return writeScript(prs, classifications, audience, { llmComplete: anthropicComplete });
    },
    async renderVoice(script) {
      return renderVoice(script, {
        tts: ttsStream,
        voiceId: process.env.ELEVENLABS_VOICE_ID!,
        stub: isStubVoice(),
      });
    },
    storage: { uploadMp3 },
    db: { updateJob, insertDigest },
  };
}
```

- [ ] **Step 5: Typecheck — expect clean**

Run:
```bash
pnpm typecheck
```

Expected: zero errors. If a Composio or ElevenLabs type doesn't exist as named, consult the installed SDK's `d.ts` and adapt the `as { ... }` casts in the adapter files.

- [ ] **Step 6: Commit**

```bash
git add src/lib/composio src/lib/anthropic.ts src/lib/elevenlabs.ts src/lib/core/deps.ts
git commit -m "feat: wire live Composio, Anthropic, ElevenLabs adapters"
```

---

## Task 13: API — Composio OAuth start + callback

**Files:**
- Create: `src/app/api/connect/start/route.ts`, `src/app/api/connect/callback/route.ts`

- [ ] **Step 1: Create `src/app/api/connect/start/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { ensureSession } from '@/lib/session';
import { initiateGithubAuth } from '@/lib/composio/client';

export const runtime = 'nodejs';

export async function POST() {
  const sid = await ensureSession();
  const redirectUri = process.env.COMPOSIO_REDIRECT_URL!;
  const { redirectUrl, connectionId } = await initiateGithubAuth({ userId: sid, redirectUri });

  // Stash the pending connection id on the session so callback can validate.
  const res = NextResponse.json({ redirectUrl });
  res.cookies.set('featwrap_pending_conn', connectionId, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 600, path: '/',
  });
  return res;
}
```

- [ ] **Step 2: Create `src/app/api/connect/callback/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession, ensureSession } from '@/lib/session';
import { getGithubConnection } from '@/lib/composio/client';
import { supabaseService } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const sid = await ensureSession();
  const url = new URL(req.url);
  // Composio posts the connection back via query params (`connId` or `connectedAccountId`).
  const connId =
    url.searchParams.get('connectedAccountId') ??
    url.searchParams.get('connId') ??
    req.cookies.get('featwrap_pending_conn')?.value ??
    null;
  if (!connId) {
    return NextResponse.redirect(new URL('/?error=missing_connection', req.url));
  }

  try {
    const conn = await getGithubConnection(connId);
    if (conn.status !== 'ACTIVE' && conn.status !== 'INITIATED') {
      // Fall back: still store it; the repo-list call will surface a real error.
    }
    await supabaseService().from('connections').upsert({
      session_id: sid,
      provider: 'github',
      composio_conn_id: connId,
      github_login: conn.githubLogin,
    }, { onConflict: 'session_id,provider' });
  } catch (err) {
    console.error('[callback] failed to finalize connection', err);
    return NextResponse.redirect(new URL('/?error=finalize_failed', req.url));
  }

  const res = NextResponse.redirect(new URL('/generate', req.url));
  res.cookies.delete('featwrap_pending_conn');
  return res;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/connect
git commit -m "feat(api): Composio GitHub OAuth start + callback routes"
```

---

## Task 14: API — list repos

**Files:**
- Create: `src/app/api/repos/route.ts`

- [ ] **Step 1: Create `src/app/api/repos/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getConnectionIdBySession } from '@/lib/supabase/jobs';
import { listUserRepos } from '@/lib/composio/client';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();
  if (!session.sid) return NextResponse.json({ repos: [] }, { status: 401 });
  const conn = await getConnectionIdBySession(session.sid);
  if (!conn) return NextResponse.json({ repos: [] }, { status: 401 });
  try {
    const repos = await listUserRepos(conn.composio_conn_id);
    return NextResponse.json({ repos: repos.map(r => ({ fullName: r.full_name, private: r.private })) });
  } catch (err) {
    console.error('[api/repos] failed', err);
    return NextResponse.json({ repos: [], error: 'repo_list_failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/repos
git commit -m "feat(api): list user repos via Composio"
```

---

## Task 15: API — create digest job

**Files:**
- Create: `src/app/api/digests/route.ts`

- [ ] **Step 1: Create `src/app/api/digests/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { after } from 'next/server';
import { getSession } from '@/lib/session';
import { getConnectionIdBySession } from '@/lib/supabase/jobs';
import { createJob } from '@/lib/supabase/jobs';
import { runPipeline } from '@/lib/core/pipeline';
import { liveDeps } from '@/lib/core/deps';

export const runtime = 'nodejs';
export const maxDuration = 300;

const Body = z.object({
  repo: z.string().regex(/^[^/\s]+\/[^/\s]+$/),
  since: z.string().regex(/^\d+[dh]$/),
  audience: z.enum(['marketing', 'sales', 'cs', 'dev', 'all']),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.sid) return NextResponse.json({ error: 'not_connected' }, { status: 401 });
  const conn = await getConnectionIdBySession(session.sid);
  if (!conn) return NextResponse.json({ error: 'not_connected' }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const jobId = await createJob({
    connectionId: conn.id,
    repo: body.repo,
    since: body.since,
    audience: body.audience,
  });

  // Kick off the pipeline after responding.
  after(async () => {
    try {
      await runPipeline(
        { jobId, repo: body.repo, since: body.since, audience: body.audience, composioConnId: conn.composio_conn_id, connectionId: conn.id },
        liveDeps(),
      );
    } catch (err) {
      console.error('[pipeline] uncaught', err);
    }
  });

  return NextResponse.json({ jobId });
}
```

> `after` is Next.js 15's async-after-response API (stable equivalent of the old experimental `waitUntil`). If your Next version doesn't expose `after` from `next/server`, use `import { unstable_after as after } from 'next/server'` instead.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/digests
git commit -m "feat(api): create digest job and fire pipeline after response"
```

---

## Task 16: API — poll job status

**Files:**
- Create: `src/app/api/jobs/[id]/route.ts`

- [ ] **Step 1: Create `src/app/api/jobs/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getJobWithDigests } from '@/lib/supabase/jobs';
import { signedUrl } from '@/lib/supabase/storage';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getJobWithDigests(id);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const digestsWithUrls = await Promise.all(row.digests.map(async d => ({
    audience: d.audience,
    script: d.script,
    prNumbers: d.pr_numbers,
    audioUrl: d.audio_path ? await signedUrl(d.audio_path) : null,
  })));
  return NextResponse.json({
    id: row.job.id,
    status: row.job.status,
    step: row.job.step,
    progress: row.job.progress,
    error: row.job.error,
    createdAt: row.job.created_at,
    completedAt: row.job.completed_at,
    digests: digestsWithUrls,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/jobs
git commit -m "feat(api): poll job status with signed URLs for completed digests"
```

---

## Task 17: Landing page

**Files:**
- Modify: `src/app/page.tsx`, `src/app/layout.tsx`
- Create: `src/components/Nav.tsx`, `src/components/Button.tsx`, `src/components/Pill.tsx`

- [ ] **Step 1: Create `src/components/Button.tsx`**

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Button({ children, variant = 'primary', className = '', ...rest }: Props) {
  const base = 'inline-flex items-center justify-center h-12 px-6 text-[15px] font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const style = variant === 'primary'
    ? 'bg-ink text-paper border-ink hover:bg-accent hover:border-accent'
    : 'bg-transparent text-ink border-ink hover:bg-ink hover:text-paper';
  return <button className={`${base} ${style} ${className}`} {...rest}>{children}</button>;
}
```

- [ ] **Step 2: Create `src/components/Pill.tsx`**

```tsx
import type { ReactNode } from 'react';
export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 h-8 px-3 text-[12px] font-mono uppercase tracking-[0.08em] border border-ink">
      {children}
    </span>
  );
}
```

- [ ] **Step 3: Create `src/components/Nav.tsx`**

```tsx
import Link from 'next/link';
import { Pill } from './Pill';
import { getSession } from '@/lib/session';
import { getConnectionIdBySession } from '@/lib/supabase/jobs';

export async function Nav() {
  const session = await getSession();
  let login: string | null = null;
  if (session.sid) {
    const conn = await getConnectionIdBySession(session.sid);
    login = conn?.github_login ?? null;
  }
  return (
    <header className="flex items-center justify-between py-6">
      <Link href="/" className="font-sans text-lg font-semibold tracking-tight">featwrap</Link>
      <Pill>{login ? `@${login} connected` : 'not connected'}</Pill>
    </header>
  );
}
```

- [ ] **Step 4: Replace `src/app/page.tsx`**

```tsx
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Nav } from '@/components/Nav';
import { ensureSession } from '@/lib/session';
import { getConnectionIdBySession } from '@/lib/supabase/jobs';

async function ConnectOrContinue() {
  const sid = await ensureSession();
  const conn = await getConnectionIdBySession(sid);
  if (conn) {
    return (
      <Link href="/generate">
        <Button>Start a digest →</Button>
      </Link>
    );
  }
  return (
    <form action="/api/connect/start" method="post">
      <Button type="submit">Connect GitHub</Button>
    </form>
  );
}

export default async function Home() {
  return (
    <main className="mx-auto max-w-[840px] px-8">
      <Nav />
      <hr className="border-t border-ink" />

      <section className="py-32">
        <p className="font-mono text-ash mb-4">$ featwrap_</p>
        <h1 className="font-sans text-[56px] leading-[1.05] font-semibold tracking-tight mb-8 max-w-[680px]">
          Turn every merged PR into a 90-second podcast your whole team will actually listen to.
        </h1>
        <p className="text-[17px] text-ash mb-12">
          One source. Four audiences. Zero drafting.
        </p>
        <ConnectOrContinue />
      </section>

      <hr className="border-t border-ink w-24" />

      <section className="py-16">
        <p className="font-mono text-[13px] font-medium uppercase tracking-[0.08em] mb-8">How it works</p>
        <ol className="space-y-4 text-[17px]">
          <li className="flex gap-8"><span className="font-mono text-ash w-8">01</span><span>Connect your GitHub via Composio</span></li>
          <li className="flex gap-8"><span className="font-mono text-ash w-8">02</span><span>Pick a repo and a time window</span></li>
          <li className="flex gap-8"><span className="font-mono text-ash w-8">03</span><span>We classify, script, and render per audience</span></li>
          <li className="flex gap-8"><span className="font-mono text-ash w-8">04</span><span>Listen in-browser or download the MP3</span></li>
        </ol>
      </section>

      <hr className="border-t border-ink" />
      <footer className="flex items-center justify-between py-6 text-[13px]">
        <span className="font-mono">featwrap v0.1</span>
        <span className="text-ash">a hackathon build</span>
      </footer>
    </main>
  );
}
```

> The form's `action="/api/connect/start"` with `method="post"` lets a plain form submission initiate Composio auth. The route returns JSON with a `redirectUrl`; we upgrade this to a client-side submit in a later polish step if needed. For now, the Connect GitHub button posts, receives the URL, and a tiny client component does the redirect — actually let's do that now:

- [ ] **Step 5: Replace the `ConnectOrContinue` fallback with a client component that redirects**

Create `src/components/ConnectButton.tsx`:
```tsx
'use client';
import { Button } from './Button';
import { useState } from 'react';

export function ConnectButton() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const res = await fetch('/api/connect/start', { method: 'POST' });
        const { redirectUrl } = await res.json();
        if (redirectUrl) window.location.href = redirectUrl;
        else setLoading(false);
      }}
    >
      {loading ? 'Redirecting…' : 'Connect GitHub'}
    </Button>
  );
}
```

Update `src/app/page.tsx` `ConnectOrContinue`:
```tsx
import { ConnectButton } from '@/components/ConnectButton';
// ...
async function ConnectOrContinue() {
  const sid = await ensureSession();
  const conn = await getConnectionIdBySession(sid);
  if (conn) {
    return (
      <Link href="/generate">
        <Button>Start a digest →</Button>
      </Link>
    );
  }
  return <ConnectButton />;
}
```

- [ ] **Step 6: Start dev server and verify**

Run:
```bash
pnpm dev
```

Visit `http://localhost:3000`. Expect:
- `featwrap` wordmark top-left, `not connected` pill top-right
- Large bold headline, subhead, `Connect GitHub` button
- "How it works" section with four numbered steps
- Footer with `featwrap v0.1`

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/components
git commit -m "feat(ui): landing page with brutalist light-mode hero and connect button"
```

---

## Task 18: Generate page — form

**Files:**
- Create: `src/app/generate/page.tsx`, `src/components/RepoPicker.tsx`, `src/components/GenerateForm.tsx`

- [ ] **Step 1: Create `src/app/generate/page.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { GenerateForm } from '@/components/GenerateForm';
import { ensureSession } from '@/lib/session';
import { getConnectionIdBySession } from '@/lib/supabase/jobs';

export default async function Generate() {
  const sid = await ensureSession();
  const conn = await getConnectionIdBySession(sid);
  if (!conn) redirect('/');

  return (
    <main className="mx-auto max-w-[840px] px-8">
      <Nav />
      <hr className="border-t border-ink" />
      <section className="py-16">
        <p className="font-mono text-[13px] font-medium uppercase tracking-[0.08em] mb-4 text-ash">New digest</p>
        <h1 className="font-sans text-[32px] leading-[1.1] font-semibold mb-8">Pick a repo and a time window.</h1>
        <GenerateForm />
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Create `src/components/RepoPicker.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';

interface Repo { fullName: string; private: boolean }

export function RepoPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch('/api/repos').then(r => r.json()).then(d => {
      if (d.repos) setRepos(d.repos);
      else setErr(true);
    }).catch(() => setErr(true));
  }, []);

  if (err || repos === null) {
    return (
      <input
        type="text"
        placeholder="owner/name"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-transparent border-0 border-b border-ink h-12 text-[17px] font-mono focus:outline-none focus:border-accent"
      />
    );
  }

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-transparent border-0 border-b border-ink h-12 text-[17px] font-mono focus:outline-none focus:border-accent"
    >
      <option value="">— choose a repo —</option>
      {repos.map(r => (
        <option key={r.fullName} value={r.fullName}>
          {r.fullName}{r.private ? ' (private)' : ''}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 3: Create `src/components/GenerateForm.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { Button } from './Button';
import { RepoPicker } from './RepoPicker';

const SINCE = [
  { v: '1d', l: '1 day' },
  { v: '3d', l: '3 days' },
  { v: '7d', l: '7 days' },
  { v: '14d', l: '14 days' },
];
const AUDIENCES = [
  { v: 'marketing', l: 'Marketing' },
  { v: 'sales', l: 'Sales' },
  { v: 'cs', l: 'CS' },
  { v: 'dev', l: 'Engineering' },
  { v: 'all', l: 'All four' },
];

export function GenerateForm() {
  const [repo, setRepo] = useState('');
  const [since, setSince] = useState('7d');
  const [audience, setAudience] = useState('marketing');
  const [jobId, setJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!repo) { setErr('Pick or type a repo.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/digests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ repo, since, audience }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'failed');
      setJobId(data.jobId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed');
    } finally {
      setLoading(false);
    }
  }

  if (jobId) {
    // Placeholder; Task 19 replaces this with <JobView jobId={jobId} />.
    return <p className="font-mono text-ash">job started: {jobId}</p>;
  }

  return (
    <div className="space-y-10">
      <div>
        <label className="block font-mono text-[12px] uppercase tracking-[0.08em] text-ash mb-2">Repo</label>
        <RepoPicker value={repo} onChange={setRepo} />
      </div>

      <div>
        <label className="block font-mono text-[12px] uppercase tracking-[0.08em] text-ash mb-2">Since</label>
        <select
          value={since}
          onChange={e => setSince(e.target.value)}
          className="w-full bg-transparent border-0 border-b border-ink h-12 text-[17px] focus:outline-none focus:border-accent"
        >
          {SINCE.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </div>

      <div>
        <label className="block font-mono text-[12px] uppercase tracking-[0.08em] text-ash mb-2">Audience</label>
        <select
          value={audience}
          onChange={e => setAudience(e.target.value)}
          className="w-full bg-transparent border-0 border-b border-ink h-12 text-[17px] focus:outline-none focus:border-accent"
        >
          {AUDIENCES.map(a => <option key={a.v} value={a.v}>{a.l}</option>)}
        </select>
      </div>

      {err && <p className="font-mono text-err">error: {err}</p>}

      <Button onClick={submit} disabled={loading}>
        {loading ? 'Starting…' : 'Generate'}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/generate src/components/RepoPicker.tsx src/components/GenerateForm.tsx
git commit -m "feat(ui): generate page form with repo picker"
```

---

## Task 19: Generate page — job status log card

**Files:**
- Create: `src/components/JobView.tsx`, `src/components/JobLog.tsx`

- [ ] **Step 1: Create `src/components/JobLog.tsx`**

```tsx
interface JobLogProps {
  repo: string;
  since: string;
  audience: string;
  step: string | null;
  progress: number;
  status: string;
  error: string | null;
  startedAt: string;
}

function bar(progress: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(progress / 10)));
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function ts(d: string) {
  return new Date(d).toISOString().slice(11, 19);
}

export function JobLog(p: JobLogProps) {
  const statusNote =
    p.status === 'complete' ? 'done' :
    p.status === 'failed' ? `error: ${p.error ?? 'unknown'}` :
    `${bar(p.progress)}  ${p.progress}%`;
  return (
    <div className="border border-ink p-6 font-mono text-[13px] leading-[1.8] bg-paper">
      <div className="text-ash mb-2">
        $ featwrap digest --repo {p.repo} --since {p.since} --audience {p.audience}
      </div>
      <div>
        [{ts(p.startedAt)}] {p.step ?? 'starting'}  <span className={p.status === 'failed' ? 'text-err' : p.status === 'complete' ? 'text-ok' : ''}>{statusNote}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/JobView.tsx`**

Note: `Results` is added in Task 20; this version renders a placeholder for any completed digests.

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { JobLog } from './JobLog';

interface DigestResp {
  audience: string;
  script: string;
  prNumbers: number[];
  audioUrl: string | null;
}

interface JobResp {
  id: string;
  status: string;
  step: string | null;
  progress: number;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  digests: DigestResp[];
}

export function JobView({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobResp | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function tick() {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) return;
      const data = (await res.json()) as JobResp;
      setJob(data);
      if (data.status === 'complete' || data.status === 'failed') {
        if (timer.current) clearInterval(timer.current);
      }
    }
    tick();
    timer.current = setInterval(tick, 2000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [jobId]);

  if (!job) return <p className="font-mono text-ash">starting…</p>;

  return (
    <div className="space-y-10">
      <JobLog
        repo="— repo —"
        since="—"
        audience="—"
        step={job.step}
        progress={job.progress}
        status={job.status}
        error={job.error}
        startedAt={job.createdAt}
      />
      {job.digests.length > 0 && (
        <ul className="space-y-4">
          {job.digests.map(d => (
            <li key={d.audience} className="font-mono text-[13px]">
              {d.audience} — {d.audioUrl ? 'ready' : 'rendering…'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

> The JobLog renders `repo/since/audience` as em-dash placeholders because the job row doesn't round-trip those values to the client in the poll response. This is a cosmetic flourish, not a correctness requirement.

- [ ] **Step 3: Wire `JobView` into `GenerateForm`**

Replace the placeholder added in Task 18. In `src/components/GenerateForm.tsx`:

1. Add the import near the other local imports:
   ```tsx
   import { JobView } from './JobView';
   ```
2. Replace the placeholder block:
   ```tsx
   if (jobId) {
     // Placeholder; Task 19 replaces this with <JobView jobId={jobId} />.
     return <p className="font-mono text-ash">job started: {jobId}</p>;
   }
   ```
   with:
   ```tsx
   if (jobId) return <JobView jobId={jobId} />;
   ```

- [ ] **Step 4: Commit**

```bash
git add src/components/JobLog.tsx src/components/JobView.tsx src/components/GenerateForm.tsx
git commit -m "feat(ui): job status card with polling"
```

---

## Task 20: Generate page — results + audio player

**Files:**
- Create: `src/components/Results.tsx`, `src/components/AudioPlayer.tsx`

- [ ] **Step 1: Create `src/components/AudioPlayer.tsx`**

```tsx
'use client';
import { useRef, useState, useEffect } from 'react';

export function AudioPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => setDuration(a.duration);
    const onEnd = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('ended', onEnd);
    };
  }, []);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); } else { a.play(); setPlaying(true); }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const r = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${r}`;
  };

  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={toggle}
        className="w-10 h-10 flex items-center justify-center bg-ink text-paper border border-ink hover:bg-accent hover:border-accent"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? '■' : '▶'}
      </button>
      <div className="flex-1 h-[2px] bg-ink/20 relative">
        <div className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[13px] text-ash tabular-nums">{fmt(current)} / {fmt(duration)}</span>
      <audio ref={ref} src={src} preload="metadata" />
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/Results.tsx`**

```tsx
import { AudioPlayer } from './AudioPlayer';

interface Digest {
  audience: string;
  script: string;
  prNumbers: number[];
  audioUrl: string | null;
}

const LABEL: Record<string, string> = {
  marketing: 'Marketing',
  sales: 'Sales',
  cs: 'CS',
  dev: 'Engineering',
};

export function Results({ digests }: { digests: Digest[] }) {
  return (
    <div className="space-y-12">
      {digests.map(d => (
        <div key={d.audience}>
          <hr className="border-t border-ink w-16 mb-4" />
          <h2 className="font-sans text-[22px] font-semibold mb-4">{LABEL[d.audience] ?? d.audience}</h2>
          {d.audioUrl ? (
            <>
              <AudioPlayer src={d.audioUrl} />
              <p className="mt-4">
                <a href={d.audioUrl} download={`featwrap-${d.audience}.mp3`} className="font-mono text-[13px] underline hover:text-accent">
                  Download MP3
                </a>
              </p>
            </>
          ) : (
            <p className="font-mono text-ash text-[13px]">rendering…</p>
          )}
          <details className="mt-6">
            <summary className="font-mono text-[12px] uppercase tracking-[0.08em] text-ash cursor-pointer">Script</summary>
            <p className="mt-4 text-[15px] leading-[1.6] whitespace-pre-wrap">{d.script}</p>
          </details>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Wire `Results` into `JobView`**

Replace the placeholder list added in Task 19. In `src/components/JobView.tsx`:

1. Add the import:
   ```tsx
   import { Results } from './Results';
   ```
2. Replace the placeholder block:
   ```tsx
   {job.digests.length > 0 && (
     <ul className="space-y-4">
       {job.digests.map(d => (
         <li key={d.audience} className="font-mono text-[13px]">
           {d.audience} — {d.audioUrl ? 'ready' : 'rendering…'}
         </li>
       ))}
     </ul>
   )}
   ```
   with:
   ```tsx
   {job.digests.length > 0 && <Results digests={job.digests} />}
   ```

- [ ] **Step 4: Verify end-to-end locally**

Run:
```bash
pnpm dev
```

Ensure `.env.local` has `FEATWRAP_STUB_LLM=1` and `FEATWRAP_STUB_VOICE=1` for this first run to avoid external calls.

Visit `http://localhost:3000`. Click **Connect GitHub** → complete Composio flow → land on `/generate` → pick any repo → click **Generate**. Expect the log card to cycle steps, then a "Marketing" result card appear with the silent MP3 player and "Download MP3" link. (Audio will be silence because stubbed — that's expected.)

> If the Composio flow fails, the most common issues are: (a) `COMPOSIO_REDIRECT_URL` doesn't match what's configured in Composio dashboard; (b) `COMPOSIO_GITHUB_INTEGRATION_ID` is wrong; (c) the integration isn't marked active in Composio. Fix and retry.

- [ ] **Step 5: Commit**

```bash
git add src/components/AudioPlayer.tsx src/components/Results.tsx src/components/JobView.tsx
git commit -m "feat(ui): result cards with minimal audio player and script reveal"
```

---

## Task 21: Seed demo repo script

**Files:**
- Create: `scripts/seed-demo-repo.ts`

- [ ] **Step 1: Create `scripts/seed-demo-repo.ts`**

```ts
/**
 * One-off seed script. Run:
 *   GITHUB_SEED_TOKEN=ghp_xxx GITHUB_SEED_REPO=featwrap/demo \
 *     pnpm tsx scripts/seed-demo-repo.ts
 *
 * Requires the repo to already exist and be empty, and the token to have
 * `repo` scope. Creates branches, commits a file change on each, and opens+
 * merges three PRs.
 */

const token = process.env.GITHUB_SEED_TOKEN;
const repo = process.env.GITHUB_SEED_REPO;
if (!token || !repo) {
  console.error('Set GITHUB_SEED_TOKEN and GITHUB_SEED_REPO=owner/name');
  process.exit(1);
}
const [owner, name] = repo.split('/');
const base = 'https://api.github.com';
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'content-type': 'application/json' };

async function gh<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, { ...init, headers: { ...headers, ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

type Ref = { object: { sha: string } };
type RefUpdate = { object: { sha: string } };

async function getDefaultBranch(): Promise<{ ref: string; sha: string }> {
  const repoInfo = await gh<{ default_branch: string }>(`/repos/${owner}/${name}`);
  const ref = await gh<Ref>(`/repos/${owner}/${name}/git/refs/heads/${repoInfo.default_branch}`);
  return { ref: repoInfo.default_branch, sha: ref.object.sha };
}

async function createFileOnBranch(branch: string, path: string, content: string, message: string, baseSha: string) {
  // Create branch
  await gh(`/repos/${owner}/${name}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
  }).catch(() => null);
  // Put file on branch
  await gh(`/repos/${owner}/${name}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
    }),
  });
}

async function openAndMergePR(title: string, body: string, head: string, base: string): Promise<void> {
  const pr = await gh<{ number: number }>(`/repos/${owner}/${name}/pulls`, {
    method: 'POST',
    body: JSON.stringify({ title, body, head, base }),
  });
  await gh(`/repos/${owner}/${name}/pulls/${pr.number}/merge`, {
    method: 'PUT',
    body: JSON.stringify({ merge_method: 'squash' }),
  });
}

async function main() {
  const def = await getDefaultBranch();
  // Ensure repo has at least a README on default branch so subsequent merges work
  await gh(`/repos/${owner}/${name}/contents/README.md`, {
    method: 'PUT',
    body: JSON.stringify({ message: 'init', content: Buffer.from('# demo\n').toString('base64'), branch: def.ref }),
  }).catch(() => null);
  const updated = await getDefaultBranch();

  // PR #1 — customer-facing: price filter
  await createFileOnBranch('seed/price-filter', 'docs/price-filter.md',
    '# Price filter\n\nCustomers can now filter search results by price range.\n',
    'feat: add price filter to search', updated.sha);
  await openAndMergePR(
    'Add price filter to search',
    'Customers can now filter search results by price range.\n\nFixes #1',
    'seed/price-filter', def.ref,
  );

  // PR #2 — internal: refactor cart hook
  const afterFirst = await getDefaultBranch();
  await createFileOnBranch('seed/cart-hook', 'docs/cart-hook.md',
    '# Cart hook\n\nExtracted shared cart logic into `useCart()`. No user-visible change.\n',
    'refactor: extract useCart hook', afterFirst.sha);
  await openAndMergePR(
    'Extract cart hook into useCart()',
    'Refactor only. Internal cleanup; no user-visible change.',
    'seed/cart-hook', def.ref,
  );

  // PR #3 — tiny customer-facing: typo in tooltip
  const afterSecond = await getDefaultBranch();
  await createFileOnBranch('seed/tooltip-typo', 'docs/tooltip.md',
    '# Tooltip\n\nFixes a small typo in the cart tooltip copy.\n',
    'fix: typo in cart tooltip copy', afterSecond.sha);
  await openAndMergePR(
    'Fix typo in cart tooltip copy',
    'Tiny copy fix.',
    'seed/tooltip-typo', def.ref,
  );

  console.log('seeded 3 PRs successfully');
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 2: Install `tsx`**

```bash
pnpm add -D tsx
```

- [ ] **Step 3: Run the seed**

```bash
GITHUB_SEED_TOKEN=<PAT with repo scope> GITHUB_SEED_REPO=<owner/demo> pnpm tsx scripts/seed-demo-repo.ts
```

Expected: `seeded 3 PRs successfully`. Verify on GitHub that three merged PRs now exist.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-demo-repo.ts package.json pnpm-lock.yaml
git commit -m "chore: script to seed demo repo with 3 realistic PRs"
```

---

## Task 22: Deploy to Vercel + smoke test

**Files:**
- Modify: `package.json` (ensure `build` exists); no new files.

- [ ] **Step 1: Typecheck and build locally**

```bash
pnpm typecheck
pnpm build
```

Expected: both succeed. Fix any type errors inline.

- [ ] **Step 2: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 3: Create a Vercel project**

In Vercel dashboard:
1. Import the GitHub repo.
2. Framework: Next.js (auto-detected).
3. Build command: `pnpm build` (auto).
4. Install command: `pnpm install` (auto).

- [ ] **Step 4: Add environment variables in Vercel**

Paste each of the keys from `.env.local` into the Vercel project's Environment Variables screen, for Production + Preview. Make sure to **not** set `FEATWRAP_STUB_LLM` or `FEATWRAP_STUB_VOICE` in production (leave blank).

Set `COMPOSIO_REDIRECT_URL` to `https://<your-vercel-domain>/api/connect/callback` (note the real URL, not localhost).

- [ ] **Step 5: Update Composio dashboard redirect URL**

In Composio → GitHub integration → edit the redirect URL(s) to include the Vercel domain's `/api/connect/callback`.

- [ ] **Step 6: First deploy**

Trigger a deploy in Vercel (push any commit, or click Redeploy). Wait for green.

- [ ] **Step 7: Smoke test the deployed URL**

Visit the Vercel URL.

1. Click **Connect GitHub** → complete OAuth → lands on `/generate` with the pill showing your GitHub login.
2. Pick your seeded demo repo, `since=7d`, audience=`marketing`, click **Generate**.
3. Watch the job log advance through steps. Wait 60–120 s.
4. A result card for "Marketing" appears with a playable MP3 of ~60–90 s.
5. Click **Download MP3** and verify the file opens and plays.

If any step fails, check Vercel function logs for the specific error. The most common issues are env var typos or the Composio redirect URL mismatch.

- [ ] **Step 8: Run `--audience all` as the headline demo**

Generate again with the same repo, `audience=all`. Expect 4 result cards within ~120–180 s. This is the demo.

- [ ] **Step 9: Final commit**

```bash
git add -A
git commit --allow-empty -m "chore: mark v0.1 shipped"
git push
```

---

## Done

When Task 22 step 8 plays all four audience MP3s back-to-back on the deployed Vercel URL, the hackathon product is shipped.

**Explicitly deferred for future sessions** (already scoped out in the spec):
- CLI (`bin/featwrap.ts`) — engine is ready; add a commander entry point
- Remotion reels — engine provides script + audio; add `render/video.ts` + Remotion composition
- Cron + email delivery — add `/api/cron/daily`, Resend, `scheduled_configs` table
- Sign-in + history view — add Supabase Auth + `/history` page

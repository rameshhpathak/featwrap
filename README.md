# Featwrap

> This week's PRs, as a 5-minute podcast.

Featwrap turns a team's merged GitHub pull requests into a short audio digest — narrated four ways for marketing, sales, support, and engineering. Connect GitHub, pick a repo, pick a window, listen in-browser.

Landing / waitlist: [featwrap.lovable.app](https://featwrap.lovable.app/)

---

## How it works

```
 GitHub (Composio OAuth)
         │
         ▼
 Fetch merged PRs ──▶ Classify each (customer-facing vs internal) ──▶ Per-audience script (Claude Sonnet 4.5 via OpenRouter)
                                                                                 │
                                                                                 ▼
                                                                        ElevenLabs TTS (eleven_multilingual_v2)
                                                                                 │
                                                                                 ▼
                                                                      Supabase Storage + signed URL
                                                                                 │
                                                                                 ▼
                                                                         Browser audio player
```

The pipeline runs async under Next.js `after()`, writes progress to a Supabase `jobs` row, and the client polls `/api/jobs/:id` every 2 s until complete.

---

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| GitHub access | Composio (OAuth + tool execution + REST proxy) |
| Classifier + scriptwriter | Claude Sonnet 4.5 via OpenRouter |
| Voice | ElevenLabs `eleven_multilingual_v2` |
| DB + Storage + session gating | Supabase (service-role key, RLS off) |
| Session | Iron-session (signed cookie) |
| Styling | Tailwind + HSL tokens, Space Grotesk + JetBrains Mono |
| Tests | Vitest (engine-only; UI + routes tested manually) |

---

## Getting started

### 1. Install

```bash
pnpm install
```

### 2. Configure `.env.local`

Copy `.env.example` and fill in the values:

```
OPENROUTER_API_KEY=sk-or-v1-...
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=<voice id>

COMPOSIO_API_KEY=ak_...
COMPOSIO_GITHUB_INTEGRATION_ID=ac_...
COMPOSIO_REDIRECT_URL=http://localhost:3000/api/connect/callback

NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

SESSION_COOKIE_SECRET=<64 hex chars — `openssl rand -hex 32`>

# Optional dev flags — leave blank in prod
FEATWRAP_STUB_LLM=
FEATWRAP_STUB_VOICE=
```

### 3. Set up Supabase

1. Create a Supabase project.
2. Open SQL editor → paste the contents of `supabase/migrations/0001_init.sql` → run.
3. Verify tables `connections`, `jobs`, `digests`, `pr_classifications` exist and a private `media` bucket exists in Storage.

### 4. Set up Composio

1. Create a Composio account and a GitHub integration (Composio-managed OAuth).
2. Add your local + production redirect URLs to the integration.
3. Copy the integration ID + API key into `.env.local`.

### 5. Run

```bash
pnpm dev
```

Visit `http://localhost:3000`, click **Connect GitHub**, pick a repo with recent merged PRs, choose a window + audience, hit **Generate**.

---

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start Next.js on `localhost:3000` (override with `PORT=3010 pnpm dev`). |
| `pnpm build` | Production build. |
| `pnpm start` | Serve the production build. |
| `pnpm typecheck` | `tsc --noEmit`. |
| `pnpm test` | Vitest run (engine). |
| `pnpm test:watch` | Vitest in watch mode. |
| `pnpm lint` | Next.js lint. |
| `pnpm tsx scripts/seed-demo-repo.ts` | Seed a fresh demo repo with 3 merged PRs (requires `GITHUB_SEED_TOKEN` + `GITHUB_SEED_REPO` env). |

---

## Project layout

```
src/
  app/                         # Next.js App Router pages + API routes
    page.tsx                   # landing
    generate/page.tsx          # /generate
    api/
      connect/start            # Composio OAuth initiation
      connect/callback         # Composio OAuth callback
      repos                    # list user repos via Composio REST proxy
      digests                  # create a job + fire the pipeline
      jobs/[id]                # poll job status + signed audio URLs
  components/                  # React UI primitives (Nav, Button, ...)
  lib/
    core/                      # pure engine, no next/* imports
      sources/github.ts        # list merged PRs via Composio
      sources/classify.ts      # customer-facing vs internal classifier
      script/writer.ts         # per-audience scriptwriter
      script/prompts/          # audience angles + base TTS-aware prompt
      render/voice.ts          # ElevenLabs TTS wrapper with stub fallback
      pipeline.ts              # orchestrator (fetch → classify → write → render → upload)
      deps.ts                  # live dependency wiring
    composio/client.ts         # Composio SDK adapter (auth, tool exec, REST proxy)
    llm.ts                     # OpenRouter adapter (Claude Sonnet 4.5)
    elevenlabs.ts              # ElevenLabs adapter
    supabase/                  # service client, storage, jobs, classification cache
    session.ts                 # iron-session wrapper
    env.ts                     # zod-validated env
supabase/migrations/           # SQL schema
scripts/seed-demo-repo.ts      # one-off demo seeder
tests/                         # Vitest (engine)
docs/superpowers/              # design spec + implementation plan
```

---

## Narration prompt

Hard rules baked into the script writer:

- Mandated opener: `From Featwrap. Here's what shipped in {repo} over {windowDescription}.`
- Dynamic length by window + PR count (1 day → ~60 s, 1 week → ~2 min, 1 month → ~4 min, 90 days → ~7 min).
- Jargon banned: API, endpoint, backend, frontend, refactor, PR, commit, merge, branch, webhook, SDK, middleware, migration, schema, repo, queue, payload, JSON, cache, token — the writer must translate each to plain English.
- Corporate-speak banned: leverage, align, stakeholder, deliverable, synergy, best-in-class, seamlessly, robust, moving the needle.
- ElevenLabs v2 pacing: contractions, em-dashes for thought shifts, ellipses for beats, spelled-out numbers (`forty percent`, not `40%`).
- One understated aside in the middle, never at the open.
- Specific sign-off, never "thanks for listening".

---

## Deploying

### Vercel

1. Import this repo on [vercel.com/new](https://vercel.com/new).
2. Framework auto-detected as Next.js. Leave build defaults.
3. Add every env var from the section above. Leave `FEATWRAP_STUB_LLM` / `FEATWRAP_STUB_VOICE` **blank** in production.
4. Set `COMPOSIO_REDIRECT_URL` to `https://<vercel-domain>/api/connect/callback` after first deploy.
5. In the Composio dashboard, add that same URL as an allowed redirect.
6. Redeploy.

### Runtime notes

- `/api/digests` sets `maxDuration = 300` and fires `runPipeline` via Next 15's `after()`, so the client returns immediately while the pipeline runs under the same function's lifecycle.
- `audience=all` fans out four audiences with `p-limit(2)` so the Pro plan's 300 s budget isn't exceeded in practice.
- Supabase Storage serves audio through signed URLs with a 1 h TTL; the poll endpoint re-signs on every tick so mid-demo expiry isn't an issue.

---

## Testing

```bash
pnpm test
```

Coverage is intentionally engine-only: `sources/github`, `sources/classify`, `script/writer`, `render/voice`, and `pipeline` are tested against mocked boundaries. UI routes and React components are verified manually against a real Supabase + Composio + OpenRouter + ElevenLabs setup.

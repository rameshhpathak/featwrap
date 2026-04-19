# Featwrap — Web App Design

**Date:** 2026-04-19
**Status:** Approved for implementation
**Context:** Hackathon build — solo, 4–5 hour budget
**Supersedes (for this session):** `2026-04-19-featwrap-design.md` — original spec remains valid as the full phased vision. This document is the **Phase 3-only** scope cut we're actually shipping today, plus the architecture to support future phases.

---

## One-line pitch

**Featwrap turns every day's or week's worth of merged PRs into a tone-calibrated podcast (and later, a social reel) so your whole org — marketing, sales, CS, and engineering — actually knows what just shipped.**

## The problem

AI agents now ship more PRs than humans can read. Engineers at least skim the diffs; the rest of the company — marketing, sales, CS, AEs — has near-zero visibility into product changes. Text changelogs don't get read. Review-summary tools exist for engineers (CodeRabbit, Graphite) but nothing serves non-technical stakeholders.

## The insight

Human attention is the scarce resource. A 90-second podcast is infinitely more consumable than a week of diffs. The *same* PRs can be re-narrated with different framing — marketing hears the customer-facing talking point, sales hears the pitch unlock, CS hears the support implication. One source, four audiences, minimal cost per audience (a prompt swap and another ElevenLabs render).

## Target user

Solo founders and PMs running 1–5 person teams that ship a lot of AI-generated PRs. They need their whole org to stay in the loop without drowning non-engineers in technical detail.

---

## Scope — this session

**In scope — the core product:**
- **Web app** (Phase 3 of the original vision) at `featwrap.app` (or equivalent Vercel URL), doing: connect GitHub via Composio → pick a repo → generate per-audience podcast digests → play/download in browser.

**Deferred — out of scope this session:**
- **CLI (`bin/featwrap.ts`)** — the engine supports it; only the entry point is unbuilt. Easy add later.
- **Remotion reels** — video output. Needs Chromium runtime; deferred.
- **Cron + email delivery** — scheduled digests. Needs a long-lived identity model; deferred.
- **Sign-in / user accounts** — identity is the Composio connection (cookie-bound).
- **History view** of past digests — data is retained; UI is not built.
- **Per-voice customization** beyond audience prompt.
- **Non-English narration.**
- **Multi-tenancy, billing, dashboards.**

---

## System shape

Single Next.js 15 app deployed to Vercel. Supabase as DB + Storage. Composio for GitHub OAuth + API. Async jobs + client polling; no long-lived requests to the browser.

```
┌─────────────────┐        ┌──────────────────────────────┐
│   Browser       │        │        Vercel (Next.js)       │
│                 │  HTTPS │                               │
│  Landing page   │───────▶│  /                (page)      │
│  Repo picker    │        │  /generate        (page)      │
│  Job status     │        │                               │
│  Audio player   │        │  /api/connect/start           │
└────────┬────────┘        │  /api/connect/callback        │
         │ poll            │  /api/repos                   │
         │                 │  /api/digests     (create job)│
         │                 │  /api/jobs/:id    (poll)      │
         │                 │                               │
         └────────────────▶│  waitUntil(runPipeline)       │
                           │     ├─ src/lib/core/sources   │
                           │     ├─        /script         │
                           │     └─        /render/voice   │
                           └───────┬──────────────┬────────┘
                                   │              │
                               ┌───▼────┐    ┌────▼─────┐
                               │Supabase│    │Composio  │
                               │  DB    │    │ GitHub   │
                               │ Storage│    │  API     │
                               └────────┘    └──────────┘

External APIs called from the pipeline:
  · Anthropic (Claude Sonnet 4.6) — classify + write
  · ElevenLabs — voice render
```

**Flow of a digest:**
1. Visitor clicks **Connect GitHub** → Composio OAuth redirects back → we upsert a `connections` row keyed by a cookie-session id.
2. Visitor picks a repo from a list fetched via Composio's GitHub tool.
3. Visitor picks `since` and `audience`, clicks Generate → POST `/api/digests` inserts a `jobs` row, kicks off `runPipeline(jobId)` via `waitUntil`, returns `{ jobId }`.
4. Client polls `/api/jobs/:id` every 2 s until `status ∈ {complete, failed}`.
5. On complete, audio player(s) load from Supabase Storage via fresh signed URLs.

**Why `waitUntil` is enough:** a typical pipeline run is 60–120 s. On Vercel Fluid/Pro, `waitUntil` can extend beyond the HTTP response up to `maxDuration`. `/api/digests` sets `maxDuration = 300`. Escalate to Supabase Edge Functions only if this ceiling actually bites.

---

## Code layout

Single `package.json` at repo root. Next.js App Router. Engine under `src/lib/core/` imports nothing from `next/*` — pure TS, testable in isolation, and reusable by the future CLI.

```
featwrap/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── page.tsx             # Landing: "Connect GitHub"
│   │   ├── generate/
│   │   │   └── page.tsx         # Repo picker + form + job status + player
│   │   ├── layout.tsx           # Shared chrome, fonts, theme
│   │   ├── globals.css
│   │   └── api/
│   │       ├── connect/
│   │       │   ├── start/route.ts     # POST → Composio auth URL
│   │       │   └── callback/route.ts  # GET  ← Composio redirect
│   │       ├── repos/route.ts         # GET  → list repos via Composio
│   │       ├── digests/route.ts       # POST → create job + waitUntil(run)
│   │       └── jobs/[id]/route.ts     # GET  → poll status
│   ├── lib/
│   │   ├── core/                # the engine — no Next.js imports
│   │   │   ├── index.ts         # generate({ source, audience }) façade
│   │   │   ├── sources/
│   │   │   │   ├── github.ts    # listMergedPRs + getPRDiff via Composio
│   │   │   │   └── classify.ts  # classifyPRs(prs) → LLM + cache
│   │   │   ├── script/
│   │   │   │   ├── writer.ts    # writeScript(prs, classifications, audience) → Script
│   │   │   │   └── prompts/
│   │   │   │       ├── base.ts
│   │   │   │       ├── marketing.ts
│   │   │   │       ├── sales.ts
│   │   │   │       ├── cs.ts
│   │   │   │       └── dev.ts
│   │   │   ├── render/
│   │   │   │   └── voice.ts     # renderVoice(script) → Buffer (MP3)
│   │   │   ├── pipeline.ts      # runPipeline(jobId) — orchestrates all of above
│   │   │   └── types.ts         # PR, Script, Audience, Job, Digest
│   │   ├── supabase/
│   │   │   ├── server.ts        # createClient() for server routes
│   │   │   └── storage.ts       # upload + signed-URL helpers
│   │   ├── composio/
│   │   │   └── client.ts        # initComposio(), github tool wrappers
│   │   └── session.ts           # cookie-based session id (middleware)
│   ├── components/              # UI primitives
│   └── styles/                  # design tokens
├── supabase/
│   └── migrations/
│       └── 0001_init.sql
├── scripts/
│   └── seed-demo-repo.ts        # creates/seeds featwrap/demo via GitHub API
├── tests/
│   ├── core/
│   └── fixtures/
├── .env.example
├── package.json
├── middleware.ts                # sets session cookie on first request
├── next.config.ts
├── tsconfig.json
└── vitest.config.ts
```

**Key rules:**
- `src/lib/core/**` never imports `next/*`. External I/O is isolated per module; tests mock at the module boundary.
- Web routes always write through the `jobs` table. CLI (deferred) would call `core.generate()` directly and write MP3 to local fs — no Supabase required.
- `src/lib/core/sources/github.ts` uses Composio exclusively in this session. A future CLI will add an `octokit` adapter sibling, same interface.

---

## Data model (Supabase)

Four tables. All IDs are uuids. Storage bucket `media` holds MP3 files (private; signed URLs issued on poll).

```sql
-- Anon session tied to a browser cookie. One row per connected GitHub account.
create table connections (
  id                uuid primary key default gen_random_uuid(),
  session_id        text not null,              -- cookie id
  provider          text not null default 'github',
  composio_conn_id  text not null,              -- Composio connection id
  github_login      text,                       -- e.g. "rameshh"
  created_at        timestamptz not null default now(),
  unique (session_id, provider)
);

-- A digest generation request. One row per click of Generate.
create table jobs (
  id             uuid primary key default gen_random_uuid(),
  connection_id  uuid references connections(id) on delete cascade,
  repo           text not null,                 -- "owner/name"
  since          text not null,                 -- e.g. "7d"
  audience       text not null,                 -- "marketing"|"sales"|"cs"|"dev"|"all"
  status         text not null default 'pending', -- pending|running|complete|failed
  step           text,                          -- current pipeline step (UI label)
  progress       int  not null default 0,       -- 0..100
  error          text,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);

-- Artifacts produced by a finished (or partially-finished) job.
-- One row per (job, audience) because audience='all' produces 4.
create table digests (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid references jobs(id) on delete cascade,
  audience      text not null,
  script        text not null,
  audio_path    text,                           -- "jobs/<job>/<aud>.mp3"
  pr_numbers    int[] not null default '{}',
  created_at    timestamptz not null default now()
);

-- Classification cache keyed on head_sha so re-runs are cheap.
create table pr_classifications (
  repo        text not null,
  pr_number   int  not null,
  head_sha    text not null,
  kind        text not null,                    -- "customer-facing" | "internal"
  reason      text,
  created_at  timestamptz not null default now(),
  primary key (repo, pr_number, head_sha)
);
```

**Storage bucket:** `media`, *private*. Path convention `jobs/{jobId}/{audience}.mp3`. Signed URLs expire after 1 h; client re-requests on each poll.

**RLS:** off for this session. All DB access is server-side via the Supabase **service-role key**. The browser never calls Supabase directly. Access is gated server-side on `session_id` from the cookie.

---

## Request lifecycle + auth flow

### (a) Connect GitHub (Composio)

```
Browser                    Vercel /api/connect           Composio        GitHub
   │                              │                          │              │
   │  click "Connect GitHub"      │                          │              │
   ├─────────────────────────────▶│ /api/connect/start       │              │
   │                              │  - ensure session cookie │              │
   │                              │  - composio.initiate     │              │
   │                              │    Connection({provider: │              │
   │                              │    "github"})            │              │
   │                              ├─────────────────────────▶│              │
   │                              │   { redirectUrl }        │              │
   │                              │◀─────────────────────────┤              │
   │  302 to Composio             │                          │              │
   │◀─────────────────────────────┤                          │              │
   │                                                         │              │
   │  user completes OAuth on Composio's hosted page, which sends them to  │
   │  GitHub and back                                        │              │
   ├────────────────────────────────────────────────────────▶│              │
   │                                                         │  auth OK     │
   │                                                         │◀─────────────┤
   │                                                         │              │
   │  302 back to /api/connect/callback?connId=…             │              │
   │◀────────────────────────────────────────────────────────┤              │
   │  GET /api/connect/callback   │                          │              │
   ├─────────────────────────────▶│                          │              │
   │                              │ - read session cookie    │              │
   │                              │ - composio.getConnection │              │
   │                              │ - upsert connections row │              │
   │                              │ - 302 to /generate       │              │
   │  302 /generate               │                          │              │
   │◀─────────────────────────────┤                          │              │
```

**Session cookie:** Next.js middleware sets `featwrap_sid` (httpOnly, sameSite=lax, 90-day) on any page GET that lacks it. That id is the `session_id` in `connections`. Clearing cookies = fresh identity.

**No GitHub tokens in our DB.** We store only the Composio *connection id*. GitHub API access goes through Composio (either a tool execution or a short-lived token).

### (b) Generate a digest

```
Browser                    /api/digests          waitUntil(runPipeline)        Supabase
   │ POST {repo, since,           │                     │                        │
   │       audience}              │                     │                        │
   ├─────────────────────────────▶│                     │                        │
   │                              │ insert jobs row     │                        │
   │                              ├────────────────────────────────────────────▶│
   │                              │ waitUntil(run(jobId)│                        │
   │                              ├────────────────────▶│                        │
   │  { jobId }                   │                     │                        │
   │◀─────────────────────────────┤                     │                        │
   │                                                    │                        │
   │ every 2 s: GET /api/jobs/:id │                     │                        │
   ├─────────────────────────────▶│                     │                        │
   │  { status, step, progress,   │                     │                        │
   │    digests: [ { audience,    │                     │                        │
   │      script, audio_url } ] } │                     │                        │
   │◀─────────────────────────────┤                     │                        │
   │                                                    │                        │
   │           … pipeline runs …                        │                        │
   │                                                    ├─ step="fetching"─────▶│
   │                                                    ├─ step="classifying"──▶│
   │                                                    ├─ step="writing"──────▶│
   │                                                    ├─ step="rendering"────▶│
   │                                                    ├─ upload mp3─────────▶│
   │                                                    ├─ insert digests row─▶│
   │                                                    └─ status=complete────▶│
```

### Pipeline steps (`src/lib/core/pipeline.ts`)

Each step updates `jobs.step` + `jobs.progress`.

| # | Step | Label shown to user | Rough time |
|---|---|---|---|
| 1 | Fetch merged PRs in window via Composio | Fetching pull requests | 1–3 s |
| 2 | Classify each PR (LLM, with `pr_classifications` cache) | Reading what shipped | 5–30 s |
| 3 | For each requested audience: write script (LLM) | Writing the script | 10–15 s per audience |
| 4 | For each script: render MP3 (ElevenLabs) | Recording the voice | 5–15 s per audience |
| 5 | Upload artifacts to Storage + insert `digests` rows | Uploading | <2 s |
| 6 | Mark job `complete` | — | — |

**Parallelism:** when `audience=all`, steps 3 and 4 run with `p-limit(2)` — two audiences in flight at a time. Bounds memory and external rate limits without going fully serial.

**Failure handling:** any step throws → catch in `runPipeline`, set `jobs.status='failed'` + `jobs.error=message`; any successfully-rendered `digests` rows stay (partial result). UI shows the error; retry re-creates a job (cheap because classifications cache hits).

---

## Pages — literal specs

### Landing (`/`)

- **Nav bar:** `featwrap` wordmark left; connection status pill right (`@rameshh connected` ↔ `not connected`).
- **Hero (sans display, 56 px):** "Turn every merged PR into a 90-second podcast your whole team will actually listen to."
- **Subhead (sans body, 17 px, `--ash`):** "One source. Four audiences. Zero drafting."
- **Primary CTA:** solid `[ Connect GitHub ]` button. On return with a live connection, CTA becomes `[ Start a digest → ]` routing to `/generate`.
- **Section: "HOW IT WORKS"** — mono small caps label, then four numbered steps (mono numeral + sans body):
  1. Connect your GitHub via Composio
  2. Pick a repo and a time window
  3. We classify, script, and render per audience
  4. Listen in-browser or download the MP3
- **Footer:** `featwrap v0.1` (mono, left) · `a hackathon build` (right).

### Generate (`/generate`)

Three areas stacked in a single 720–840 px column:

1. **Form** — card-less, flush to the column:
   - **Repo** — combobox; options pulled from `/api/repos`. Shows `owner/name` in mono. Supports typing to filter. If `/api/repos` fails, falls back to a plain text input.
   - **Since** — dropdown: `1 day`, `3 days`, `7 days` (default), `14 days`.
   - **Audience** — single-select dropdown with five options: `Marketing` (default), `Sales`, `CS`, `Engineering`, `All four`. Matches `jobs.audience` values `marketing|sales|cs|dev|all`.
   - **Generate** button — solid black.
2. **Job status card** — visible when a job exists. Bordered box rendered as terminal output:
   ```
   $ featwrap digest --repo featwrap/demo --since 7d --audience marketing
   [14:02:01] fetching pull requests        done
   [14:02:04] reading what shipped          ████████░░  4 of 5
   [14:02:19] writing the script            ───────
   [14:02:31] recording the voice           ───────
   ```
3. **Results** — visible when any digest completes. One card per audience:
   - Sans heading ("Marketing").
   - Custom minimal audio player: solid black square play/pause, thin black seek line, time in mono (`00:42 / 01:20`).
   - Text link `Download MP3`.

---

## Defaults — the spec's four open questions, answered

1. **Demo repo:** create new public repo `featwrap/demo`, seed 3 merged PRs: (1) a customer-facing feature PR, (2) a refactor PR, (3) a tiny copy-fix PR. Done via `scripts/seed-demo-repo.ts` using a GitHub PAT before demo.
2. **ElevenLabs voice:** one hardcoded default voice id (confident founder-style narrator — pick during impl), via `ELEVENLABS_VOICE_ID` env. No per-run voice selection UI.
3. **Script length:** target 60–90 s. Prompt enforces a **180–270 word** budget.
4. **Classifier:** pure LLM call (Claude Sonnet 4.6). File-path heuristics deferred.

---

## Brand direction

Brutalist minimalism, light mode. Structure through contrast, type scale, and hard edges — no ornament. Mono appears as an accent in targeted places (status pills, step labels, log output), not across body copy.

### Palette
| Token | Value | Role |
|---|---|---|
| `--paper`  | `#F7F5F0` | page background |
| `--ink`    | `#0A0A0A` | primary text, borders, solid buttons |
| `--ash`    | `#6E6A62` | secondary text |
| `--rule`   | `#1A1A1A` | dividers |
| `--accent` | `#FF5500` | single loud orange, ≤ once per screen |
| `--ok`     | `#1F7A3A` | success |
| `--err`    | `#B42318` | error |

### Typography
- **Body/display:** Geist Sans (fallback: Inter).
- **Mono accent:** Geist Mono (fallback: JetBrains Mono) — for small-caps labels, connection pills, job log output, hero `$` caret, footer version tag.
- **Scale:** 13 / 15 / 17 / 22 / 32 / 56 px. Display tight leading (1.05), body 1.45.
- **Weights:** display 600, body 400, small-caps labels 500 tracking +0.06em.

### Chrome rules
- No drop shadows, gradients, or emojis.
- Borders `1px solid var(--ink)`.
- Border-radius `0` globally (exception: `2px` on inline code chips).
- Spacing: multiples of 8 only.
- Single max-width column (720–840 px), flush-left, generous vertical whitespace.

### Components
- **Button primary:** solid `--ink` bg, `--paper` text, square, sans. Hover: bg → `--accent`.
- **Button secondary:** transparent, 1px `--ink` border. Hover: inverts.
- **Input:** bottom-border only, 1px `--ink`, no box.
- **Status pill:** mono small-caps, 1px bordered square chip.
- **Job log card:** bordered box with mono lines, timestamp prefix, ascii progress bars (`████░░░░`).
- **Result card:** rule line above, sans heading, audio player, text-link download.
- **Audio player:** custom; solid black play/pause square, thin hairline seek, time in mono.
- **Toast / error:** red mono line prefixed `error:`, inline, no modal.

---

## Testing strategy

Hackathon-appropriate — cover the engine, not the UI.

- **Vitest on `src/lib/core/`:**
  - `sources/classify.ts` — fixture PRs + mocked Claude → classification shape and cache read/write.
  - `script/writer.ts` — fixture PRs + classifications + mocked Claude → correct prompt per audience, word-budget sanity.
  - `pipeline.ts` — all boundaries mocked → status transitions, partial-failure handling, signed-URL issuance.
- **No tests** on Next.js route handlers or React UI.
- **Manual smoke** on the seeded demo repo before final deploy.
- **Fixtures** in `tests/fixtures/` — real PR JSON captured once from the demo repo, replayed in tests. Zero network calls in tests.
- **Dev flags** to avoid blowing external quotas during iteration:
  - `FEATWRAP_STUB_LLM=1` — returns fixture classifications + scripts, no Anthropic calls.
  - `FEATWRAP_STUB_VOICE=1` — returns a 1 s silent MP3, no ElevenLabs calls.

---

## Risks

| # | Risk | Mitigation |
|---|---|---|
| 1 | Composio OAuth misconfigured | Wire Composio first (dashboard + env vars). Smoke-test `/api/connect/callback` against a toy route before writing app code. |
| 2 | Vercel `maxDuration` exceeded on `audience=all` | `p-limit(2)` for LLM + render calls; partial results land as each finishes. |
| 3 | ElevenLabs quota blown during dev | `FEATWRAP_STUB_VOICE=1` dev flag; real voice only with explicit env. |
| 4 | Anthropic rate/cost during dev | `pr_classifications` cache; `FEATWRAP_STUB_LLM=1` flag. |
| 5 | Seeded demo repo missing | Create `featwrap/demo` and seed 3 PRs first thing, before code. |
| 6 | Signed URL expires mid-demo | Client requests fresh signed URLs on each poll and on player mount. |
| 7 | First-visit session cookie race | Middleware sets `featwrap_sid` on any page GET; `/connect/start` is always reached after a landing visit. |
| 8 | Vercel Hobby timeout limits | Confirm plan tier pre-build; enable Pro for hackathon if needed. |

## Stopping rules (wall-clock gates)

- **T+60 min** — Demo repo seeded. Composio configured. Supabase migration applied. Placeholder Next.js app deployed to Vercel. *If not: stop adding; debug deploy.*
- **T+2 h** — Engine passes Vitest green. End-to-end pipeline works locally on the seeded repo; real MP3 in `/tmp/…`. *If not: drop audience multi-select; hardcode to `marketing`.*
- **T+3 h** — Web flow works locally: Connect GitHub → pick repo → Generate → audio plays. *If not: drop repo picker; let user type `owner/name`.*
- **T+4 h** — Deployed and demo-ready on Vercel URL. *If not: demo over localhost + Cloudflare Tunnel.*
- **T+4.5 h** — Polish pass (copy, spacing, loading states, error states).

---

## Environment variables

```
# Anthropic
ANTHROPIC_API_KEY=

# ElevenLabs
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=           # single default voice

# Composio
COMPOSIO_API_KEY=
COMPOSIO_GITHUB_INTEGRATION_ID=
COMPOSIO_REDIRECT_URL=         # https://<vercel-domain>/api/connect/callback

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
SESSION_COOKIE_SECRET=
FEATWRAP_STUB_LLM=             # "1" to stub during dev
FEATWRAP_STUB_VOICE=           # "1" to stub during dev
```

---

## Submittable artifact

One Vercel URL. Visit → Connect GitHub → pick `featwrap/demo` → Generate → audio plays in browser. 60–90 s MP3 per audience; `audience=all` produces four MP3s showing the same PRs re-narrated four ways.

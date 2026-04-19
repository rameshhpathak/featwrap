# Featwrap — Product Requirements Document

**Date:** 2026-04-19
**Status:** Approved for Phase 1 implementation
**Context:** Hackathon build — solo, 4–5 hour budget

---

## One-line pitch

**Featwrap turns every day's or week's worth of merged PRs into a tone-calibrated podcast (and later, a social reel) so your whole org — marketing, sales, CS, and engineering — actually knows what just shipped.**

## The problem

AI agents now ship more PRs than humans can read. And while engineers at least skim the diffs, the rest of the company — marketing, sales, customer success, account executives — has near-zero visibility into product changes until someone Slacks them. Text changelogs don't get read. Review-summary tools exist for engineers (CodeRabbit, Graphite) but nothing serves non-technical stakeholders.

## The insight

Human attention is the scarce resource, not information. A 90-second podcast is infinitely more consumable than a week of diffs. The *same* PRs can be re-narrated with different framing — marketing hears the customer-facing talking point, sales hears the pitch unlock, CS hears the support implication. One source, four audiences, minimal extra cost per audience (just a prompt swap and another ElevenLabs render).

## Target user

Solo founders and PMs running 1–5 person teams that ship a lot of AI-generated PRs. They need their whole org to stay in the loop without drowning non-engineers in technical detail. They buy once, and the whole company benefits.

## Core abstraction

Every shipping surface in every phase calls the same core:

```ts
featwrap.generate({
  sources,   // PR | PR[] | { repo, since }
  audience,  // "marketing" | "sales" | "cs" | "dev"
  format,    // "podcast" (Phase 1) | "reel" (Phase 2)
}) → MediaFile
```

CLI, web app, scheduled job, future GitHub App — all thin wrappers around this.

---

## Phased delivery

### Phase 1 — Podcast engine (CLI) — target ~2 h

Ships a real, usable tool:

```bash
featwrap digest \
  --repo owner/name \
  --since <duration>        # e.g. "1d", "3d", "7d", "14d" — any Nd/Nh string
  --audience marketing|sales|cs|dev|all \
  --out ./out/
```

**Flow:**
1. Fetch **merged** PRs in the time window via Octokit (title, body, unified diff). Open/draft PRs are excluded in Phase 1.
2. Classify each PR: `customer-facing` vs `internal`
3. Per requested audience: Claude Sonnet 4.6 writes a 60–90s podcast script
4. ElevenLabs renders each script → MP3
5. Save to `./out/digest-{audience}-{date}.mp3`, print paths

**Keys via env:** `GITHUB_TOKEN`, `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`

**Submittable stand-alone:** *"CLI that turns any day or week of your PRs into per-audience podcasts."*

### Phase 2 — Social reel output — target ~1.5 h

Adds a new `--format reel` flag. Uses **Remotion** (React video composition) to render 9:16 / 1:1 motion-graphics video. Same script, same voice, now with captions, motion, and PR highlights on-screen. Built on top of Phase 1's script + audio — no rewrite.

**Submittable stand-alone:** *"CLI that produces podcasts AND social reels from your PR activity."*

### Phase 3 — Minimal web app — target ~1.5 h

Adds a Next.js front-door:

1. Paste GitHub token (OAuth later)
2. Pick repo, date range, audience, format
3. Click Generate
4. Download or play in-browser

Same core engine, web-wrapped. This is the "connect your GitHub" UX in its thinnest shippable form.

**Submittable stand-alone:** *"Featwrap.app — turn your GitHub activity into podcasts and reels."*

### Phase 4 — Scheduled delivery — stretch ~1 h

Adds daily/weekly cron per user. Delivers to email / Slack webhook / GitHub release asset. This is the first glimpse of the full product vision.

---

## Architecture

Module boundaries (Phase 1 targets; grow in later phases):

```
src/
  sources/
    github.ts       # fetchPRs(window) → PR[]
    classify.ts     # classifyPRs(prs) → { customerFacing, internal }
  script/
    writer.ts       # writeScript(prs, audience, format) → Script
    prompts/        # one template per audience
  render/
    voice.ts        # renderVoice(script) → AudioFile
    video.ts        # Phase 2: renderVideo(script, audio) → VideoFile
  cli.ts            # argv wiring, thin
  index.ts          # exported generate() for later surfaces
```

Each module has one clear purpose, communicates through a well-defined interface, and can be tested independently. Mock the GitHub + LLM + ElevenLabs boundaries for unit tests.

---

## Brand & aesthetic direction

Featwrap must feel **YC-level minimal-modern** — peer aesthetic to **Browserbase, ElevenLabs, and OpenCode**. This shapes every user-visible surface:

- **CLI output:** restrained ANSI colour, structured alignment, no decorative banners, no emojis in chrome
- **Web UI (Phase 3):** dark-default, one accent colour, mono font for code (Geist Mono / IBM Plex Mono tier), sans-serif body (Inter / Geist), generous whitespace, thin borders, no drop shadows
- **README + landing:** short confident sentences, dense information per line, quotable taglines, no marketing fluff
- **Narration persona:** sharp, confident, startup-founder voice (pick ElevenLabs voice accordingly); not a corporate announcer

Rule of thumb: *if it would look out of place on browserbase.com, elevenlabs.io, or opencode.ai, it's wrong.*

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript (Node 20+) | matches original memo, great ecosystem for GitHub + Remotion |
| GitHub | Octokit (`@octokit/rest`) | canonical GitHub client |
| LLM | Anthropic Claude Sonnet 4.6 | strong code+prose, tool use later |
| Voice | ElevenLabs SDK | best voice quality for the "entertaining" thesis |
| Video (P2) | Remotion | React-based composition, good for programmatic motion |
| Web (P3) | Next.js (App Router) | fastest React-based UI + API routes |
| CLI | `commander` | dead simple argv parsing |
| Tests | Vitest | fast, TS-native |

---

## Audience tone prompts (Phase 1)

| Audience | Prompt framing |
|---|---|
| **Marketing** | *"What's the customer-facing narrative? What can copy / ads / social now say about this?"* |
| **Sales** | *"What does this unlock in pitches? What objection does it kill? What new use case can you lead with?"* |
| **CS / Support** | *"What will customers notice? What might they ask about? Anything to watch for in tickets?"* |
| **Engineering** | *"What changed technically, and why? Any architecture decisions or gotchas worth noting?"* |

All four share the same PR fetch + classifier result. Only the final writing prompt differs. `--audience all` loops through all four, producing four MP3s.

**Cost note:** `--audience all` runs 4× LLM script calls + 4× ElevenLabs renders. For a 90s script (~1,500 chars) that's ~6,000 chars of ElevenLabs usage per digest — still well within a free/starter tier but worth surfacing in the README so users understand their bill.

---

## Classifier

Before the script runs, an LLM call classifies each PR:

- `customer-facing` — new feature, UX change, user-visible bugfix, copy change, performance win users will feel
- `internal` — refactor, dep bump, test-only, CI/infra, typo in code comments

The script treats customer-facing PRs as the main story and rolls internal PRs into a one-line coda ("Also shipped: 3 behind-the-scenes improvements"). This is what makes the podcast feel *intelligent* rather than a narrated diff.

---

## Demo plan

1. Create a public demo repo `featwrap/demo` with 3 seeded merged PRs:
   - PR #1: customer-facing — "Add price filter to search" (real UI change)
   - PR #2: refactor — "Extract cart hook" (internal)
   - PR #3: fix — "Typo in tooltip copy" (minor customer-facing)
2. Run `featwrap digest --repo featwrap/demo --since 1d --audience marketing --out ./out`
3. Play the MP3 live (60–90s)
4. Stretch: run `--audience all`, play two different tones back-to-back — sales vs CS — same PRs, different story

This demo visibly shows:
- The tool *filters* noise (refactor only mentioned as coda)
- The tool *adapts tone* to audience
- The output is *listenable*, not a wall of text

---

## Submission safety net

Each phase leaves a real, demoable product. If we stop at:

- **End of Phase 1:** "CLI that turns PR activity into per-audience podcasts" — shippable.
- **End of Phase 2:** "… and social reels" — shippable.
- **End of Phase 3:** "Featwrap.app — web tool for the above" — shippable.
- **End of Phase 4:** "Featwrap — the podcast for your shipping team" — YC-pitchable.

No phase regresses into "nothing works."

---

## Out of scope for the hackathon

- GitHub OAuth (Phase 1 uses token paste)
- Real-time PR webhooks / GitHub App install flow
- Browser recording / Loom-style output (deferred; not the right bet for 4–5 h)
- Multi-tenancy, user accounts, billing, dashboards
- Per-voice persona customization beyond audience flag
- Multi-language / non-English narration

---

## Success criteria per phase

- **Phase 1:** seeded demo produces a listenable MP3 for each audience in < 60 s of CLI runtime; classifier correctly flags at least the refactor as internal
- **Phase 2:** reel output is 9:16, 30–60 s, captioned, with PR titles/highlights on-screen
- **Phase 3:** single browser visit → one click → MP3 or MP4 downloaded, no CLI required
- **Phase 4:** cron fires on schedule, delivers to configured destination

---

## First-day housekeeping

- Rename folder from `agentloom/` to `featwrap/` (or add a package name override — cosmetic, not blocking)
- Add `.gitignore` entries for `/out/`, `.env`, `node_modules/`, `.superpowers/`
- `.env.example` with the three required keys documented

---

## Open questions (answer before or during Phase 1 impl)

1. **Demo repo:** create new under user's GitHub, or use an existing repo? → leaning "create new, seeded" for demo reliability
2. **ElevenLabs voice selection:** pick one default voice for Phase 1 or allow `--voice` flag? → default one voice; `--voice` flag stretch
3. **Script length target:** 60s, 90s, or adaptive based on PR count? → target 60–90s Phase 1, adaptive Phase 2+
4. **Classifier heuristic:** pure LLM call, or LLM + file-path heuristics (docs/test paths → internal)? → pure LLM for Phase 1, add heuristics if budget allows

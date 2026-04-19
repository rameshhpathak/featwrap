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

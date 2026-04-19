import type { Audience, PRClassification, PullRequest, Script } from '../types';
import type { LLMCompleteFn } from '../sources/classify';
import { BASE_SYSTEM, buildBaseSystem } from './prompts/base';
import { MARKETING_ANGLE } from './prompts/marketing';
import { SALES_ANGLE } from './prompts/sales';
import { CS_ANGLE } from './prompts/cs';
import { DEV_ANGLE } from './prompts/dev';

export interface WriterDeps {
  llmComplete: LLMCompleteFn;
}

export interface WriterOptions {
  // Target a specific length band for the narration.
  minWords: number;
  maxWords: number;
  windowDescription: string; // "a day", "a week", "the last month", etc.
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
  options?: WriterOptions,
): Promise<Script> {
  const base = options
    ? buildBaseSystem(options)
    : BASE_SYSTEM;
  const system = `${base}\n\n${ANGLES[audience]}`;
  const user = buildUserPrompt(prs, classifications);
  // Target token budget scaled to the word budget (loose 1.4 tokens/word) + a
  // buffer for the system prompt overhead.
  const maxWords = options?.maxWords ?? 270;
  const maxTokens = Math.max(700, Math.ceil(maxWords * 1.7) + 200);
  const res = await deps.llmComplete({ system, user, maxTokens });
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

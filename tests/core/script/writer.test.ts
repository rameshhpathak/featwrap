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

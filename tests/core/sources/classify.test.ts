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

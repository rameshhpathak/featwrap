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

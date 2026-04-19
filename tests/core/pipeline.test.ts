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
    expect(deps.writeScript).toHaveBeenCalledWith(
      prs,
      classifications,
      'marketing',
      expect.objectContaining({ minWords: expect.any(Number), maxWords: expect.any(Number), windowDescription: expect.any(String) }),
    );
    expect(deps.renderVoice).toHaveBeenCalledOnce();
    expect(deps.storage.uploadMp3).toHaveBeenCalledWith('j1', 'marketing', expect.any(Buffer));
    expect(deps.db.insertDigest).toHaveBeenCalledWith(expect.objectContaining({
      job_id: 'j1', audience: 'marketing', script: 'script-marketing', audio_path: 'jobs/j1/marketing.mp3', pr_numbers: [12],
    }));
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
    (deps.writeScript as ReturnType<typeof vi.fn>)
      .mockImplementationOnce(async () => ({ audience: 'marketing', text: 'ok', wordCount: 5, prNumbers: [12] }))
      .mockRejectedValueOnce(new Error('sales boom'))
      .mockImplementation(async (_p, _c, aud: Audience) => ({ audience: aud, text: `script-${aud}`, wordCount: 5, prNumbers: [12] }));
    await runPipeline({ jobId: 'j4', repo: 'o/r', since: '7d', audience: 'all', composioConnId: 'cc', connectionId: 'conn' }, deps);
    expect((deps.db.insertDigest as ReturnType<typeof vi.fn>).mock.calls.some(
      c => (c[0] as { audience: string }).audience === 'marketing',
    )).toBe(true);
  });
});

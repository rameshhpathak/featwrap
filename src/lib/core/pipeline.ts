import pLimit from 'p-limit';
import type {
  Audience, AudienceRequest, PipelineContext, PullRequest, PRClassification, Script,
} from './types';

export interface WriteScriptOptions {
  minWords: number;
  maxWords: number;
  windowDescription: string;
}

export interface PipelineDeps {
  fetchPRs(repo: string, since: string, composioConnId: string): Promise<PullRequest[]>;
  classifyPRs(prs: PullRequest[], repo: string): Promise<PRClassification[]>;
  writeScript(
    prs: PullRequest[],
    classifications: PRClassification[],
    audience: Audience,
    options?: WriteScriptOptions,
  ): Promise<Script>;
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

function parseSinceDays(since: string): number {
  const m = /^(\d+)([dh])$/.exec(since);
  if (!m) return 7;
  const n = parseInt(m[1], 10);
  return m[2] === 'd' ? n : n / 24;
}

/**
 * Compute a narration length band from the window + PR count so a daily digest
 * doesn't come out as long as a monthly one. Roughly: 160 words ≈ 60 s of
 * conversational narration.
 */
export function targetWordRange(since: string, prCount: number): WriteScriptOptions {
  const days = parseSinceDays(since);

  let baseMin: number;
  let baseMax: number;
  let windowDescription: string;

  if (days <= 1)        { baseMin = 100; baseMax = 160; windowDescription = 'a single day'; }
  else if (days <= 3)   { baseMin = 150; baseMax = 230; windowDescription = 'the last few days'; }
  else if (days <= 7)   { baseMin = 220; baseMax = 360; windowDescription = 'a week'; }
  else if (days <= 14)  { baseMin = 340; baseMax = 520; windowDescription = 'the last two weeks'; }
  else if (days <= 30)  { baseMin = 500; baseMax = 780; windowDescription = 'the last month'; }
  else                  { baseMin = 650; baseMax = 1100; windowDescription = `the last ${Math.round(days)} days`; }

  // Nudge by PR volume, bounded so it can't run away on either side.
  const prAdjust = Math.min(220, Math.max(-90, (prCount - 5) * 22));
  const minWords = Math.max(80, baseMin + Math.round(prAdjust / 2));
  const maxWords = Math.max(minWords + 60, baseMax + prAdjust);

  return { minWords, maxWords, windowDescription };
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

    const target = targetWordRange(since, prs.length);

    await deps.db.updateJob(jobId, { step: 'writing the script', progress: 40 });

    let completed = 0;
    await Promise.all(audiences.map(aud => limit(async () => {
      try {
        const script = await deps.writeScript(prs, classifications, aud, target);
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
        console.error(`[pipeline] audience=${aud} failed:`, err);
      }
    })));

    await deps.db.updateJob(jobId, { status: 'complete', progress: 100, completed_at: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await deps.db.updateJob(jobId, { status: 'failed', error: message });
  }
}

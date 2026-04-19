'use client';
import { useEffect, useRef, useState } from 'react';
import { JobLog } from './JobLog';
import { Results } from './Results';
import { SINCE } from './GenerateForm';

interface DigestResp {
  audience: string;
  script: string;
  prNumbers: number[];
  audioUrl: string | null;
}

interface JobResp {
  id: string;
  status: string;
  step: string | null;
  progress: number;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  digests: DigestResp[];
}

interface JobViewProps {
  jobId: string;
  repo: string;
  since: string;
  audience: string;
  onRetryWithSince?: (newSince: string) => void;
}

function sinceToDays(v: string): number {
  const m = /^(\d+)([dh])$/.exec(v);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  return m[2] === 'd' ? n : n / 24;
}

function isNoPRError(err: string | null): boolean {
  return !!err && /no merged prs/i.test(err);
}

export function JobView({ jobId, repo, since, audience, onRetryWithSince }: JobViewProps) {
  const [job, setJob] = useState<JobResp | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function tick() {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) return;
      const data = (await res.json()) as JobResp;
      setJob(data);
      if (data.status === 'complete' || data.status === 'failed') {
        if (timer.current) clearInterval(timer.current);
      }
    }
    tick();
    timer.current = setInterval(tick, 2000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [jobId]);

  if (!job) {
    return (
      <div className="border-2 border-ink bg-paper p-8 font-mono text-[13px] text-ash">
        starting…
      </div>
    );
  }

  const showNoPRHelp = job.status === 'failed' && isNoPRError(job.error);

  return (
    <div className="space-y-10">
      <JobLog
        repo={repo}
        since={since}
        audience={audience}
        step={job.step}
        progress={job.progress}
        status={job.status}
        error={job.error}
        startedAt={job.createdAt}
      />

      {showNoPRHelp && onRetryWithSince && (
        <NoPRsHelp currentSince={since} onRetryWithSince={onRetryWithSince} />
      )}

      {job.digests.length > 0 && <Results digests={job.digests} />}
    </div>
  );
}

function NoPRsHelp({ currentSince, onRetryWithSince }: { currentSince: string; onRetryWithSince: (v: string) => void }) {
  const currentDays = sinceToDays(currentSince);
  const suggestions = SINCE
    .filter(s => sinceToDays(s.v) > currentDays)
    .slice(0, 4);

  return (
    <div className="border-2 border-ink bg-accent/30">
      <div className="h-11 flex items-center px-5 bg-ink text-paper font-mono text-[12px] tracking-[0.14em] uppercase">
        ▸ Try a wider window
      </div>
      <div className="p-7">
        <p className="font-serif text-[20px] leading-[1.4] max-w-[620px]">
          No merged PRs in the last <span className="font-bold">{currentSince}</span>.
          Most teams ship in bursts — widening the window usually gets you enough material for a digest.
        </p>
        {suggestions.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            {suggestions.map(s => (
              <button
                key={s.v}
                type="button"
                onClick={() => onRetryWithSince(s.v)}
                className="inline-flex items-center h-12 px-5 border-2 border-ink bg-paper font-mono text-[13px] font-semibold tracking-[0.14em] uppercase hover:bg-ink hover:text-paper transition-colors"
              >
                Try {s.l} →
              </button>
            ))}
          </div>
        )}
        <p className="mt-6 font-mono text-[11px] tracking-[0.14em] uppercase text-ink/70">
          Or pick a more active repo from the list.
        </p>
      </div>
    </div>
  );
}

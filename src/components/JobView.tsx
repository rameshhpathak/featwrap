'use client';
import { useEffect, useRef, useState } from 'react';
import { JobLog } from './JobLog';

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

export function JobView({ jobId }: { jobId: string }) {
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

  if (!job) return <p className="font-mono text-ash">starting…</p>;

  return (
    <div className="space-y-10">
      <JobLog
        repo="— repo —"
        since="—"
        audience="—"
        step={job.step}
        progress={job.progress}
        status={job.status}
        error={job.error}
        startedAt={job.createdAt}
      />
      {job.digests.length > 0 && (
        <ul className="space-y-4">
          {job.digests.map(d => (
            <li key={d.audience} className="font-mono text-[13px]">
              {d.audience} — {d.audioUrl ? 'ready' : 'rendering…'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

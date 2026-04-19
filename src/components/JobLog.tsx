interface JobLogProps {
  repo: string;
  since: string;
  audience: string;
  step: string | null;
  progress: number;
  status: string;
  error: string | null;
  startedAt: string;
}

function bar(progress: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(progress / 10)));
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function ts(d: string) {
  return new Date(d).toISOString().slice(11, 19);
}

export function JobLog(p: JobLogProps) {
  const statusNote =
    p.status === 'complete' ? 'done' :
    p.status === 'failed' ? `error: ${p.error ?? 'unknown'}` :
    `${bar(p.progress)}  ${p.progress}%`;
  return (
    <div className="border border-ink p-6 font-mono text-[13px] leading-[1.8] bg-paper">
      <div className="text-ash mb-2">
        $ featwrap digest --repo {p.repo} --since {p.since} --audience {p.audience}
      </div>
      <div>
        [{ts(p.startedAt)}] {p.step ?? 'starting'}  <span className={p.status === 'failed' ? 'text-err' : p.status === 'complete' ? 'text-ok' : ''}>{statusNote}</span>
      </div>
    </div>
  );
}

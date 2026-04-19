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
  const filled = Math.max(0, Math.min(24, Math.round(progress / 100 * 24)));
  return '█'.repeat(filled) + '░'.repeat(24 - filled);
}

function ts(d: string) {
  return new Date(d).toISOString().slice(11, 19);
}

export function JobLog(p: JobLogProps) {
  const statusNote =
    p.status === 'complete' ? 'done' :
    p.status === 'failed' ? `error: ${p.error ?? 'unknown'}` :
    `${bar(p.progress)}  ${p.progress}%`;
  const statusColor =
    p.status === 'failed' ? 'text-err' :
    p.status === 'complete' ? 'text-ok' :
    '';
  return (
    <div className="border-2 border-ink bg-paper">
      <div className="flex items-center justify-between h-11 px-5 bg-ink text-paper font-mono text-[12px] tracking-[0.14em] uppercase">
        <span>▸ Pipeline</span>
        <span className="opacity-75">{p.status}</span>
      </div>
      <div className="p-6 font-mono text-[13px] leading-[1.85]">
        <div className="text-ash mb-3">
          $ featwrap digest --repo {p.repo || '—'} --since {p.since || '—'} --audience {p.audience || '—'}
        </div>
        <div>
          <span className="text-ash">[{ts(p.startedAt)}]</span>{' '}
          {p.step ?? 'starting'}{'  '}
          <span className={statusColor}>{statusNote}</span>
        </div>
      </div>
    </div>
  );
}

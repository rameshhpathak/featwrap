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
  const filled = Math.max(0, Math.min(24, Math.round((progress / 100) * 24)));
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
    p.status === 'failed' ? 'text-accent-red' :
    p.status === 'complete' ? 'text-foreground' :
    '';

  return (
    <div className="brutal-border bg-background">
      <div className="flex items-center justify-between px-5 py-3 bg-foreground text-background font-mono text-[11px] tracking-wider">
        <span>▸ PIPELINE</span>
        <span className="opacity-80">{p.status.toUpperCase()}</span>
      </div>
      <div className="p-6 font-mono text-[13px] leading-[1.85]">
        <div className="text-muted-foreground mb-3">
          $ featwrap digest --repo {p.repo || '—'} --since {p.since || '—'} --audience {p.audience || '—'}
        </div>
        <div>
          <span className="text-muted-foreground">[{ts(p.startedAt)}]</span>{' '}
          <span className="font-medium">{p.step ?? 'starting'}</span>{'  '}
          <span className={statusColor}>{statusNote}</span>
        </div>
      </div>
    </div>
  );
}

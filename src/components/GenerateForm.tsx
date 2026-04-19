'use client';
import { useState } from 'react';
import { Button } from './Button';
import { RepoPicker } from './RepoPicker';
import { JobView } from './JobView';

export const SINCE = [
  { v: '1d', l: '1 day' },
  { v: '3d', l: '3 days' },
  { v: '7d', l: '7 days' },
  { v: '14d', l: '14 days' },
  { v: '30d', l: '30 days' },
  { v: '90d', l: '90 days' },
];

const AUDIENCES = [
  { v: 'marketing', code: 'MKT', l: 'Marketing' },
  { v: 'sales', code: 'SLS', l: 'Sales' },
  { v: 'cs', code: 'CS', l: 'Support' },
  { v: 'dev', code: 'ENG', l: 'Engineering' },
  { v: 'all', code: 'ALL', l: 'All four' },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-mono text-[11px] tracking-wider text-muted-foreground mb-3">
      {children}
    </label>
  );
}

export function GenerateForm() {
  const [repo, setRepo] = useState('');
  const [since, setSince] = useState('7d');
  const [audience, setAudience] = useState('marketing');
  const [jobId, setJobId] = useState<string | null>(null);
  const [activeSince, setActiveSince] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(overrides?: { since?: string }) {
    const useSince = overrides?.since ?? since;
    setErr(null);
    if (!repo) { setErr('Pick or type a repo.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/digests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ repo, since: useSince, audience }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'failed');
      setJobId(data.jobId);
      setActiveSince(useSince);
      if (overrides?.since) setSince(useSince);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed');
    } finally {
      setLoading(false);
    }
  }

  if (jobId) {
    return (
      <JobView
        jobId={jobId}
        repo={repo}
        since={activeSince}
        audience={audience}
        onRetryWithSince={newSince => {
          setJobId(null);
          void submit({ since: newSince });
        }}
      />
    );
  }

  const selectClass =
    'w-full font-mono text-sm px-4 py-3 brutal-border bg-paper ' +
    'placeholder:text-muted-foreground focus:outline-none focus:bg-accent-yellow';

  return (
    <div className="brutal-border bg-background p-6 md:p-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <FieldLabel>REPO</FieldLabel>
          <RepoPicker value={repo} onChange={setRepo} />
        </div>
        <div>
          <FieldLabel>SINCE</FieldLabel>
          <select
            value={since}
            onChange={e => setSince(e.target.value)}
            className={selectClass}
          >
            {SINCE.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>
      </div>

      <div>
        <FieldLabel>AUDIENCE</FieldLabel>
        <div className="flex flex-wrap">
          {AUDIENCES.map((a, i) => {
            const active = audience === a.v;
            return (
              <button
                key={a.v}
                type="button"
                onClick={() => setAudience(a.v)}
                className={`font-mono text-xs tracking-wider px-4 py-3 brutal-border ${
                  active
                    ? 'bg-foreground text-background relative z-10'
                    : 'bg-paper text-foreground hover:bg-accent-yellow'
                } ${i > 0 ? '-ml-[3px]' : ''}`}
              >
                {a.code} · {a.l.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      {err && (
        <div className="brutal-border bg-accent-red/10 px-4 py-3 font-mono text-sm text-accent-red">
          ERROR · {err}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <Button onClick={() => submit()} disabled={loading}>
          {loading ? 'Starting…' : 'Generate digest →'}
        </Button>
        <span className="font-mono text-[11px] tracking-wider text-muted-foreground">
          60–90 SECONDS · MP3 IN YOUR BROWSER
        </span>
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { Button } from './Button';
import { RepoPicker } from './RepoPicker';
import { JobView } from './JobView';

const SINCE = [
  { v: '1d', l: '1 day' },
  { v: '3d', l: '3 days' },
  { v: '7d', l: '7 days' },
  { v: '14d', l: '14 days' },
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
    <label className="block font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-ash mb-3">
      {children}
    </label>
  );
}

export function GenerateForm() {
  const [repo, setRepo] = useState('');
  const [since, setSince] = useState('7d');
  const [audience, setAudience] = useState('marketing');
  const [jobId, setJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!repo) { setErr('Pick or type a repo.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/digests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ repo, since, audience }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'failed');
      setJobId(data.jobId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed');
    } finally {
      setLoading(false);
    }
  }

  if (jobId) return <JobView jobId={jobId} repo={repo} since={since} audience={audience} />;

  return (
    <div className="border-2 border-ink bg-paper">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="p-8 md:border-r-2 border-ink">
          <FieldLabel>Repo</FieldLabel>
          <RepoPicker value={repo} onChange={setRepo} />
        </div>
        <div className="p-8 border-t-2 md:border-t-0 border-ink">
          <FieldLabel>Since</FieldLabel>
          <select
            value={since}
            onChange={e => setSince(e.target.value)}
            className="w-full h-14 px-4 bg-paper-2 border border-ink font-mono text-[15px] focus:outline-none focus:bg-accent"
          >
            {SINCE.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>
      </div>

      <div className="border-t-2 border-ink p-8">
        <FieldLabel>Audience</FieldLabel>
        <div className="flex flex-wrap gap-px">
          {AUDIENCES.map(a => {
            const active = audience === a.v;
            return (
              <button
                key={a.v}
                type="button"
                onClick={() => setAudience(a.v)}
                className={
                  'flex items-center gap-3 px-5 h-14 border border-ink font-mono text-[13px] font-semibold tracking-[0.1em] uppercase transition-colors ' +
                  (active ? 'bg-ink text-paper' : 'bg-paper hover:bg-accent')
                }
              >
                <span className="text-[11px] tracking-[0.2em] opacity-80">{a.code}</span>
                <span className="opacity-50">·</span>
                <span>{a.l}</span>
              </button>
            );
          })}
        </div>
      </div>

      {err && (
        <div className="border-t-2 border-ink p-6 font-mono text-[13px] text-err">
          error: {err}
        </div>
      )}

      <div className="border-t-2 border-ink p-8 flex flex-wrap items-center gap-5">
        <Button onClick={submit} disabled={loading}>
          {loading ? 'Starting…' : 'Generate digest →'}
        </Button>
        <span className="font-mono text-[12px] tracking-[0.14em] uppercase text-ash">
          60–90 seconds · MP3 in your browser
        </span>
      </div>
    </div>
  );
}

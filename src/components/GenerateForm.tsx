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
  { v: 'marketing', l: 'Marketing' },
  { v: 'sales', l: 'Sales' },
  { v: 'cs', l: 'CS' },
  { v: 'dev', l: 'Engineering' },
  { v: 'all', l: 'All four' },
];

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

  if (jobId) return <JobView jobId={jobId} />;

  return (
    <div className="space-y-10">
      <div>
        <label className="block font-mono text-[12px] uppercase tracking-[0.08em] text-ash mb-2">Repo</label>
        <RepoPicker value={repo} onChange={setRepo} />
      </div>

      <div>
        <label className="block font-mono text-[12px] uppercase tracking-[0.08em] text-ash mb-2">Since</label>
        <select
          value={since}
          onChange={e => setSince(e.target.value)}
          className="w-full bg-transparent border-0 border-b border-ink h-12 text-[17px] focus:outline-none focus:border-accent"
        >
          {SINCE.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </div>

      <div>
        <label className="block font-mono text-[12px] uppercase tracking-[0.08em] text-ash mb-2">Audience</label>
        <select
          value={audience}
          onChange={e => setAudience(e.target.value)}
          className="w-full bg-transparent border-0 border-b border-ink h-12 text-[17px] focus:outline-none focus:border-accent"
        >
          {AUDIENCES.map(a => <option key={a.v} value={a.v}>{a.l}</option>)}
        </select>
      </div>

      {err && <p className="font-mono text-err">error: {err}</p>}

      <Button onClick={submit} disabled={loading}>
        {loading ? 'Starting…' : 'Generate'}
      </Button>
    </div>
  );
}

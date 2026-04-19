'use client';
import { useEffect, useState } from 'react';

interface Repo { fullName: string; private: boolean }

export function RepoPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch('/api/repos').then(r => r.json()).then(d => {
      if (d.repos) setRepos(d.repos);
      else setErr(true);
    }).catch(() => setErr(true));
  }, []);

  if (err || repos === null) {
    return (
      <input
        type="text"
        placeholder="owner/name"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-transparent border-0 border-b border-ink h-12 text-[17px] font-mono focus:outline-none focus:border-accent"
      />
    );
  }

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-transparent border-0 border-b border-ink h-12 text-[17px] font-mono focus:outline-none focus:border-accent"
    >
      <option value="">— choose a repo —</option>
      {repos.map(r => (
        <option key={r.fullName} value={r.fullName}>
          {r.fullName}{r.private ? ' (private)' : ''}
        </option>
      ))}
    </select>
  );
}

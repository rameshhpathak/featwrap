'use client';
import { useEffect, useState } from 'react';

interface Repo { fullName: string; private: boolean }

export function RepoPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch('/api/repos').then(r => r.json()).then(d => {
      if (Array.isArray(d.repos) && d.repos.length > 0) setRepos(d.repos);
      else setErr(true);
    }).catch(() => setErr(true));
  }, []);

  const inputClass =
    'w-full h-14 px-4 bg-paper-2 border border-ink font-mono text-[15px] ' +
    'focus:outline-none focus:bg-accent focus:border-ink placeholder:text-ash';

  if (err || repos === null) {
    return (
      <input
        type="text"
        placeholder="owner/name"
        value={value}
        onChange={e => onChange(e.target.value)}
        className={inputClass}
      />
    );
  }

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={inputClass}
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

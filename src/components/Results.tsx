import { AudioPlayer } from './AudioPlayer';

interface Digest {
  audience: string;
  script: string;
  prNumbers: number[];
  audioUrl: string | null;
}

const AUDIENCES: Array<{ v: string; code: string; l: string }> = [
  { v: 'marketing', code: 'MKT', l: 'Marketing' },
  { v: 'sales', code: 'SLS', l: 'Sales' },
  { v: 'cs', code: 'CS', l: 'Support' },
  { v: 'dev', code: 'ENG', l: 'Engineering' },
];

function splitLines(script: string): string[] {
  return script
    .split(/(?:\n+)|(?<=[.!?])\s+(?=[A-Z"'])/)
    .map(s => s.trim())
    .filter(Boolean);
}

export function Results({ digests }: { digests: Digest[] }) {
  const byAud = new Map(digests.map(d => [d.audience, d]));
  const ordered = AUDIENCES.map(a => ({ ...a, digest: byAud.get(a.v) })).filter(a => a.digest);

  if (ordered.length === 0) return null;

  // If only one audience is present, render it alone without tabs.
  if (ordered.length === 1) {
    const only = ordered[0];
    return <ResultCard label={only.l} digest={only.digest!} />;
  }

  // Multiple audiences → show all stacked, each with its own card.
  // Keeps the demo simple: no client-side tab state on the results surface yet.
  return (
    <div className="space-y-14">
      {ordered.map(o => (
        <ResultCard key={o.v} label={o.l} digest={o.digest!} />
      ))}
    </div>
  );
}

function ResultCard({ label, digest }: { label: string; digest: Digest }) {
  const lines = digest.script ? splitLines(digest.script) : [];
  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-serif font-black text-[32px] leading-none">For {label}</h2>
        {digest.audioUrl && (
          <a
            href={digest.audioUrl}
            download={`featwrap-${label.toLowerCase()}.mp3`}
            className="font-mono text-[12px] font-semibold tracking-[0.14em] uppercase underline decoration-2 underline-offset-4 hover:text-accent"
          >
            Download MP3 →
          </a>
        )}
      </div>

      {digest.audioUrl ? (
        <AudioPlayer src={digest.audioUrl} label={label} />
      ) : (
        <div className="border-2 border-ink p-6 font-mono text-[13px] text-ash">rendering audio…</div>
      )}

      {lines.length > 0 && (
        <div className="border-2 border-ink border-t-0 bg-paper">
          <div className="h-11 flex items-center gap-3 px-5 bg-ink text-paper font-mono text-[12px] tracking-[0.14em] uppercase">
            <span>▸ Live transcript</span>
          </div>
          <div className="p-6 space-y-3 font-serif text-[17px] leading-[1.45] text-ink/70">
            {lines.map((ln, i) => (
              <p key={i}>{ln}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

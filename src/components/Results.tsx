import { AudioPlayer } from './AudioPlayer';

interface Digest {
  audience: string;
  script: string;
  prNumbers: number[];
  audioUrl: string | null;
}

const LABEL: Record<string, string> = {
  marketing: 'Marketing',
  sales: 'Sales',
  cs: 'CS',
  dev: 'Engineering',
};

export function Results({ digests }: { digests: Digest[] }) {
  return (
    <div className="space-y-12">
      {digests.map(d => (
        <div key={d.audience}>
          <hr className="border-t border-ink w-16 mb-4" />
          <h2 className="font-sans text-[22px] font-semibold mb-4">{LABEL[d.audience] ?? d.audience}</h2>
          {d.audioUrl ? (
            <>
              <AudioPlayer src={d.audioUrl} />
              <p className="mt-4">
                <a href={d.audioUrl} download={`featwrap-${d.audience}.mp3`} className="font-mono text-[13px] underline hover:text-accent">
                  Download MP3
                </a>
              </p>
            </>
          ) : (
            <p className="font-mono text-ash text-[13px]">rendering…</p>
          )}
          <details className="mt-6">
            <summary className="font-mono text-[12px] uppercase tracking-[0.08em] text-ash cursor-pointer">Script</summary>
            <p className="mt-4 text-[15px] leading-[1.6] whitespace-pre-wrap">{d.script}</p>
          </details>
        </div>
      ))}
    </div>
  );
}

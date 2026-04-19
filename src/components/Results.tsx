'use client';
import { useEffect, useMemo, useRef, useState } from 'react';

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

function makeBars(seed: number, n = 56) {
  return Array.from({ length: n }, (_, i) => {
    const v = Math.sin(i * 0.6 + seed) * 0.5 + Math.sin(i * 1.3 + seed * 2) * 0.3 + 0.5;
    return Math.max(0.12, Math.min(1, v));
  });
}

function fmt(s: number) {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${r}`;
}

export function Results({ digests }: { digests: Digest[] }) {
  const byAud = new Map(digests.map(d => [d.audience, d]));
  const ordered = AUDIENCES.map(a => ({ ...a, digest: byAud.get(a.v) })).filter(a => a.digest);

  const [activeTab, setActiveTab] = useState<string>(ordered[0]?.v ?? 'marketing');
  const active = ordered.find(o => o.v === activeTab) ?? ordered[0];
  if (!active) return null;

  const showTabs = ordered.length > 1;

  return (
    <div>
      {showTabs && (
        <div className="flex flex-wrap -mb-[3px]">
          {ordered.map((o, i) => {
            const isActive = o.v === activeTab;
            return (
              <button
                key={o.v}
                onClick={() => setActiveTab(o.v)}
                className={`font-mono text-xs tracking-wider px-4 py-3 brutal-border border-b-[3px] ${
                  isActive
                    ? 'bg-foreground text-background relative z-10'
                    : 'bg-paper text-foreground hover:bg-accent-yellow'
                } ${i > 0 ? '-ml-[3px]' : ''}`}
              >
                {o.code} · {o.l.toUpperCase()}
              </button>
            );
          })}
        </div>
      )}

      <ResultPanel audience={active.l} digest={active.digest!} />
    </div>
  );
}

function ResultPanel({ audience, digest }: { audience: string; digest: Digest }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const bars = useMemo(() => makeBars(audience.length * 7 + 3), [audience]);
  const lines = useMemo(() => (digest.script ? splitLines(digest.script) : []), [digest.script]);
  // Map playback progress -> transcript line by cumulative character count.
  // Speaking pace is roughly steady per character, so this tracks the audio
  // much more faithfully than equal-share-per-line (which drifts as soon as
  // two adjacent lines have different lengths).
  const lineEndFractions = useMemo(() => {
    const ends: number[] = [];
    const lengths = lines.map(l => Math.max(1, l.length));
    const total = lengths.reduce((s, n) => s + n, 0);
    let acc = 0;
    for (const len of lengths) {
      acc += len;
      ends.push(total > 0 ? acc / total : 0);
    }
    return ends;
  }, [lines]);
  const activeLine = (() => {
    if (lines.length === 0) return -1;
    const idx = lineEndFractions.findIndex(end => progress < end);
    return idx === -1 ? lines.length - 1 : idx;
  })();

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      setCurrent(a.currentTime);
      const p = a.duration ? a.currentTime / a.duration : 0;
      setProgress(Math.min(1, p));
    };
    const onMeta = () => setDuration(a.duration);
    const onEnd = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('ended', onEnd);
    };
  }, [digest.audioUrl]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      const p = a.play();
      setPlaying(true);
      if (p !== undefined) p.catch(err => console.error('[player] play failed', err));
    }
  };

  return (
    <div className="brutal-border bg-background p-6 md:p-8">
      {digest.audioUrl && (
        <audio ref={audioRef} src={digest.audioUrl} preload="metadata" />
      )}

      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            aria-label={playing ? 'Pause' : 'Play'}
            disabled={!digest.audioUrl}
            className="w-12 h-12 brutal-border bg-accent-yellow grid place-items-center brutal-hover disabled:opacity-50 disabled:brutal-shadow-sm disabled:hover:translate-x-0 disabled:hover:translate-y-0"
          >
            {playing ? (
              <div className="flex gap-1">
                <span className="w-1.5 h-4 bg-foreground" />
                <span className="w-1.5 h-4 bg-foreground" />
              </div>
            ) : (
              <div className="w-0 h-0 border-l-[12px] border-l-foreground border-y-[8px] border-y-transparent ml-1" />
            )}
          </button>
          <div>
            <div className="font-mono text-xs text-muted-foreground">DIGEST · LATEST</div>
            <div className="font-bold tracking-tight">For {audience}</div>
          </div>
        </div>
        <div className="font-mono text-xs tabular-nums">
          {fmt(current)} / {fmt(duration)}
        </div>
      </div>

      {/* Waveform */}
      <div className="flex items-end gap-[3px] h-20 mb-2">
        {bars.map((h, i) => {
          const played = i / bars.length <= progress;
          const isHead = playing && Math.abs(i / bars.length - progress) < 1 / bars.length;
          return (
            <div
              key={i}
              className="flex-1 transition-[background-color,transform] duration-200 origin-bottom"
              style={{
                height: `${h * 100}%`,
                backgroundColor: played ? 'hsl(var(--foreground))' : 'hsl(var(--foreground) / 0.18)',
                transform: isHead ? 'scaleY(1.15)' : 'scaleY(1)',
              }}
            />
          );
        })}
      </div>

      {/* Red progress hint line */}
      <div className="relative h-[3px] bg-foreground/10 mb-6">
        <div
          className="absolute inset-y-0 left-0 bg-accent-red transition-[width] duration-200"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Transcript */}
      {lines.length > 0 && (
        <div className="border-t-[3px] border-foreground pt-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[11px] tracking-wider text-muted-foreground">
              ▶ LIVE TRANSCRIPT
            </div>
            {digest.audioUrl && (
              <a
                href={digest.audioUrl}
                download={`featwrap-${audience.toLowerCase()}.mp3`}
                className="font-mono text-[11px] tracking-wider text-accent-blue hover:underline"
              >
                DOWNLOAD MP3 →
              </a>
            )}
          </div>
          <ul className="space-y-2">
            {lines.map((line, i) => {
              const past = i < activeLine;
              const isCurrent = i === activeLine && playing;
              return (
                <li
                  key={i}
                  className={`text-base md:text-lg leading-snug transition-all duration-300 ${
                    isCurrent
                      ? 'text-foreground font-medium'
                      : past
                      ? 'text-foreground/60'
                      : 'text-foreground/30'
                  }`}
                >
                  {isCurrent && (
                    <span className="inline-block w-1.5 h-1.5 bg-accent-red rounded-full animate-pulse mr-2 align-middle" />
                  )}
                  {line}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!digest.audioUrl && (
        <div className="font-mono text-[10px] tracking-wider text-muted-foreground">
          ◌ AUDIO RENDERING…
        </div>
      )}
    </div>
  );
}

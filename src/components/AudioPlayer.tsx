'use client';
import { useRef, useState, useEffect, useMemo } from 'react';

export function AudioPlayer({ src, label }: { src: string; label: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
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
  }, []);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); } else { a.play(); setPlaying(true); }
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${r}`;
  };

  // Fake-but-pleasing waveform: deterministic bars seeded by label length.
  const bars = useMemo(() => {
    const n = 56;
    const seed = label.length * 7 + 3;
    return Array.from({ length: n }, (_, i) => {
      const x = Math.sin((i + seed) * 1.7) * Math.cos((i + seed) * 0.9);
      const base = 0.2 + Math.abs(x) * 0.8;
      return Math.max(0.12, Math.min(1, base));
    });
  }, [label]);

  const playedTo = duration ? (current / duration) * bars.length : 0;

  return (
    <div className="border-2 border-ink">
      <div className="flex items-center gap-5 p-5 bg-paper">
        <button
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
          className="w-14 h-14 flex items-center justify-center bg-accent border-2 border-ink hover:bg-paper hover:text-ink text-ink"
        >
          <span className="text-[22px] leading-none translate-x-[1px]">{playing ? '■' : '▶'}</span>
        </button>
        <div className="flex-1">
          <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-ash mb-1">
            Digest · {label}
          </div>
          <div className="font-serif font-bold text-[18px] leading-tight">
            For {label}
          </div>
        </div>
        <div className="font-mono text-[13px] tabular-nums text-ink/80">
          {fmt(current)} <span className="text-ash">/</span> {fmt(duration)}
        </div>
      </div>

      <div className="border-t-2 border-ink bg-paper px-5 py-6">
        <div className="flex items-end gap-[3px] h-16">
          {bars.map((h, i) => {
            const active = i < playedTo;
            return (
              <span
                key={i}
                style={{ height: `${Math.round(h * 100)}%` }}
                className={active ? 'flex-1 bg-ink' : 'flex-1 bg-ink/25'}
              />
            );
          })}
        </div>
        <div className="h-px bg-ink mt-4" />
      </div>

      <audio ref={ref} src={src} preload="metadata" />
    </div>
  );
}

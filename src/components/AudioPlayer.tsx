'use client';
import { useRef, useState, useEffect } from 'react';

export function AudioPlayer({ src }: { src: string }) {
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
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const r = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${r}`;
  };

  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={toggle}
        className="w-10 h-10 flex items-center justify-center bg-ink text-paper border border-ink hover:bg-accent hover:border-accent"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? '■' : '▶'}
      </button>
      <div className="flex-1 h-[2px] bg-ink/20 relative">
        <div className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[13px] text-ash tabular-nums">{fmt(current)} / {fmt(duration)}</span>
      <audio ref={ref} src={src} preload="metadata" />
    </div>
  );
}

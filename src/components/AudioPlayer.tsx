'use client';
import { useRef, useState, useEffect, useMemo } from 'react';

const makeBars = (seed: number, n = 56) =>
  Array.from({ length: n }, (_, i) => {
    const v = Math.sin(i * 0.6 + seed) * 0.5 + Math.sin(i * 1.3 + seed * 2) * 0.3 + 0.5;
    return Math.max(0.12, Math.min(1, v));
  });

interface Props {
  src: string;
  label: string;
  week?: string;
  onProgress?: (p: number) => void;
  onPlayingChange?: (playing: boolean) => void;
}

export function AudioPlayer({ src, label, week = 'LATEST', onProgress, onPlayingChange }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const bars = useMemo(() => makeBars(label.length * 7 + 3), [label]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      setCurrent(a.currentTime);
      const p = a.duration ? a.currentTime / a.duration : 0;
      setProgress(Math.min(1, p));
      onProgress?.(Math.min(1, p));
    };
    const onMeta = () => setDuration(a.duration);
    const onEnd = () => {
      setPlaying(false);
      onPlayingChange?.(false);
    };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('ended', onEnd);
    };
  }, [onProgress, onPlayingChange]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
      onPlayingChange?.(false);
    } else {
      const p = a.play();
      setPlaying(true);
      onPlayingChange?.(true);
      if (p !== undefined) p.catch(err => console.error('[AudioPlayer] play failed', err));
    }
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${r}`;
  };

  return (
    <div className="brutal-border bg-background p-6 md:p-8 relative">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            aria-label={playing ? 'Pause' : 'Play'}
            className="w-12 h-12 brutal-border bg-accent-yellow grid place-items-center brutal-hover"
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
            <div className="font-mono text-xs text-muted-foreground">DIGEST · {week}</div>
            <div className="font-bold tracking-tight">For {label}</div>
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

      {/* Progress hint line */}
      <div className="relative h-[3px] bg-foreground/10">
        <div
          className="absolute inset-y-0 left-0 bg-accent-red transition-[width] duration-200"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}

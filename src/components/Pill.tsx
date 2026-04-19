import type { ReactNode } from 'react';
export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 h-8 px-3 text-[12px] font-mono uppercase tracking-[0.08em] border border-ink">
      {children}
    </span>
  );
}

import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Button({ children, variant = 'primary', className = '', ...rest }: Props) {
  const base =
    'inline-flex items-center justify-center h-14 px-7 border border-ink transition-colors ' +
    'font-mono text-[13px] font-semibold tracking-[0.14em] uppercase ' +
    'disabled:opacity-40 disabled:cursor-not-allowed';
  const style =
    variant === 'primary'
      ? 'bg-ink text-paper hover:bg-accent hover:text-ink hover:border-ink'
      : 'bg-paper text-ink hover:bg-ink hover:text-paper';
  return (
    <button className={`${base} ${style} ${className}`} {...rest}>
      {children}
    </button>
  );
}

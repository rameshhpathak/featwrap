import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Button({ children, variant = 'primary', className = '', ...rest }: Props) {
  const base = 'inline-flex items-center justify-center h-12 px-6 text-[15px] font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const style = variant === 'primary'
    ? 'bg-ink text-paper border-ink hover:bg-accent hover:border-accent'
    : 'bg-transparent text-ink border-ink hover:bg-ink hover:text-paper';
  return <button className={`${base} ${style} ${className}`} {...rest}>{children}</button>;
}

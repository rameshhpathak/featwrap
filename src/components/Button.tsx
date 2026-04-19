import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Button({ children, variant = 'primary', className = '', ...rest }: Props) {
  const base =
    'inline-flex items-center justify-center gap-2 brutal-border brutal-hover ' +
    'font-mono font-bold text-sm tracking-wider uppercase px-5 py-3 ' +
    'disabled:opacity-60 disabled:cursor-not-allowed disabled:brutal-shadow disabled:hover:translate-x-0 disabled:hover:translate-y-0';
  const style =
    variant === 'primary'
      ? 'bg-foreground text-background brutal-shadow'
      : 'bg-paper text-foreground brutal-shadow';
  return (
    <button className={`${base} ${style} ${className}`} {...rest}>
      {children}
    </button>
  );
}

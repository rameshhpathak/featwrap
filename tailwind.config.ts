import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        'paper-2': 'var(--paper-2)',
        ink: 'var(--ink)',
        ash: 'var(--ash)',
        rule: 'var(--rule)',
        accent: 'var(--accent)',
        ok: 'var(--ok)',
        err: 'var(--err)',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular'],
      },
    },
  },
  plugins: [],
} satisfies Config;

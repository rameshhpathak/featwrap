import './globals.css';
import type { ReactNode } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Fraunces } from 'next/font/google';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata = {
  title: 'Featwrap — PRs as a podcast',
  description: 'Connect GitHub. Pick a repo. Featwrap narrates every merged PR into a short audio digest your whole team will actually press play on.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${fraunces.variable}`}>
      <body className="bg-paper text-ink font-serif antialiased">{children}</body>
    </html>
  );
}

import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Featwrap — This week's PRs as a 5-minute podcast",
  description:
    "Connect GitHub. Pick a repo. Featwrap turns every week of merged PRs into a 5-minute audio digest — written four ways for marketing, sales, support & engineering.",
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: "Featwrap — This week's PRs as a 5-minute podcast",
    description:
      "Connect GitHub. Pick a repo. Featwrap turns every week of merged PRs into a 5-minute audio digest — written four ways for marketing, sales, support & engineering.",
    type: 'website',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Featwrap — This week's PRs as a 5-minute podcast",
    description:
      "Connect GitHub. Pick a repo. Featwrap turns every week of merged PRs into a 5-minute audio digest — written four ways for marketing, sales, support & engineering.",
    images: ['/og-image.jpg'],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-background text-foreground font-sans antialiased">{children}</body>
    </html>
  );
}

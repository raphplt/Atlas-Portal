import type { Metadata } from 'next';
import { Fraunces, Manrope } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'Atlas Portal',
  description: 'Premium client portal',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${manrope.variable} ${fraunces.variable} ${geistMono.variable}`}
    >
      <body className={manrope.className}>{children}</body>
    </html>
  );
}

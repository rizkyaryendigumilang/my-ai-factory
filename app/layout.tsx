import type { Metadata, Viewport } from 'next';
import { Noto_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const notoSans = Noto_Sans({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-noto-sans',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#080B11',
};

export const metadata: Metadata = {
  title: 'My AI Factory - Autonomous Software Foundry',
  description:
    'Rakit dokumen produk (BRD/PRD), cetak biru arsitektur (.drawio & Mermaid), dan direktori kode Next.js utuh dari satu spesifikasi.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${notoSans.variable} ${plexMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-[100dvh] antialiased font-sans pb-[env(safe-area-inset-bottom)]">{children}</body>
    </html>
  );
}

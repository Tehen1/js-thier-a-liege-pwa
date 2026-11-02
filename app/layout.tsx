import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL("https://jsthier-pwa-kit.vercel.app"),
  title: 'JS du Thier à Liège · Club de football, matricule 09075',
  description: 'JS du Thier à Liège : équipes, inscriptions, chèques-sport, matchs et mini-jeux.',
  applicationName: 'JS Thier à Liège',
  openGraph: {
    title: 'JS du Thier à Liège',
    description: 'Club de football de quartier à Liège. Inscriptions, matchs et mini-jeux.',
    locale: 'fr_BE',
    type: 'website',
    images: ['/images/crest.svg'],
  },
  icons: {
    icon: '/images/crest.svg',
    apple: '/icons/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#e6e7e9' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1126' }],
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr-BE" suppressHydrationWarning>
    <body>
      <Script src="/theme-init.js" strategy="beforeInteractive" />
      {children}
    </body>
  </html>;
}

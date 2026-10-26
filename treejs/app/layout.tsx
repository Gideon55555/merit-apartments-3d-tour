import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

// Self-hosted at build time: no request to Google at runtime, preloaded,
// and metric-matched fallbacks so text doesn't jump when the font arrives
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'], display: 'swap', variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-playfair' });

export const metadata: Metadata = {
  title: 'Merit Properties — 44 m² Modern Apartment',
  description:
    'Explore a thoughtfully designed 44 m² apartment with cinematic 3D walkthrough. One bedroom, one bathroom, two balconies — designed for modern living.',
  keywords: ['apartment', 'real estate', 'luxury', 'modern living', '3D tour', 'Merit Properties'],
  openGraph: {
    title: 'Merit Properties — 44 m² Modern Apartment',
    description: 'Discover a home where thoughtful planning meets modern living.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}

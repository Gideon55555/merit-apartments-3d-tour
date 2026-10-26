import type { Metadata, Viewport } from 'next';
import './globals.css';

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
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import '@fontsource/bungee/400.css';
import '@fontsource/oswald/400.css';
import '@fontsource/oswald/500.css';
import './globals.css';

export const metadata: Metadata = {
  title: "NF'26 Candid Cam",
  description: 'NourishFest 2026 digital candid camera',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0D0D0D',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

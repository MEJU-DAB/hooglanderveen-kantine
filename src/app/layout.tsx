import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VV Hooglanderveen — Kantine',
  description: 'Kantine nieuwsscherm VV Hooglanderveen',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      {/* IE=edge,chrome=1 zorgt dat CEF/Electron-gebaseerde WebViews de modernste engine gebruiken */}
      <head>
        <meta httpEquiv="X-UA-Compatible" content="IE=edge,chrome=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}

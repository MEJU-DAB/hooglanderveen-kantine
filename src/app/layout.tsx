import type { Metadata, Viewport } from 'next';

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
      <head>
        {/* Zorgt dat CEF/Electron-gebaseerde WebViews de modernste engine gebruiken */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge,chrome=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}

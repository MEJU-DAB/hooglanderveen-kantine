import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VV Hooglanderveen — Kantine',
  description: 'Kantine nieuwsscherm VV Hooglanderveen',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}

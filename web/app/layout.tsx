import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kyne — Penjadwalan Shift',
  description: 'Jadwal shift mingguan untuk tim Kyne.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

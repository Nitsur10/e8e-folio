import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'folio.e8e',
  description:
    'AI-assisted research for technically literate investors. Paper only. Beta.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

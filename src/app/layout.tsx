import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Project Bootstrap',
  description: 'Auto-bootstrapped project with feedback loop',
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

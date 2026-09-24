import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'gptrush — one link, one treasure',
  description: 'Create one-time treasure links. The first visitor wins.',
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
  icons: { icon: '/favicon.png', shortcut: '/favicon.png', apple: '/icon.png' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="min-h-screen antialiased">{children}</body></html>;
}

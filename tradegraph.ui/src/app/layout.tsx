import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import AlertListener from '@/components/AlertListener';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TradeGraph — Supply Chain Intelligence',
  description: 'Real-time wholesale supply chain management powered by Neo4j graph analysis',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ background: 'var(--bg-base)' }} suppressHydrationWarning>
        <Sidebar />
        <AlertListener />
        <main style={{
          marginLeft: 'var(--sidebar-w)',
          minHeight: '100vh',
          padding: '32px 36px',
          maxWidth: 'calc(100vw - var(--sidebar-w))',
        }}>
          {children}
        </main>
      </body>
    </html>
  );
}

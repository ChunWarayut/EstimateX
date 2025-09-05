import './globals.css';
import type { Metadata } from 'next';
import { Prompt } from 'next/font/google';

const prompt = Prompt({ subsets: ['latin', 'thai'], weight: ['300','400','500','600','700'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://estimatex.local'),
  title: {
    default: 'EstimateX – แพลนนิ่งโป๊กเกอร์แบบแยกบทบาท',
    template: '%s • EstimateX'
  },
  description: 'ระบบโหวตคะแนน (Planning Poker) รองรับบทบาท Dev/QA/PO แยกสถิติ พร้อม UI Gradient + Glow + Glassmorphism',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'EstimateX',
    description: 'โหวตคะแนนแบบเรียลไทม์ แยกบทบาท พร้อมสถิติ',
    type: 'website'
  },
  other: {
    'theme-color': '#0b1220'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={prompt.className}>
        <div className="min-h-screen">
          <header className="sticky top-0 z-20">
            <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
              <div className="font-bold text-xl">EstimateX</div>
              <nav className="flex gap-3">
                <a className="btn-ghost" href="/">Home</a>
                <a className="btn-ghost" href="/donate">Donate</a>
                <a className="btn-ghost" target="_blank" rel="noreferrer" href="https://github.com/">GitHub</a>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <footer className="py-10 text-center text-white/60">© {new Date().getFullYear()} EstimateX</footer>
        </div>
      </body>
    </html>
  );
}


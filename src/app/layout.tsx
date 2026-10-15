import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Gothic_A1 } from 'next/font/google';
import './globals.css';
import Footer from '@/components/Footer';
import VercelAnalytics from '@/components/VercelAnalytics';

const gothicA1 = Gothic_A1({
  weight: ['400', '500', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-gothic-a1',
  preload: false,
});

export const metadata: Metadata = {
  title: '이곳만은 꼭 지키자 - 선정지, 그 후의 기록',
  description:
    '2000년부터 시민들이 지키고자 했던 자연·문화유산은 지금 어떤 모습일까요? 선정지의 현재 보전상태를 지도에서 살펴보세요.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`h-full ${gothicA1.variable}`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <header className="bg-white border-b border-zinc-200">
          <div className="max-w-screen-xl mx-auto px-5">
            <div className="flex items-center justify-center py-3.5">
              <a
                href="https://nationaltrust.or.kr/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="한국내셔널트러스트 홈페이지 (새 창)"
              >
                <Image
                  src="/logo.png"
                  alt="한국내셔널트러스트"
                  width={180}
                  height={50}
                  priority
                  className="relative -top-[2px] h-9 w-auto"
                />
              </a>
              <span className="mx-3 h-5 w-px bg-zinc-200" aria-hidden="true" />
              <Link href="/">
                <span className="relative top-[2px] flex items-baseline gap-2">
                  <span className="text-lg font-black tracking-tight text-[#1F4D38]">이곳만은 꼭 지키자</span>
                  <span className="hidden text-xs font-semibold text-zinc-400 sm:inline">선정지, 그 후의 기록</span>
                </span>
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
        <VercelAnalytics />
      </body>
    </html>
  );
}

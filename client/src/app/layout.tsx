import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Plus_Jakarta_Sans } from 'next/font/google';
import { Suspense } from 'react';

import { NavigationProgress } from '@/components/NavigationProgress';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getSiteUrl } from '@/lib/site';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site-config';

import './globals.css';

/** Cả hai font đều có bộ ký tự tiếng Việt đầy đủ, nên dấu tiếng Việt hiển thị đúng. */
const fontBody = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const fontDisplay = Plus_Jakarta_Sans({
  subsets: ['vietnamese', 'latin'],
  weight: ['700', '800'],
  variable: '--font-display',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await getSiteUrl();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${SITE_NAME} — Đọc truyện Việt hoá miễn phí`,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: ['đọc truyện', 'truyện việt hoá', 'truyện trinh thám', 'manga', 'manhwa', 'truyện online'],
    // Icon sinh từ logo.webp ở thư mục gốc bằng scripts/generate-logo.mjs
    icons: {
      icon: [
        { url: '/favicon-64.png', sizes: '64x64', type: 'image/png' },
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      ],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    },
    manifest: '/manifest.webmanifest',
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'vi_VN',
      title: `${SITE_NAME} — Đọc truyện Việt hoá miễn phí`,
      description: SITE_DESCRIPTION,
      images: [{ url: '/logo-og.png', width: 512, height: 512, alt: SITE_NAME }],
    },
    twitter: { card: 'summary', title: SITE_NAME, description: SITE_DESCRIPTION },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0d12' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// Chạy trước lúc vẽ để không bị nháy sáng trang khi đổi giao diện.
const themeScript = `
(function () {
  try {
    var stored = JSON.parse(localStorage.getItem('dochong:prefs:v1') || '{}');
    var theme = stored.theme || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      data-theme="dark"
      className={`${fontBody.variable} ${fontDisplay.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <a
          href="#noi-dung-chinh"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-fg"
        >
          Bỏ qua đến nội dung chính
        </a>
        <div className="flex min-h-dvh flex-col">
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          <Suspense fallback={<div className="h-[76px] w-full border-b border-line bg-bg" />}>
            <SiteHeader />
          </Suspense>
          <main id="noi-dung-chinh" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
import type { Metadata, Viewport } from 'next';
import { Archivo_Black, DM_Mono, Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google';
import './globals.css';
import './admin-session.css';
import SiteExperience from '@/components/SiteExperience';
import { AdminSessionProvider } from '@/components/AdminSession';
import { siteOrigin } from '@/lib/site';

const monoFont = DM_Mono({
  variable: '--font-dm-mono',
  weight: ['300', '400', '500'],
  subsets: ['latin'],
  display: 'swap',
});

const interfaceFont = Archivo_Black({
  variable: '--font-interface',
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
});

const chineseSans = Noto_Sans_SC({
  variable: '--font-noto-sans-sc',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
});

const chineseSerif = Noto_Serif_SC({
  variable: '--font-noto-serif-sc',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: 'Youngkx',
  description: '记录 OI、C/C++ 与 Web 学习笔记。',
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: 'Youngkx',
  },
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-CN"
      className={`${monoFont.variable} ${interfaceFont.variable} ${chineseSans.variable} ${chineseSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('youngkx-theme');if(!t)t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <SiteExperience>
          <AdminSessionProvider>{children}</AdminSessionProvider>
        </SiteExperience>
      </body>
    </html>
  );
}

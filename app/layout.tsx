import type { Metadata } from 'next';
import { Archivo_Black, DM_Mono } from 'next/font/google';
import './globals.css';
import SiteExperience from '@/components/SiteExperience';
import { siteOrigin } from '@/lib/site';

const monoFont = DM_Mono({
  variable: '--font-dm-mono',
  weight: ['300', '400', '500'],
  subsets: ['latin'],
  display: 'swap',
  fallback: ['ui-monospace', 'monospace'],
});

const interfaceFont = Archivo_Black({
  variable: '--font-interface',
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  fallback: ['Arial Black', 'Arial', 'sans-serif'],
});

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
      className={`${monoFont.variable} ${interfaceFont.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('youngkx-theme');if(!t)t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t;if(sessionStorage.getItem('youngkx-page-transition')==='1')document.documentElement.classList.add('page-entering')}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <SiteExperience>{children}</SiteExperience>
      </body>
    </html>
  );
}

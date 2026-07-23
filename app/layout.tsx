import type { Metadata } from 'next';
import './globals.css';
import SiteExperience from '@/components/SiteExperience';

export const metadata: Metadata = {
  title: 'Youngkx',
  description: '记录 OI、C/C++ 与 Web 学习笔记。',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('youngkx-theme');if(!t)t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t;if(sessionStorage.getItem('youngkx-page-transition')==='1')document.documentElement.classList.add('page-entering')}catch(e){}})()` }} />
      </head>
      <body><SiteExperience>{children}</SiteExperience></body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Youngkx - Blog',
  description: '记录 OI、C/C++ 与 Web 学习笔记。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('youngkx-theme');if(!t)t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t}catch(e){}})()` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSiteExperience } from './SiteExperience';

export default function SiteHeader({
  navClassName,
  articleHref = '/articles/',
}: {
  navClassName: string;
  articleHref?: string;
}) {
  const { theme, toggleTheme } = useSiteExperience();

  return (
    <header className="nav shell">
      <Link className="brand" href="/#top">
        <Image
          className="brand-avatar"
          src="/avatar.webp"
          alt="Youngkx 头像"
          width={36}
          height={36}
          priority
        />
        <span className="brand-name">Youngkx</span>
      </Link>
      <nav className={`nav-links ${navClassName}`} aria-label="主导航">
        <Link href="/#top">首页</Link>
        <Link href={articleHref}>文章</Link>
        <Link href="/categories/">分类</Link>
      </nav>
      <button className="theme-toggle" onClick={toggleTheme} aria-label="切换主题">
        <span className="theme-icon">{theme === 'dark' ? '☼' : '◐'}</span>
        <span className="theme-label">{theme === 'dark' ? 'LIGHT' : 'DARK'}</span>
      </button>
    </header>
  );
}

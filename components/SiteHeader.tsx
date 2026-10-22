'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useSiteExperience } from './SiteExperience';
import ResourceNav from './ResourceNav';

export default function SiteHeader({
  navClassName,
  articleHref = '/articles/',
  resources = false,
}: {
  navClassName: string;
  articleHref?: string;
  resources?: boolean;
}) {
  const { theme, toggleTheme } = useSiteExperience();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target) &&
        !buttonRef.current?.contains(event.target)
      )
        setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', escape);
    };
  }, [menuOpen]);

  return (
    <header className={`nav shell${resources ? ' resource-header' : ''}`}>
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
      <nav
        ref={menuRef}
        id={resources ? 'resource-mobile-menu' : undefined}
        className={`nav-links ${navClassName}${menuOpen ? ' open' : ''}`}
        aria-label="主导航"
        onClick={() => setMenuOpen(false)}
      >
        <Link href="/#top">Home</Link>
        <Link href={articleHref}>Articles</Link>
        <Link href="/categories/">Topics</Link>
      </nav>
      {resources && <ResourceNav />}
      <button className="theme-toggle" onClick={toggleTheme} aria-label="切换主题">
        <span className="theme-icon">{theme === 'dark' ? '☼' : '◐'}</span>
        <span className="theme-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>
      {resources && (
        <button
          ref={buttonRef}
          type="button"
          className={`menu${menuOpen ? ' open' : ''}`}
          aria-label="切换菜单"
          aria-expanded={menuOpen}
          aria-controls="resource-mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
      )}
    </header>
  );
}

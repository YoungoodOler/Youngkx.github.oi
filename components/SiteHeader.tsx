'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSiteExperience } from './SiteExperience';
import ResourceNav from './ResourceNav';
import SiteBrand from './SiteBrand';

export default function SiteHeader({
  navClassName,
  resources = false,
}: {
  navClassName: string;
  resources?: boolean;
}) {
  const section = usePathname()?.split('/')[1] ?? '';
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
      <SiteBrand href="/#top" theme={theme} />
      <nav
        ref={menuRef}
        id={resources ? 'resource-mobile-menu' : undefined}
        className={`nav-links ${navClassName}${menuOpen ? ' open' : ''}`}
        aria-label="主导航"
        onClick={() => setMenuOpen(false)}
      >
        <Link href="/#top">
          <span className="nav-link-label">Home</span>
        </Link>
        <Link href="/articles/" aria-current={section === 'articles' ? 'page' : undefined}>
          <span className="nav-link-label">Article Archive</span>
        </Link>
        <Link href="/categories/" aria-current={section === 'categories' ? 'page' : undefined}>
          <span className="nav-link-label">Topic Archive</span>
        </Link>
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

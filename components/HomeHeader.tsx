'use client';

import { useEffect, useRef, useState } from 'react';
import ResourceNav from './ResourceNav';
import SiteBrand from './SiteBrand';

const homeSections = [
  { id: 'top', label: 'Home' },
  { id: 'interactive-cards', label: 'Cards' },
  { id: 'posts', label: 'Articles' },
  { id: 'topics', label: 'Topics' },
] as const;
type HomeSectionId = (typeof homeSections)[number]['id'];

export default function HomeHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<HomeSectionId>('top');
  const menuRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const sections = homeSections.map(({ id }) => ({ id, element: document.getElementById(id) }));
    let frame = 0;
    let currentSection: HomeSectionId = 'top';

    const updateSection = () => {
      frame = 0;
      const readingLine = Math.max(100, window.innerHeight * 0.28);
      let nextSection: HomeSectionId = 'top';
      for (const { id, element } of sections) {
        if (element && element.getBoundingClientRect().top <= readingLine) nextSection = id;
      }
      if (nextSection !== currentSection) {
        currentSection = nextSection;
        setActiveSection(nextSection);
      }
    };

    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateSection);
    };

    updateSection();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    const observer = new ResizeObserver(scheduleUpdate);
    const home = sections[0].element;
    if (home) observer.observe(home);

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const menu = menuRef.current;
    const label = menu?.querySelector<HTMLElement>('[aria-current="location"] > span');
    const link = label?.parentElement;
    if (!menu || !label || !link) return;

    const moveUnderline = () => {
      const x = link.offsetLeft + label.offsetLeft;
      const y = link.offsetTop + label.offsetTop + label.offsetHeight;
      menu.style.setProperty('--nav-underline-x', `${x}px`);
      menu.style.setProperty('--nav-underline-y', `${y}px`);
      menu.style.setProperty('--nav-underline-width', `${label.offsetWidth}px`);
    };

    moveUnderline();
    const observer = new ResizeObserver(moveUnderline);
    observer.observe(menu);
    observer.observe(label);
    return () => observer.disconnect();
  }, [activeSection]);

  useEffect(() => {
    if (!menuOpen) return;

    const closeFromOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target) || menuButtonRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const closeFromKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', closeFromOutside, { passive: true });
    document.addEventListener('keydown', closeFromKeyboard);
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside);
      document.removeEventListener('keydown', closeFromKeyboard);
    };
  }, [menuOpen]);

  return (
    <header className="nav shell">
      <SiteBrand href="#top" theme="dark" />
      <nav
        ref={menuRef}
        id="home-mobile-menu"
        className={menuOpen ? 'nav-links open' : 'nav-links'}
        aria-label="主导航"
      >
        {homeSections.map(({ id, label }) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={activeSection === id ? 'location' : undefined}
            onClick={() => setMenuOpen(false)}
          >
            <span>{label}</span>
          </a>
        ))}
        <span className="home-nav-underline" aria-hidden="true" />
      </nav>
      <ResourceNav />
      <button
        ref={menuButtonRef}
        className={menuOpen ? 'menu open' : 'menu'}
        onClick={() => setMenuOpen((current) => !current)}
        aria-label="切换菜单"
        aria-expanded={menuOpen}
        aria-controls="home-mobile-menu"
      >
        <span />
        <span />
      </button>
    </header>
  );
}

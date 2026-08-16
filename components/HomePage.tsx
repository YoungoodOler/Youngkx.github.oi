'use client';

import {
  AnimatePresence,
  m,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ArticleSummary, CategorySummary } from '@/lib/articles';
import { selectLatestArticle } from '@/lib/article-selection';
import type { CardPreset } from '@/lib/card-presets';
import { validateUsefulLinksPayload } from '@/lib/useful-links';
import { useSiteExperience } from './SiteExperience';
import SiteFooter from './SiteFooter';

const introQuotes = ['Life is real, life is earnest.'];

export function CardArtwork({ kind }: { kind: CardPreset }) {
  if (kind === 'ai') {
    return (
      <div className="artwork ai-art" aria-hidden="true">
        <svg viewBox="0 0 320 220">
          <g className="ai-links">
            <path d="M48 52 135 36M48 52 135 108M48 110 135 36M48 110 135 108M48 168 135 108M48 168 135 180M135 36 238 70M135 36 238 150M135 108 238 70M135 108 238 150M135 180 238 150M238 70 284 110M238 150 284 110" />
          </g>
          <g className="ai-nodes">
            {[
              [48, 52],
              [48, 110],
              [48, 168],
              [135, 36],
              [135, 108],
              [135, 180],
              [238, 70],
              [238, 150],
              [284, 110],
            ].map(([cx, cy], index) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={index === 8 ? 10 : 6} />
            ))}
          </g>
        </svg>
        <span className="ai-label">Neural Flow</span>
        <i className="ai-pulse pulse-one" />
        <i className="ai-pulse pulse-two" />
        <i className="ai-pulse pulse-three" />
      </div>
    );
  }
  if (kind === 'cs') {
    return (
      <div className="artwork cs-art" aria-hidden="true">
        <div className="cs-chip">
          <span>CS</span>
          <small>1010</small>
        </div>
        <i className="cs-trace trace-one" />
        <i className="cs-trace trace-two" />
        <i className="cs-trace trace-three" />
        <i className="cs-trace trace-four" />
        <b className="cs-signal signal-one" />
        <b className="cs-signal signal-two" />
        <b className="cs-signal signal-three" />
        <span className="cs-label">Process / Memory / Logic</span>
      </div>
    );
  }
  if (kind === 'vlog') {
    return (
      <div className="artwork vlog-art" aria-hidden="true">
        <div className="vlog-screen">
          <div className="vlog-sun" />
          <div className="vlog-land land-back" />
          <div className="vlog-land land-front" />
          <span>REC</span>
        </div>
        <div className="vlog-timeline">
          <i />
          <b />
        </div>
        <span className="vlog-time">00:00:24</span>
      </div>
    );
  }
  if (kind === 'talk') {
    return (
      <div className="artwork talk-art" aria-hidden="true">
        <div className="talk-bubble bubble-one">
          <span>Thoughts</span>
          <i />
          <i />
          <i />
        </div>
        <div className="talk-bubble bubble-two">
          <b>…</b>
        </div>
        <div className="talk-orbit" />
      </div>
    );
  }
  if (kind === 'code') {
    return (
      <div className="artwork terminal-art" aria-hidden="true">
        <div className="terminal-top">
          <i />
          <i />
          <i />
          <span>main.cpp</span>
        </div>
        <div className="terminal-code">
          <span>
            <b>int</b> value = <em>42</em>;
          </span>
          <span>
            <b>printf</b>(<i>&quot;%d&quot;</i>, value);
          </span>
          <span className="terminal-output">› 42_</span>
        </div>
        <div className="scan-line" />
      </div>
    );
  }
  if (kind === 'network') {
    return (
      <div className="artwork network-wrap" aria-hidden="true">
        <svg className="network-art" viewBox="0 0 320 220">
          <path d="M45 155 L105 78 L165 137 L226 48 L278 125" />
          <path d="M105 78 L226 48 M165 137 L278 125 M45 155 L165 137" />
          {[
            ['45', '155'],
            ['105', '78'],
            ['165', '137'],
            ['226', '48'],
            ['278', '125'],
          ].map(([cx, cy], index) => (
            <circle key={cx} cx={cx} cy={cy} r={index === 3 ? 9 : 6} />
          ))}
        </svg>
        <span className="network-label label-a">Graph</span>
        <span className="network-label label-b">DP</span>
        <span className="network-label label-c">CSP-S</span>
      </div>
    );
  }
  if (kind === 'timeline') {
    return (
      <div className="artwork timeline-art" aria-hidden="true">
        <div className="timeline-track">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="timeline-labels">
          <span>
            起步<small>学习</small>
          </span>
          <span>
            通过<small>练习</small>
          </span>
          <span>
            竞赛<small>CSP</small>
          </span>
          <span>
            记录<small>OI</small>
          </span>
        </div>
        <div className="timeline-signal" />
      </div>
    );
  }
  return (
    <div className="artwork protocol-art" aria-hidden="true">
      <span>Client</span>
      <i>GET / HTTP/1.1 →</i>
      <span>Server</span>
    </div>
  );
}

function ReactivePointer() {
  const pointerX = useMotionValue(-120);
  const pointerY = useMotionValue(-120);
  const dotX = useSpring(pointerX, { stiffness: 520, damping: 32, mass: 0.18 });
  const dotY = useSpring(pointerY, { stiffness: 520, damping: 32, mass: 0.18 });
  const glowX = useSpring(pointerX, { stiffness: 95, damping: 24, mass: 0.6 });
  const glowY = useSpring(pointerY, { stiffness: 95, damping: 24, mass: 0.6 });
  const glow = useMotionTemplate`radial-gradient(520px circle at ${glowX}px ${glowY}px, rgba(112, 137, 255, .085), transparent 68%)`;

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 900) return;
    const move = (event: PointerEvent) => {
      pointerX.set(event.clientX);
      pointerY.set(event.clientY);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [pointerX, pointerY]);

  return (
    <>
      <m.div className="pointer-glow" style={{ background: glow }} />
      <m.div className="pointer-dot" style={{ x: dotX, y: dotY }} />
    </>
  );
}

function MagneticLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 320, damping: 22, mass: 0.35 });
  const y = useSpring(rawY, { stiffness: 320, damping: 22, mass: 0.35 });

  const move = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    rawX.set((event.clientX - rect.left - rect.width / 2) * 0.16);
    rawY.set((event.clientY - rect.top - rect.height / 2) * 0.16);
  };

  return (
    <m.a
      href={href}
      className={className}
      style={{ x, y }}
      onPointerMove={move}
      onPointerLeave={() => {
        rawX.set(0);
        rawY.set(0);
      }}
    >
      {children}
    </m.a>
  );
}

function InteractiveSignalCard({
  href,
  label,
  className,
  index,
  visual,
  children,
}: {
  href: string;
  label: string;
  className: string;
  index: number;
  visual: ReactNode;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(50);
  const pointerY = useMotionValue(50);
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const rawLift = useMotionValue(0);
  const smoothPointerX = useSpring(pointerX, { stiffness: 180, damping: 26, mass: 0.35 });
  const smoothPointerY = useSpring(pointerY, { stiffness: 180, damping: 26, mass: 0.35 });
  const rotateX = useSpring(rawRotateX, { stiffness: 190, damping: 24, mass: 0.42 });
  const rotateY = useSpring(rawRotateY, { stiffness: 190, damping: 24, mass: 0.42 });
  const lift = useSpring(rawLift, { stiffness: 220, damping: 25, mass: 0.38 });
  const visualX = useTransform(smoothPointerX, [0, 100], [-18, 18]);
  const visualY = useTransform(smoothPointerY, [0, 100], [-14, 14]);
  const glare = useMotionTemplate`radial-gradient(430px circle at ${smoothPointerX}% ${smoothPointerY}%, var(--signal-glow), transparent 68%)`;

  const move = (event: ReactPointerEvent<HTMLElement>) => {
    if (reduceMotion || event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    pointerX.set(x * 100);
    pointerY.set(y * 100);
    rawRotateX.set((0.5 - y) * 7.5);
    rawRotateY.set((x - 0.5) * 7.5);
  };

  const reset = () => {
    pointerX.set(50);
    pointerY.set(50);
    rawRotateX.set(0);
    rawRotateY.set(0);
    rawLift.set(0);
  };

  return (
    <m.article
      className={`signal-card ${className}`}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.72, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      style={{ rotateX, rotateY, y: lift, transformPerspective: 1300 }}
      onPointerEnter={(event) => {
        if (!reduceMotion && event.pointerType === 'mouse') rawLift.set(-7);
      }}
      onPointerMove={move}
      onPointerLeave={reset}
    >
      <Link href={href} className="signal-card__link" aria-label={label}>
        <m.span className="signal-card__glare" style={{ background: glare }} aria-hidden="true" />
        <span className="signal-card__grid" aria-hidden="true" />
        <m.div
          className="signal-card__visual"
          style={{ x: visualX, y: visualY }}
          aria-hidden="true"
        >
          {visual}
        </m.div>
        <div className="signal-card__content">{children}</div>
      </Link>
    </m.article>
  );
}

function FeaturedPost({ post, index }: { post: ArticleSummary; index: number }) {
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const rotateX = useSpring(rawRotateX, { stiffness: 180, damping: 24, mass: 0.5 });
  const rotateY = useSpring(rawRotateY, { stiffness: 180, damping: 24, mass: 0.5 });

  const move = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    rawRotateX.set(py * -3.2);
    rawRotateY.set(px * 3.2);
  };

  const reset = () => {
    rawRotateX.set(0);
    rawRotateY.set(0);
  };

  return (
    <m.article
      className={`article-card ${post.tone}`}
      initial={{ opacity: 0, y: 72, filter: 'blur(15px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.82, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      style={{ rotateX, rotateY, transformPerspective: 1200 }}
      onPointerMove={move}
      onPointerLeave={reset}
    >
      <div className="card-visual">
        <div className="card-number">{post.number}</div>
        <CardArtwork kind={post.card} />
        <span className="category">{post.tagLabel}</span>
      </div>
      <div className="card-body">
        <div className="card-meta">
          <span>发布于 {post.dateLabel}</span>
        </div>
        <h3>{post.title}</h3>
        <p>{post.excerpt}</p>
        <Link href={post.href} aria-label={`阅读：${post.title}`}>
          <span>阅读全文</span>
          <b>↗</b>
        </Link>
      </div>
    </m.article>
  );
}

export default function HomePage({
  posts,
  categories,
  usefulLinkCount,
}: {
  posts: ArticleSummary[];
  categories: CategorySummary[];
  usefulLinkCount: number;
}) {
  const { theme, toggleTheme } = useSiteExperience();
  const [compactLayout, setCompactLayout] = useState(false);
  const [titleDestinationX, setTitleDestinationX] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const { scrollYProgress } = useScroll();
  const heroRef = useRef<HTMLElement>(null);
  const titleHeadingRef = useRef<HTMLHeadingElement>(null);
  const detailLayerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end end'],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 28, restDelta: 0.001 });
  const titleRestScale = compactLayout ? 0.88 : 0.69;
  const titleX = useTransform(heroProgress, [0, 0.18, 0.66], [0, 0, titleDestinationX]);
  const titleY = useTransform(
    heroProgress,
    [0, 0.18, 0.66, 0.84, 1],
    [
      '0vh',
      '0vh',
      compactLayout ? '-23vh' : '-13vh',
      compactLayout ? '-23vh' : '-13vh',
      compactLayout ? '-38vh' : '-30vh',
    ],
  );
  const titleScale = useTransform(
    heroProgress,
    [0, 0.18, 0.66, 0.84, 1],
    [1, 1, titleRestScale, titleRestScale, compactLayout ? 0.78 : 0.62],
  );
  const titleOpacity = useTransform(heroProgress, [0, 0.8, 0.9, 0.94, 1], [1, 1, 0.18, 0, 0]);
  const titleBlogY = useTransform(heroProgress, [0, 0.84, 0.94, 1], ['0%', '0%', '-42%', '-46%']);
  const titleEyebrowOpacity = useTransform(heroProgress, [0, 0.2, 0.42], [1, 0.5, 0]);
  const detailOpacity = useTransform(heroProgress, [0.18, 0.3, 0.72, 0.82], [0, 1, 1, 0]);
  const introY = useTransform(heroProgress, [0.22, 0.38, 0.7, 0.84], [150, 0, 0, -105]);
  const descriptionY = useTransform(heroProgress, [0.24, 0.4, 0.69, 0.83], [170, 0, 0, -92]);
  const actionsY = useTransform(heroProgress, [0.26, 0.42, 0.68, 0.82], [185, 0, 0, -78]);
  const signalDeckOpacity = useTransform(heroProgress, [0, 0.66, 0.72, 1], [0, 0, 1, 1]);
  const signalDeckY = useTransform(heroProgress, [0, 0.66, 0.9, 1], [180, 180, 20, 0]);
  const deckHeadingOpacity = useTransform(heroProgress, [0, 0.92, 0.97, 1], [0, 0, 0.76, 1]);
  const deckHeadingY = useTransform(heroProgress, [0, 0.92, 0.97, 1], [74, 74, 12, 0]);
  const deckHeadingClip = useTransform(
    heroProgress,
    [0, 0.92, 0.97, 1],
    ['inset(0 50% 0 50%)', 'inset(0 50% 0 50%)', 'inset(0 7% 0 7%)', 'inset(0 0% 0 0%)'],
  );
  const deckGridOpacity = useTransform(heroProgress, [0, 0.66, 0.7, 1], [0, 0, 1, 1]);
  const deckGridY = useTransform(heroProgress, [0, 0.66, 0.82, 0.94, 1], [220, 220, 112, 14, 0]);
  const deckGridRotateX = useTransform(heroProgress, [0, 0.66, 0.78, 0.92, 1], [76, 76, 52, 6, 0]);
  const deckGridScaleX = useTransform(
    heroProgress,
    [0, 0.66, 0.76, 0.9, 1],
    [0.04, 0.04, 0.68, 1, 1],
  );
  const deckGridScaleY = useTransform(
    heroProgress,
    [0, 0.66, 0.74, 0.9, 1],
    [0.015, 0.015, 0.06, 1, 1],
  );
  const deckGridClip = useTransform(
    heroProgress,
    [0, 0.66, 0.78, 0.94, 1],
    [
      'inset(48% 0 48% 0 round 36px)',
      'inset(48% 0 48% 0 round 36px)',
      'inset(36% 2% 36% 2% round 30px)',
      'inset(2% 0 0 0 round 21px)',
      'inset(0% 0 0 0 round 18px)',
    ],
  );
  const reduceMotion = useReducedMotion();
  const [displayedLinkCount, setDisplayedLinkCount] = useState(usefulLinkCount);
  const latestPost = selectLatestArticle(posts);
  const primaryCategories = categories.slice(0, 4);
  const archiveStart = posts.at(-1)?.date.slice(0, 4) ?? '2023';
  const archiveLatest = latestPost?.date.slice(0, 4) ?? archiveStart;

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

  useEffect(() => {
    const media = window.matchMedia('(max-width: 560px)');
    const updateLayout = () => {
      const compact = media.matches;
      const restingScale = compact ? 0.88 : 0.69;
      const headingWidth = titleHeadingRef.current?.offsetWidth ?? 0;
      const detailLeft =
        detailLayerRef.current?.getBoundingClientRect().left ?? (compact ? 15 : 48);
      setCompactLayout(compact);
      setTitleDestinationX(detailLeft - (window.innerWidth - headingWidth * restingScale) / 2);
    };
    updateLayout();
    media.addEventListener('change', updateLayout);
    window.addEventListener('resize', updateLayout, { passive: true });
    document.fonts?.ready.then(updateLayout);
    return () => {
      media.removeEventListener('change', updateLayout);
      window.removeEventListener('resize', updateLayout);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion || introQuotes.length < 2) return;
    const timer = window.setInterval(
      () => setQuoteIndex((current) => (current + 1) % introQuotes.length),
      4200,
    );
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/links', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Links API returned ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((value) => {
        const validation = validateUsefulLinksPayload(value);
        if (!validation.ok) return;
        setDisplayedLinkCount(
          validation.data.groups.reduce((total, group) => total + group.links.length, 0),
        );
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Unable to load useful link count.', error);
      });
    return () => controller.abort();
  }, []);

  return (
    <main className="home-page">
      <m.div className="progress" style={{ scaleX: progress }} />
      <ReactivePointer />
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="nav shell">
        <a className="brand" href="#top" aria-label="Youngkx Blog 首页">
          <Image
            className="brand-avatar"
            src="/avatar.webp"
            alt="Youngkx 头像"
            width={36}
            height={36}
            priority
          />
          <span className="brand-name">Youngkx</span>
        </a>
        <nav
          ref={menuRef}
          id="home-mobile-menu"
          className={menuOpen ? 'nav-links open' : 'nav-links'}
          aria-label="主导航"
        >
          <a href="#top" onClick={() => setMenuOpen(false)}>
            Home
          </a>
          <a href="#posts" onClick={() => setMenuOpen(false)}>
            Articles
          </a>
          <a href="#topics" onClick={() => setMenuOpen(false)}>
            Topics
          </a>
        </nav>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`切换到${theme === 'dark' ? '亮色' : '暗色'}主题`}
          title={`切换到${theme === 'dark' ? '亮色' : '暗色'}主题`}
        >
          <span className="theme-icon">{theme === 'dark' ? '☼' : '◐'}</span>
          <span className="theme-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
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

      <section className="hero-stage" id="top" ref={heroRef}>
        <div className="hero-sticky">
          <m.div
            className="hero-title-layer"
            style={{ x: titleX, y: titleY, scale: titleScale, opacity: titleOpacity }}
          >
            <m.span className="hero-title-eyebrow" style={{ opacity: titleEyebrowOpacity }}>
              Personal Archive / Since 2023
            </m.span>
            <h1 ref={titleHeadingRef}>
              <span className="hero-title-word">Youngkx</span>
              <m.span className="hero-title-blog" style={{ y: titleBlogY }}>
                Blog
              </m.span>
            </h1>
          </m.div>

          <m.div
            ref={detailLayerRef}
            className="hero-detail-layer shell"
            style={{ opacity: detailOpacity }}
          >
            <div className="hero-detail-grid">
              <div className="hero-detail-copy">
                <m.div className="hero-copy-block hero-copy-intro" style={{ y: introY }}>
                  <span className="eyebrow">
                    <i className="status-dot" />
                    Recording, Learning &amp; Building
                  </span>
                  <div className="hero-quote">
                    <AnimatePresence mode="wait">
                      <m.p
                        key={quoteIndex}
                        initial={{ opacity: 0, x: -18, clipPath: 'inset(0 100% 0 0)' }}
                        animate={{ opacity: 1, x: 0, clipPath: 'inset(0 0% 0 0)' }}
                        exit={{ opacity: 0, x: 18, clipPath: 'inset(0 0 0 100%)' }}
                        transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {introQuotes[quoteIndex]}
                      </m.p>
                    </AnimatePresence>
                  </div>
                </m.div>
                <m.div
                  className="hero-copy-block hero-copy-description"
                  style={{ y: descriptionY }}
                >
                  <p>Notes on OI, C / C++, the web, and everyday life.</p>
                </m.div>
                <m.div className="hero-copy-block hero-copy-actions" style={{ y: actionsY }}>
                  <div className="hero-actions">
                    <MagneticLink className="button primary" href="#posts">
                      Explore Posts <span>↓</span>
                    </MagneticLink>
                    <MagneticLink className="text-link" href="#topics">
                      Browse Topics <span>→</span>
                    </MagneticLink>
                  </div>
                </m.div>
              </div>
              <div className="hero-detail-spacer" aria-hidden="true" />
            </div>
          </m.div>
        </div>
      </section>

      <m.section
        className="signal-deck shell"
        aria-labelledby="signal-deck-title"
        style={reduceMotion ? undefined : { opacity: signalDeckOpacity, y: signalDeckY }}
      >
        <m.div
          className="signal-deck__heading"
          style={
            reduceMotion
              ? undefined
              : { opacity: deckHeadingOpacity, y: deckHeadingY, clipPath: deckHeadingClip }
          }
        >
          <div>
            <span>00 / Interactive Index</span>
          </div>
          <h2 id="signal-deck-title">Explore the archive through motion.</h2>
        </m.div>

        <m.div
          className="signal-deck__grid"
          style={
            reduceMotion
              ? undefined
              : {
                  opacity: deckGridOpacity,
                  y: deckGridY,
                  rotateX: deckGridRotateX,
                  scaleX: deckGridScaleX,
                  scaleY: deckGridScaleY,
                  clipPath: deckGridClip,
                  transformPerspective: 1600,
                }
          }
        >
          {latestPost && (
            <InteractiveSignalCard
              href={latestPost.href}
              label={`打开最新文章：${latestPost.title}`}
              className="signal-card--lead"
              index={0}
              visual={
                <div className="signal-constellation">
                  <svg viewBox="0 0 640 520" preserveAspectRatio="xMidYMid slice">
                    <g
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="1"
                      strokeDasharray="7 13"
                      opacity=".25"
                    >
                      <path d="M42 352 C118 112 270 92 332 260 S492 432 610 138" />
                      <path d="M18 226 C148 390 260 394 374 184 S522 86 630 302" opacity=".72" />
                      <path d="M96 478 C174 306 282 264 420 334 S550 372 620 250" opacity=".52" />
                    </g>
                    <g fill="var(--accent)" stroke="var(--ink)" strokeWidth="1">
                      {[
                        [70, 312, 5],
                        [154, 172, 8],
                        [252, 148, 4],
                        [334, 264, 10],
                        [420, 350, 5],
                        [506, 318, 7],
                        [584, 174, 4],
                      ].map(([cx, cy, radius]) => (
                        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={radius} />
                      ))}
                    </g>
                  </svg>
                </div>
              }
            >
              <div className="signal-card__topline">
                <span>Latest Signal</span>
                <i>Live</i>
              </div>
              <div className="signal-card__lead-copy">
                <small>{latestPost.dateLabel}</small>
                <h3>{latestPost.title}</h3>
                <p>{latestPost.excerpt}</p>
              </div>
              <div className="signal-card__footer">
                <span>{latestPost.tagLabel}</span>
                <b>Open Entry ↗</b>
              </div>
            </InteractiveSignalCard>
          )}

          <InteractiveSignalCard
            href="/categories/"
            label="浏览文章主题"
            className="signal-card--topics"
            index={1}
            visual={
              <svg className="signal-radar" viewBox="0 0 300 300">
                <circle cx="150" cy="150" r="148" />
                <circle cx="150" cy="150" r="96" />
                <circle cx="150" cy="150" r="48" />
                <path d="M150 150 L248 93" />
                <circle className="signal-radar__point" cx="248" cy="93" r="5" />
                <circle className="signal-radar__point" cx="88" cy="212" r="4" />
              </svg>
            }
          >
            <div className="signal-card__topline">
              <span>Topic Field</span>
              <i>{String(categories.length).padStart(2, '0')}</i>
            </div>
            <div className="signal-topic-list">
              {primaryCategories.map((category) => (
                <div key={category.id}>
                  <span>{category.number}</span>
                  <strong>{category.title}</strong>
                  <small>{category.posts.length}</small>
                </div>
              ))}
            </div>
            <div className="signal-card__footer">
              <span>Filter The Archive</span>
              <b>Explore ↗</b>
            </div>
          </InteractiveSignalCard>

          <InteractiveSignalCard
            href="/articles/"
            label="查看全部文章"
            className="signal-card--pulse"
            index={2}
            visual={
              <div className="signal-pulse-field">
                {[32, 56, 38, 82, 48, 68, 42, 92, 61, 76, 36, 58].map((height, index) => (
                  <i
                    key={`${height}-${index}`}
                    style={{ '--pulse-height': `${height}%` } as CSSProperties}
                  />
                ))}
              </div>
            }
          >
            <div className="signal-card__topline">
              <span>Archive Pulse</span>
              <i>Synced</i>
            </div>
            <div className="signal-card__metric">
              <strong>{String(posts.length).padStart(2, '0')}</strong>
              <span>Published Notes</span>
            </div>
            <div className="signal-card__footer">
              <span>
                {archiveStart}—{archiveLatest}
              </span>
              <b>All Posts ↗</b>
            </div>
          </InteractiveSignalCard>

          <InteractiveSignalCard
            href="/links/"
            label="打开常用链接"
            className="signal-card--portal"
            index={3}
            visual={
              <svg className="signal-portal-mark" viewBox="0 0 210 210">
                <circle cx="105" cy="105" r="103" />
                <circle cx="105" cy="105" r="64" />
                <circle cx="105" cy="105" r="28" />
                <path d="M89 121 L121 89 M99 89 H121 V111" />
              </svg>
            }
          >
            <div className="signal-card__topline">
              <span>Useful Links</span>
              <i>{String(displayedLinkCount).padStart(2, '0')}</i>
            </div>
            <div className="signal-card__portal-copy">
              <small>Tools / References / Places</small>
              <h3>Open Links.</h3>
            </div>
            <div className="signal-card__footer">
              <span>Open Directory</span>
              <b>↗</b>
            </div>
          </InteractiveSignalCard>
        </m.div>
      </m.section>

      <section className="writing shell section" id="posts">
        <m.div
          className="section-heading"
          initial={{ opacity: 0, y: 64, filter: 'blur(16px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '0px' }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <span className="section-index">01 /</span>
            <span className="kicker">Articles</span>
          </div>
          <h2>Articles</h2>
        </m.div>

        <div className="article-list">
          {posts.slice(0, 3).map((post, index) => (
            <FeaturedPost post={post} index={index} key={post.href} />
          ))}
        </div>
        <m.div
          className="more-posts"
          initial={{ opacity: 0, y: 42, filter: 'blur(12px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <Link href="/articles/">
            <span>更多文章</span>
            <b>查看全部 {posts.length} 篇</b>
            <i>↗</i>
          </Link>
        </m.div>
      </section>

      <section className="topics shell section" id="topics">
        <m.div
          className="section-heading"
          initial={{ opacity: 0, y: 64, filter: 'blur(16px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <span className="section-index">02 /</span>
            <span className="kicker">Topics</span>
          </div>
          <h2>Topics</h2>
        </m.div>
        <div className="category-grid">
          {categories.map((category, index) => (
            <m.a
              href={`/categories/#${category.id}`}
              className="category-block"
              key={category.id}
              initial={{ opacity: 0, y: 70, filter: 'blur(15px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, margin: '-70px' }}
              transition={{ duration: 0.82, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
            >
              <span>{category.number}</span>
              <h3>{category.title}</h3>
              <p>{category.description}</p>
              <b>{category.posts.length} 篇相关文章</b>
            </m.a>
          ))}
        </div>
      </section>

      <SiteFooter backHref="#top" backLabel="返回顶部 ↑" />
    </main>
  );
}

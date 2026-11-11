'use client';

import { m, useScroll, useSpring } from 'framer-motion';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ArticleSummary } from '@/lib/articles';
import { validateUsefulLinksPayload } from '@/lib/useful-links';
import ArchivePass from './ArchivePass';
import FeaturedArticleCard from './FeaturedArticleCard';
import SiteFooter from './SiteFooter';
import ResourceNav from './ResourceNav';
import SiteBrand from './SiteBrand';
import ElectricLogo from './ElectricLogo';
import TopicCard, { type TopicCardCategory } from './TopicCard';
import DotGrid from './react-bits/DotGrid';
import TechText from './react-bits/TechText';
import ScrollStack from './react-bits/ScrollStack';
import FlexCarousel, { type FlexCarouselItem } from './react-bits/FlexCarousel';
import CurvedLoop from './react-bits/CurvedLoop';
import Magnet from './react-bits/Magnet';
import StrokeText from './react-bits/StrokeText';
import WarpText from './react-bits/WarpText';
import latestCover from './react-bits/flex-carousel/covers/latest.webp';
import topicsCover from './react-bits/flex-carousel/covers/topics.webp';
import articlesCover from './react-bits/flex-carousel/covers/articles.webp';
import linksCover from './react-bits/flex-carousel/covers/links.webp';
import repositoryCover from './react-bits/flex-carousel/covers/repository.webp';

function GradientASCIIFallback({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

const GradientASCII = dynamic(
  () =>
    import('./react-bits/gradient-ascii/GradientASCII').catch(() => ({
      default: GradientASCIIFallback,
    })),
  { ssr: false },
);

export default function HomePage({
  featuredPosts,
  latestPost,
  articleCount,
  categories,
  usefulLinkCount,
}: {
  featuredPosts: ArticleSummary[];
  latestPost?: Pick<ArticleSummary, 'href' | 'title'>;
  articleCount: number;
  categories: TopicCardCategory[];
  usefulLinkCount: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [backgroundReady, setBackgroundReady] = useState(false);
  const [logoReady, setLogoReady] = useState(false);
  const onBackgroundReady = useCallback(() => setBackgroundReady(true), []);
  const onLogoReady = useCallback(() => setLogoReady(true), []);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 28, restDelta: 0.001 });
  const menuRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const cardsRef = useRef<HTMLElement>(null);
  const [displayedLinkCount, setDisplayedLinkCount] = useState(usefulLinkCount);
  const cards: FlexCarouselItem[] = [
    ...(latestPost
      ? [
          {
            cover: latestCover,
            href: latestPost.href,
            title: '最新文章',
            subtitle: latestPost.title,
            label: `打开最新文章：${latestPost.title}`,
          },
        ]
      : []),
    {
      cover: topicsCover,
      href: '/categories/',
      title: 'Topics',
      subtitle: `${categories.length} 个主题`,
      label: '浏览文章主题',
    },
    {
      cover: articlesCover,
      href: '/articles/',
      title: 'Article Archive',
      subtitle: `${articleCount} 篇文章`,
      label: '查看全部文章',
    },
    {
      cover: linksCover,
      href: '/links/',
      title: 'Useful Links',
      subtitle: `${displayedLinkCount} 个常用链接`,
      label: '打开常用链接',
    },
    {
      cover: repositoryCover,
      href: '/repo/',
      title: 'File Repository',
      subtitle: '文件与学习资料',
      label: '打开文件仓库 Repo',
    },
  ];

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
    const controller = new AbortController();
    const loadCount = () =>
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
    const cards = cardsRef.current;
    if (!cards || typeof IntersectionObserver === 'undefined') {
      void loadCount();
      return () => controller.abort();
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      void loadCount();
    });
    observer.observe(cards);
    return () => {
      observer.disconnect();
      controller.abort();
    };
  }, []);

  return (
    <main className="home-page" id="top">
      <m.div className="progress" style={{ scaleX: progress }} />

      <header className="nav shell">
        <SiteBrand href="#top" theme="dark" />
        <nav
          ref={menuRef}
          id="home-mobile-menu"
          className={menuOpen ? 'nav-links open' : 'nav-links'}
          aria-label="主导航"
        >
          <a href="#top" onClick={() => setMenuOpen(false)}>
            Home
          </a>
          <a href="#interactive-cards" onClick={() => setMenuOpen(false)}>
            Cards
          </a>
          <a href="#posts" onClick={() => setMenuOpen(false)}>
            Articles
          </a>
          <a href="#topics" onClick={() => setMenuOpen(false)}>
            Topics
          </a>
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

      <section className="home-intro" aria-labelledby="home-title">
        <div className="home-ascii-background" aria-hidden="true">
          <GradientASCII theme="dark" onReady={onBackgroundReady} />
        </div>
        <div className="home-intro__identity">
          <ElectricLogo theme="dark" onReady={onLogoReady} />
          <TechText id="home-title" text="Youngkx Blog" theme="dark" />
        </div>
      </section>
      <ArchivePass heroReady={backgroundReady && logoReady} />

      <section
        ref={cardsRef}
        id="interactive-cards"
        className="signal-deck shell"
        aria-labelledby="signal-deck-title"
      >
        <div className="signal-deck__heading">
          <h2 id="signal-deck-title">
            <WarpText
              text="Cards"
              warpStrength={0.08}
              warpScale={1.7}
              speed={0.55}
              lens="bulge"
              pointerInfluence={0.42}
              pointerStrength={0.38}
              refraction={0.018}
              chromatic={0.35}
              idleDrift={0.2}
              ripple
              clickRipple
              intro
              fontSize={116}
              fontWeight={800}
              fontFamily="inherit"
              letterSpacing="-0.06em"
              lineHeight={0.9}
            />
          </h2>
        </div>

        <FlexCarousel items={cards} />
      </section>

      <div className="writing-background">
        <DotGrid />
        <section className="writing shell section" id="posts">
          <ScrollStack
            heading={
              <m.h2
                className="section-heading writing-heading"
                aria-label="Articles"
                initial={{ opacity: 0, y: 64, filter: 'blur(16px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, margin: '0px' }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              >
                <CurvedLoop
                  aria-hidden
                  marqueeText="Articles"
                  shape="line"
                  speed={2}
                  curveAmount={400}
                  direction="left"
                  fontSize={96}
                  fontWeight={700}
                  letterSpacing={0}
                  separator=""
                  outline={false}
                  scrollBoost={0}
                  edgeFade={0}
                  interactive
                  pauseOnHover={false}
                />
              </m.h2>
            }
          >
            {featuredPosts.map((post) => (
              <FeaturedArticleCard post={post} key={post.href} />
            ))}
          </ScrollStack>
          <div className="more-posts">
            <Magnet padding={100} magnetStrength={3} wrapperClassName="more-posts__magnet">
              <Link href="/articles/" className="more-posts__link">
                更多文章
              </Link>
            </Magnet>
          </div>
        </section>
      </div>

      <section className="topics section" id="topics" aria-labelledby="topics-title">
        <div className="topics-inner shell">
          <m.div
            className="section-heading topics-heading"
            initial={{ opacity: 0, y: 64, filter: 'blur(16px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 id="topics-title">
              <StrokeText
                text="Topics"
                strokeColor="#A78BFA"
                strokeStyle="solid"
                strokeWidth={1.4}
                dashLength={10}
                drawDuration={1.6}
                fillDelay={0.2}
                stagger={0.05}
                ease="power2.out"
                trigger="scroll"
                repeatEvery={30}
                fillMode="wipe"
                wipeFrom="left"
                fontSize={112}
                fontWeight={800}
                letterSpacing={-3}
                marching={false}
                hoverRedraw
                shadow={false}
                fontFamily="inherit"
                reverse={false}
              />
            </h2>
            <p className="topics-meta">
              <span className="topics-meta__label">Topic Index · 主题索引</span>
              <span className="topics-meta__count">
                {String(categories.length).padStart(2, '0')}
                <small>个主题</small>
              </span>
            </p>
          </m.div>
        </div>
        <div className="topics-cut" aria-hidden="true">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none" focusable="false">
            <defs>
              <linearGradient id="topics-cut-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f9f7f2" />
                <stop offset="0.45" stopColor="#f8f6f1" />
                <stop offset="1" stopColor="#f7f5f0" />
              </linearGradient>
              <linearGradient
                id="topics-cut-stroke"
                x1="0"
                y1="0"
                x2="1440"
                y2="0"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0" stopColor="#f7f5f0" stopOpacity="0" />
                <stop offset="0.09" stopColor="#eef0f8" stopOpacity="0.6" />
                <stop offset="0.45" stopColor="#d8dceb" stopOpacity="0.95" />
                <stop offset="0.74" stopColor="#bdb5e4" />
                <stop offset="0.92" stopColor="#A78BFA" />
                <stop offset="1" stopColor="#A78BFA" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M 1006 50 C 1108 42 1226 33 1348 26"
              fill="none"
              stroke="#A78BFA"
              strokeWidth="1"
              strokeDasharray="2 7"
              strokeLinecap="round"
              opacity="0.55"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx="1348" cy="26" r="2.4" fill="#A78BFA" opacity="0.8" />
            <path
              d="M0 88 C 180 96 340 101 496 96 C 660 91 774 74 906 68 C 1058 61 1260 52 1440 44 L 1440 120 L 0 120 Z"
              fill="url(#topics-cut-fill)"
            />
            <path
              d="M0 88 C 180 96 340 101 496 96 C 660 91 774 74 906 68 C 1058 61 1260 52 1440 44"
              fill="none"
              stroke="url(#topics-cut-stroke)"
              strokeWidth="1.75"
              vectorEffect="non-scaling-stroke"
              style={{ filter: 'drop-shadow(0 0 7px rgba(167, 139, 250, 0.28))' }}
            />
            <path
              d="M 2 94 C 180 102 340 107 496 102 C 660 97 774 80 906 74 C 1058 67 1258 58 1428 50"
              fill="none"
              stroke="#1c1a16"
              strokeOpacity="0.18"
              strokeWidth="0.7"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
        <div className="topics-band">
          <span className="topics-spine" aria-hidden="true">
            Youngkx Journal — Topic Index
          </span>
          <div className="topics-inner shell">
            <div className="category-grid">
              {categories.map((category) => (
                <TopicCard key={category.id} category={category} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter backHref="#top" backLabel="返回顶部 ↑" />
    </main>
  );
}

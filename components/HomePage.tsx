'use client';

import { m, useScroll, useSpring } from 'framer-motion';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ArticleSummary } from '@/lib/articles';
import { validateUsefulLinksPayload } from '@/lib/useful-links';
import ArchivePass from './ArchivePass';
import FeaturedArticleCard from './FeaturedArticleCard';
import HomeHeader from './HomeHeader';
import SiteFooter from './SiteFooter';
import ElectricLogo from './ElectricLogo';
import TopicCard, { type TopicCardCategory } from './TopicCard';
import ArticlesDotGrid from './react-bits/ArticlesDotGrid';
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
  const [compactLayout, setCompactLayout] = useState(false);
  const [backgroundReady, setBackgroundReady] = useState(false);
  const [logoReady, setLogoReady] = useState(false);
  const onBackgroundReady = useCallback(() => setBackgroundReady(true), []);
  const onLogoReady = useCallback(() => setLogoReady(true), []);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 28, restDelta: 0.001 });
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
      title: '友链',
      subtitle: `${displayedLinkCount} 个朋友的网站`,
      label: '打开友链',
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
    const media = window.matchMedia('(max-width: 820px)');
    const updateLayout = () => setCompactLayout(media.matches);
    updateLayout();
    media.addEventListener('change', updateLayout);
    return () => media.removeEventListener('change', updateLayout);
  }, []);

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
          console.error('Unable to load friend link count.', error);
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

      <HomeHeader />

      <section className="home-intro" aria-labelledby="home-title">
        <div className="home-ascii-background" aria-hidden="true">
          <GradientASCII theme="dark" onReady={onBackgroundReady} />
        </div>
        <div className="home-intro__identity">
          <ElectricLogo theme="dark" onReady={onLogoReady} />
          <TechText id="home-title" text="Youngkx Blog" theme="dark" />
        </div>
      </section>
      <ArchivePass compactLayout={compactLayout} heroReady={backgroundReady && logoReady} />

      <section
        ref={cardsRef}
        id="interactive-cards"
        className="signal-deck shell"
        aria-labelledby="signal-deck-title"
      >
        <div className="signal-deck__heading">
          <m.div
            className="home-lamp"
            aria-hidden="true"
            initial={{ opacity: 0, scaleX: 0.45 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <span />
            <span />
            <i />
          </m.div>
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
        <ArticlesDotGrid />
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
            <Magnet padding={45} magnetStrength={3} wrapperClassName="more-posts__magnet">
              <Link href="/articles/" className="more-posts__link">
                更多文章
              </Link>
            </Magnet>
          </div>
        </section>
      </div>

      <section className="topics section" id="topics" aria-labelledby="topics-title">
        <div className="topics-backdrop" aria-hidden="true" />
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
        <div className="topics-inner shell">
          <div className="category-grid">
            {categories.map((category, index) => (
              <TopicCard key={category.id} category={category} index={index + 1} />
            ))}
          </div>
        </div>
      </section>

      <SiteFooter backHref="#top" backLabel="返回顶部 ↑" showThemeToggle={false} />
    </main>
  );
}

'use client';

import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import type { ArticleSummary, CategorySummary } from '@/lib/articles';
import type { CardPreset } from '@/lib/card-presets';
import { useSiteExperience } from './SiteExperience';
import SiteFooter from './SiteFooter';

const introQuotes = [
  '我见青山多妩媚，料青山见我应如是。',
  'Life is real, life is earnest.',
];

export function CardArtwork({ kind }: { kind: CardPreset }) {
  if (kind === 'ai') {
    return (
      <div className="artwork ai-art" aria-hidden="true">
        <svg viewBox="0 0 320 220">
          <g className="ai-links">
            <path d="M48 52 135 36M48 52 135 108M48 110 135 36M48 110 135 108M48 168 135 108M48 168 135 180M135 36 238 70M135 36 238 150M135 108 238 70M135 108 238 150M135 180 238 150M238 70 284 110M238 150 284 110" />
          </g>
          <g className="ai-nodes">
            {[[48,52],[48,110],[48,168],[135,36],[135,108],[135,180],[238,70],[238,150],[284,110]].map(([cx, cy], index) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={index === 8 ? 10 : 6} />)}
          </g>
        </svg>
        <span className="ai-label">NEURAL FLOW</span>
        <i className="ai-pulse pulse-one" /><i className="ai-pulse pulse-two" /><i className="ai-pulse pulse-three" />
      </div>
    );
  }
  if (kind === 'cs') {
    return (
      <div className="artwork cs-art" aria-hidden="true">
        <div className="cs-chip"><span>CS</span><small>1010</small></div>
        <i className="cs-trace trace-one" /><i className="cs-trace trace-two" /><i className="cs-trace trace-three" /><i className="cs-trace trace-four" />
        <b className="cs-signal signal-one" /><b className="cs-signal signal-two" /><b className="cs-signal signal-three" />
        <span className="cs-label">PROCESS / MEMORY / LOGIC</span>
      </div>
    );
  }
  if (kind === 'vlog') {
    return (
      <div className="artwork vlog-art" aria-hidden="true">
        <div className="vlog-screen"><div className="vlog-sun" /><div className="vlog-land land-back" /><div className="vlog-land land-front" /><span>REC</span></div>
        <div className="vlog-timeline"><i /><b /></div>
        <span className="vlog-time">00:00:24</span>
      </div>
    );
  }
  if (kind === 'talk') {
    return (
      <div className="artwork talk-art" aria-hidden="true">
        <div className="talk-bubble bubble-one"><span>THOUGHTS</span><i /><i /><i /></div>
        <div className="talk-bubble bubble-two"><b>…</b></div>
        <div className="talk-orbit" />
      </div>
    );
  }
  if (kind === 'code') {
    return (
      <div className="artwork terminal-art" aria-hidden="true">
        <div className="terminal-top"><i /><i /><i /><span>main.cpp</span></div>
        <div className="terminal-code"><span><b>int</b> value = <em>42</em>;</span><span><b>printf</b>(<i>&quot;%d&quot;</i>, value);</span><span className="terminal-output">› 42_</span></div>
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
          {[['45','155'],['105','78'],['165','137'],['226','48'],['278','125']].map(([cx, cy], index) => <circle key={cx} cx={cx} cy={cy} r={index === 3 ? 9 : 6} />)}
        </svg>
        <span className="network-label label-a">GRAPH</span><span className="network-label label-b">DP</span><span className="network-label label-c">CSP-S</span>
      </div>
    );
  }
  if (kind === 'timeline') {
    return (
      <div className="artwork timeline-art" aria-hidden="true">
        <div className="timeline-track"><i /><i /><i /><i /></div>
        <div className="timeline-labels"><span>起步<small>学习</small></span><span>通过<small>练习</small></span><span>竞赛<small>CSP</small></span><span>记录<small>OI</small></span></div>
        <div className="timeline-signal" />
      </div>
    );
  }
  return <div className="artwork protocol-art" aria-hidden="true"><span>CLIENT</span><i>GET / HTTP/1.1 →</i><span>SERVER</span></div>;
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
      <motion.div className="pointer-glow" style={{ background: glow }} />
      <motion.div className="pointer-dot" style={{ x: dotX, y: dotY }} />
    </>
  );
}

function MagneticLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
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

  return <motion.a href={href} className={className} style={{ x, y }} onPointerMove={move} onPointerLeave={() => { rawX.set(0); rawY.set(0); }}>{children}</motion.a>;
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
    <motion.article
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
        <div className="card-meta"><span>发布于 {post.dateLabel}</span></div>
        <h3>{post.title}</h3>
        <p>{post.excerpt}</p>
        <a href={post.href} aria-label={`阅读：${post.title}`}><span>阅读全文</span><b>↗</b></a>
      </div>
    </motion.article>
  );
}

export default function HomePage({ posts, categories }: { posts: ArticleSummary[]; categories: CategorySummary[] }) {
  const { theme, toggleTheme } = useSiteExperience();
  const [compactLayout, setCompactLayout] = useState(false);
  const [titleDestinationX, setTitleDestinationX] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const { scrollYProgress } = useScroll();
  const heroRef = useRef<HTMLElement>(null);
  const titleHeadingRef = useRef<HTMLHeadingElement>(null);
  const detailLayerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end end'],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 28, restDelta: 0.001 });
  const titleRestScale = compactLayout ? 0.88 : 0.69;
  const titleX = useTransform(heroProgress, [0, 0.18, 0.66], [0, 0, titleDestinationX]);
  const titleY = useTransform(heroProgress, [0, 0.18, 0.66, 0.84, 1], ['0vh', '0vh', compactLayout ? '-23vh' : '-13vh', compactLayout ? '-23vh' : '-13vh', compactLayout ? '-38vh' : '-30vh']);
  const titleScale = useTransform(heroProgress, [0, 0.18, 0.66, 0.84, 1], [1, 1, titleRestScale, titleRestScale, compactLayout ? 0.78 : 0.62]);
  const titleOpacity = useTransform(heroProgress, [0, 0.94, 1], [1, 1, 0]);
  const titleBlogY = useTransform(heroProgress, [0, 0.84, 0.94, 1], ['0%', '0%', '-42%', '-46%']);
  const titleEyebrowOpacity = useTransform(heroProgress, [0, 0.2, 0.42], [1, 0.5, 0]);
  const detailOpacity = useTransform(heroProgress, [0.22, 0.52, 0.84, 1], [0, 1, 1, 0]);
  const introOpacity = useTransform(heroProgress, [0.24, 0.54, 0.84, 1], [0, 1, 1, 0]);
  const introY = useTransform(heroProgress, [0.24, 0.56, 0.84, 1], [150, 0, 0, -105]);
  const descriptionOpacity = useTransform(heroProgress, [0.3, 0.62, 0.86, 1], [0, 1, 1, 0]);
  const descriptionY = useTransform(heroProgress, [0.3, 0.64, 0.86, 1], [170, 0, 0, -92]);
  const actionsOpacity = useTransform(heroProgress, [0.38, 0.7, 0.88, 1], [0, 1, 1, 0]);
  const actionsY = useTransform(heroProgress, [0.38, 0.72, 0.88, 1], [185, 0, 0, -78]);
  const cueOpacity = useTransform(heroProgress, [0, 0.2, 0.36], [1, 1, 0]);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 560px)');
    const updateLayout = () => {
      const compact = media.matches;
      const restingScale = compact ? 0.88 : 0.69;
      const headingWidth = titleHeadingRef.current?.offsetWidth ?? 0;
      const detailLeft = detailLayerRef.current?.getBoundingClientRect().left ?? (compact ? 15 : 48);
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
    if (reduceMotion) return;
    const timer = window.setInterval(() => setQuoteIndex((current) => (current + 1) % introQuotes.length), 4200);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  return (
    <main className="home-page">
      <motion.div className="progress" style={{ scaleX: progress }} />
      <ReactivePointer />
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="nav shell">
        <a className="brand" href="#top" aria-label="Youngkx Blog 首页">
          <img className="brand-avatar" src="/avatar.webp" alt="Youngkx 头像" />
          <span className="brand-name">Youngkx</span>
        </a>
        <nav className={menuOpen ? 'nav-links open' : 'nav-links'} aria-label="主导航">
          <a href="#top" onClick={() => setMenuOpen(false)}>首页</a>
          <a href="#posts" onClick={() => setMenuOpen(false)}>文章</a>
          <a href="#topics" onClick={() => setMenuOpen(false)}>分类</a>
        </nav>
        <button className="theme-toggle" onClick={toggleTheme} aria-label={`切换到${theme === 'dark' ? '亮色' : '暗色'}主题`} title={`切换到${theme === 'dark' ? '亮色' : '暗色'}主题`}>
          <span className="theme-icon">{theme === 'dark' ? '☼' : '◐'}</span>
          <span className="theme-label">{theme === 'dark' ? 'LIGHT' : 'DARK'}</span>
        </button>
        <button className="menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="切换菜单" aria-expanded={menuOpen}>
          <span /><span />
        </button>
      </header>

      <section className="hero-stage" id="top" ref={heroRef}>
        <div className="hero-sticky">
          <motion.div className="hero-title-layer" style={{ x: titleX, y: titleY, scale: titleScale, opacity: titleOpacity }}>
            <motion.span className="hero-title-eyebrow" style={{ opacity: titleEyebrowOpacity }}>PERSONAL ARCHIVE / SINCE 2023</motion.span>
            <h1 ref={titleHeadingRef}>
              <span className="hero-title-word">Youngkx</span>
              <motion.span className="hero-title-blog" style={{ y: titleBlogY }}>Blog</motion.span>
            </h1>
          </motion.div>

          <motion.div ref={detailLayerRef} className="hero-detail-layer shell" style={{ opacity: detailOpacity }}>
            <div className="hero-detail-grid">
              <div className="hero-detail-copy">
                <motion.div className="hero-copy-block hero-copy-intro" style={{ opacity: introOpacity, y: introY }}>
                  <span className="eyebrow"><i className="status-dot" />记录、学习与持续构建</span>
                  <div className="hero-quote">
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={quoteIndex}
                        initial={{ opacity: 0, x: -18, clipPath: 'inset(0 100% 0 0)' }}
                        animate={{ opacity: 1, x: 0, clipPath: 'inset(0 0% 0 0)' }}
                        exit={{ opacity: 0, x: 18, clipPath: 'inset(0 0 0 100%)' }}
                        transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {introQuotes[quoteIndex]}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </motion.div>
                <motion.div className="hero-copy-block hero-copy-description" style={{ opacity: descriptionOpacity, y: descriptionY }}>
                  <p>记录 OI、C / C++、Web 与日常思考，在代码、文字和时间之间留下可以回看的坐标。</p>
                </motion.div>
                <motion.div className="hero-copy-block hero-copy-actions" style={{ opacity: actionsOpacity, y: actionsY }}>
                  <div className="hero-actions">
                    <MagneticLink className="button primary" href="#posts">浏览文章 <span>↓</span></MagneticLink>
                    <MagneticLink className="text-link" href="#topics">文章主题 <span>→</span></MagneticLink>
                  </div>
                </motion.div>
              </div>
              <div className="hero-detail-spacer" aria-hidden="true" />
            </div>
          </motion.div>

          <motion.div className="hero-scroll-cue" style={{ opacity: cueOpacity }}>
            <span>SCROLL TO EXPLORE</span><i />
          </motion.div>
        </div>
      </section>

      <section className="writing shell section" id="posts">
        <motion.div className="section-heading" initial={{ opacity: 0, y: 64, filter: 'blur(16px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
          <div><span className="section-index">01 /</span><span className="kicker">文章</span></div>
          <h2>文章</h2>
          <p>首页按时间倒序展示原博客文章，正文、代码示例和旧链接均已保留。</p>
        </motion.div>

        <div className="article-list">
          {posts.slice(0, 3).map((post, index) => <FeaturedPost post={post} index={index} key={post.href} />)}
        </div>
        <motion.div className="more-posts" initial={{ opacity: 0, y: 42, filter: 'blur(12px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
          <a href="/articles/"><span>更多文章</span><b>查看全部 {posts.length} 篇</b><i>↗</i></a>
        </motion.div>
      </section>

      <section className="topics shell section" id="topics">
        <motion.div className="section-heading" initial={{ opacity: 0, y: 64, filter: 'blur(16px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
          <div><span className="section-index">02 /</span><span className="kicker">分类</span></div>
          <h2>分类</h2>
          <p>按内容主题浏览文章，快速找到信息学竞赛、C / C++ 与 Web 相关笔记。</p>
        </motion.div>
        <div className="category-grid">
          {categories.map((category, index) => (
            <motion.a
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
            </motion.a>
          ))}
        </div>
      </section>

      <SiteFooter backHref="#top" backLabel="返回顶部 ↑" />
    </main>
  );
}

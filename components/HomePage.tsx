'use client';

import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useState } from 'react';
import Scene from './Scene';

export const posts = [
  {
    number: '01',
    title: 'printf 用法详解',
    excerpt: '系统整理 printf 的类型、标志、输出宽度、精度、转义字符与常用示例。',
    date: '2023.11.05',
    tag: 'C / OI',
    href: '/2023/11/05/printf用法详解/',
    tone: 'mint',
    visual: 'terminal',
  },
  {
    number: '02',
    title: '信息学竞赛要学什么？',
    excerpt: '从 CSP-S 到 NOIP，整理信息学竞赛流程、需要掌握的知识和学习路线。',
    date: '2023.11.04',
    tag: 'OI',
    href: '/2023/11/04/OI要学什么？/',
    tone: 'blue',
    visual: 'network',
  },
  {
    number: '03',
    title: '我的 OI 之路',
    excerpt: '关于学习算法、参加竞赛以及离开 OI 的个人记录。',
    date: '2023.10.23',
    tag: 'OI',
    href: '/2023/10/23/我的OI/',
    tone: 'violet',
    visual: 'timeline',
  },
  {
    number: '04',
    title: 'My HTTP',
    excerpt: 'HTTP 基础笔记：请求方法、状态码、请求头以及常见工作流程。',
    date: '2023.10.23',
    tag: 'WEB',
    href: '/2023/10/23/http/',
    tone: 'blue',
    visual: 'protocol',
  },
];

const introQuotes = [
  '我见青山多妩媚，料青山见我应如是。',
  'Life is real, life is earnest.',
];

function CardArtwork({ kind }: { kind: string }) {
  if (kind === 'terminal') {
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
        <div className="timeline-labels"><span>START<small>2023.03</small></span><span>AC<small>+1</small></span><span>CSP<small>2023.09</small></span><span>END<small>2023.10</small></span></div>
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
    const rect = event.currentTarget.getBoundingClientRect();
    rawX.set((event.clientX - rect.left - rect.width / 2) * 0.16);
    rawY.set((event.clientY - rect.top - rect.height / 2) * 0.16);
  };

  return <motion.a href={href} className={className} style={{ x, y }} onPointerMove={move} onPointerLeave={() => { rawX.set(0); rawY.set(0); }}>{children}</motion.a>;
}

function FeaturedPost({ post, index }: { post: (typeof posts)[number]; index: number }) {
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const rotateX = useSpring(rawRotateX, { stiffness: 180, damping: 24, mass: 0.5 });
  const rotateY = useSpring(rawRotateY, { stiffness: 180, damping: 24, mass: 0.5 });

  const move = (event: ReactPointerEvent<HTMLElement>) => {
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
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay: index * 0.08 }}
      style={{ rotateX, rotateY, transformPerspective: 1200 }}
      onPointerMove={move}
      onPointerLeave={reset}
    >
      <div className="card-visual">
        <div className="card-number">{post.number}</div>
        <CardArtwork kind={post.visual} />
        <span className="category">{post.tag}</span>
      </div>
      <div className="card-body">
        <div className="card-meta"><span>{post.date}</span><span>YOUNGKX.CN</span></div>
        <h3>{post.title}</h3>
        <p>{post.excerpt}</p>
        <a href={post.href} aria-label={`阅读：${post.title}`}><span>阅读全文</span><b>↗</b></a>
      </div>
    </motion.article>
  );
}

export default function HomePage() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 28, restDelta: 0.001 });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.25]);
  const heroY = useTransform(scrollYProgress, [0, 0.22], [0, 90]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [quoteIndex, setQuoteIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    const saved = localStorage.getItem('youngkx-theme');
    const initial = saved === 'light' || saved === 'dark'
      ? saved
      : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => setQuoteIndex((current) => (current + 1) % introQuotes.length), 4200);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem('youngkx-theme', next);
  };

  return (
    <main>
      <motion.div className="progress" style={{ scaleX: progress }} />
      <ReactivePointer />
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="nav shell">
        <a className="brand" href="#top" aria-label="Youngkx Blog 首页">
          <span className="brand-mark">YK</span>
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

      <section className="hero shell" id="top">
        <motion.div className="hero-copy" style={{ opacity: heroOpacity, y: heroY }}>
          <motion.div className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <span className="status-dot" /> YOUNGKX.CN / 2023
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 42 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}>
            Youngkx<br />
            <span>Blog</span>
          </motion.h1>
          <motion.div className="hero-quote" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.36 }}>
            <AnimatePresence mode="wait">
              <motion.p key={quoteIndex} initial={{ opacity: 0, y: 8, filter: 'blur(5px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -8, filter: 'blur(5px)' }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
                {introQuotes[quoteIndex]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
          <motion.div className="hero-actions" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <MagneticLink className="button primary" href="#posts">浏览文章 <span>↓</span></MagneticLink>
            <MagneticLink className="text-link" href="#topics">文章主题 <span>→</span></MagneticLink>
          </motion.div>
        </motion.div>

        <motion.div className="visual" initial={{ opacity: 0, scale: 0.86 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.4, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}>
          <Scene theme={theme} />
          <div className="orbit-label orbit-a"><i /> 4 POSTS</div>
          <div className="orbit-label orbit-b"><i /> OI / C / WEB</div>
        </motion.div>
        <div className="hero-meta"><span>INFORMATICS OLYMPIAD</span><span>PROGRAMMING NOTES</span></div>
        <a href="#posts" className="scroll-cue" aria-label="向下滚动"><span /> LATEST POSTS</a>
      </section>

      <section className="marquee" aria-hidden="true">
        <div>信息学竞赛 <b>✦</b> C / C++ <b>✦</b> HTTP <b>✦</b> 学习笔记 <b>✦</b> 信息学竞赛 <b>✦</b> C / C++ <b>✦</b> HTTP <b>✦</b> 学习笔记 <b>✦</b></div>
      </section>

      <section className="writing shell section" id="posts">
        <motion.div className="section-heading" initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.75 }}>
          <div><span className="section-index">01 /</span><span className="kicker">全部内容</span></div>
          <h2>文章</h2>
          <p>首页按时间倒序展示原博客文章，正文、代码示例和旧链接均已保留。</p>
        </motion.div>

        <div className="article-list">
          {posts.slice(0, 3).map((post, index) => <FeaturedPost post={post} index={index} key={post.href} />)}
        </div>
        <motion.div className="more-posts" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <a href="/articles/"><span>更多文章</span><b>查看全部 4 篇</b><i>↗</i></a>
        </motion.div>
      </section>

      <section className="topics shell section" id="topics">
        <motion.div className="archive-head" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div><span className="section-index">02 /</span><span className="kicker">主题</span></div>
          <span className="archive-count">OI · C · WEB</span>
        </motion.div>
        <div className="category-grid">
          <a href="/articles/#oi" className="category-block"><span>01</span><h3>OI</h3><p>信息学竞赛与学习路线</p><b>3 篇相关文章</b></a>
          <a href="/articles/#c" className="category-block"><span>02</span><h3>C / C++</h3><p>语言基础与函数用法</p><b>1 篇相关文章</b></a>
          <a href="/articles/#web" className="category-block"><span>03</span><h3>Web</h3><p>HTTP 基础知识整理</p><b>1 篇相关文章</b></a>
        </div>
      </section>

      <footer className="footer shell">
        <span>© 2023 YOUNGKX.CN</span>
        <span>4 POSTS · 1 CATEGORY · 2 TAGS</span>
        <a href="#top">返回顶部 ↑</a>
      </footer>
    </main>
  );
}

'use client';

import { motion, useScroll, useSpring } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ArticleRecord } from '@/lib/articles';
import { useSiteExperience } from './SiteExperience';
import SiteFooter from './SiteFooter';

type TocItem = { id: string; text: string; level: number };

export default function ArticleView({ article }: { article: ArticleRecord }) {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });
  const contentRef = useRef<HTMLElement>(null);
  const { theme, toggleTheme } = useSiteExperience();
  const [toc, setToc] = useState<TocItem[]>([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const characters = useMemo(() => article.content.replace(/<[^>]+>/g, '').replace(/\s+/g, '').length, [article.content]);
  const minutes = Math.max(1, Math.ceil(characters / 500));

  useEffect(() => {
    const headings = [...(contentRef.current?.querySelectorAll('h2, h3') ?? [])];
    setToc(headings.map((heading) => ({ id: heading.id, text: heading.textContent ?? '', level: heading.tagName === 'H3' ? 3 : 2 })));
  }, []);

  const copyLink = async () => {
    const link = window.location.href;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const input = document.createElement('textarea');
      input.value = link;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <main className="modern-article-page">
      <motion.div className="progress" style={{ scaleX: progress }} />
      <header className="nav shell">
        <a className="brand" href="/#top"><img className="brand-avatar" src="/avatar.webp" alt="Youngkx 头像" /><span className="brand-name">Youngkx</span></a>
        <nav className="nav-links article-nav-links"><a href="/#top">首页</a><a href="/articles/">文章</a><a href="/categories/">分类</a></nav>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="切换主题"><span className="theme-icon">{theme === 'dark' ? '☼' : '◐'}</span><span className="theme-label">{theme === 'dark' ? 'LIGHT' : 'DARK'}</span></button>
      </header>

      <header className="modern-article-hero">
        <motion.div className="shell" initial={{ opacity: 0, y: 78, filter: 'blur(20px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: .98, ease: [0.22, 1, 0.36, 1] }}>
          <span className="article-breadcrumb">{article.tags.join(' / ')}</span>
          <h1>{article.title}</h1>
          <div className="article-meta"><span>发布于 {article.date}</span><span>{characters.toLocaleString()} 字</span><span>约 {minutes} 分钟</span></div>
        </motion.div>
      </header>

      <div className="modern-article-layout shell">
        <article ref={contentRef} className="modern-article-content" dangerouslySetInnerHTML={{ __html: article.content }} />
        <div className="modern-copyright"><span>作者</span><strong>Youngkx</strong><span>说明</span><code>原创内容，转载请注明出处</code></div>
      </div>

      <aside className={tocOpen ? 'modern-toc open' : 'modern-toc'}>
        <div><strong>文章目录</strong><small>{toc.length} 节</small></div>
        {toc.map((item) => <a className={item.level === 3 ? 'level-3' : ''} href={`#${item.id}`} key={item.id} onClick={() => setTocOpen(false)}>{item.text}</a>)}
      </aside>

      <div className="modern-article-tools">
        <a href="/#top" title="返回主页" aria-label="返回主页">⌂</a>
        <button className={tocOpen ? 'active' : ''} onClick={() => setTocOpen(!tocOpen)} title="文章目录" aria-label="文章目录">☷</button>
        <button onClick={copyLink} title="复制链接" aria-label="复制链接">{copied ? '✓' : '⧉'}</button>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="返回顶部" aria-label="返回顶部">↑</button>
      </div>

      <SiteFooter backHref="/articles/" backLabel="全部文章 ↗" />
    </main>
  );
}

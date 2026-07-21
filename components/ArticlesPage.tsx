'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { ArticleSummary } from '@/lib/articles';
import SiteFooter from './SiteFooter';

export default function ArticlesPage({ posts }: { posts: ArticleSummary[] }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('youngkx-theme');
    const initial = saved === 'light' || saved === 'dark' ? saved : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem('youngkx-theme', next);
  };

  return (
    <main className="articles-page">
      <header className="nav shell">
        <a className="brand" href="/#top"><img className="brand-avatar" src="/avatar.webp" alt="Youngkx 头像" /><span className="brand-name">Youngkx</span></a>
        <nav className="nav-links articles-nav" aria-label="主导航">
          <a href="/#top">首页</a><a href="/#posts">文章</a><a href="/categories/">分类</a>
        </nav>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="切换主题"><span className="theme-icon">{theme === 'dark' ? '☼' : '◐'}</span><span className="theme-label">{theme === 'dark' ? 'LIGHT' : 'DARK'}</span></button>
      </header>

      <section className="articles-hero shell">
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8 }}>
          <h1>所有文章</h1>
          <p>共 {posts.length} 篇文章</p>
        </motion.div>
        <motion.div className="articles-hero-number" initial={{ opacity: 0, scale: .85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }}>{String(posts.length).padStart(2, '0')}</motion.div>
      </section>

      <section className="article-directory shell">
        {posts.map((post, index) => (
          <motion.a href={post.href} className="directory-row" key={post.href} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6, delay: .12 + index * .07 }}>
            <span className="directory-number">{post.number}</span>
            <span className="directory-date">{post.dateLabel}</span>
            <span className="directory-copy"><strong>{post.title}</strong><small className="directory-mobile-date">发布于 {post.dateLabel}</small><small>{post.excerpt}</small></span>
            <span className="directory-tag">{post.tagLabel}</span>
            <i>↗</i>
          </motion.a>
        ))}
      </section>

      <SiteFooter backHref="/#top" backLabel="返回首页 ↗" />
    </main>
  );
}

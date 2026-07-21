'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { posts } from './HomePage';

export default function ArticlesPage() {
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
        <a className="brand" href="/#top"><span className="brand-mark">YK</span><span className="brand-name">Youngkx</span></a>
        <nav className="nav-links articles-nav" aria-label="主导航">
          <a href="/#top">首页</a><a href="/#posts">文章</a><a href="/#topics">分类</a>
        </nav>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="切换主题"><span className="theme-icon">{theme === 'dark' ? '☼' : '◐'}</span><span className="theme-label">{theme === 'dark' ? 'LIGHT' : 'DARK'}</span></button>
      </header>

      <section className="articles-hero shell">
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8 }}>
          <span className="eyebrow">YOUNGKX.CN / INDEX</span>
          <h1>所有文章</h1>
          <p>共 4 篇 · 更新于 2023 年 11 月</p>
        </motion.div>
        <motion.div className="articles-hero-number" initial={{ opacity: 0, scale: .85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }}>04</motion.div>
      </section>

      <section className="article-directory shell">
        <div className="directory-head"><span>INDEX</span><span>DATE</span><span>TITLE</span><span>TOPIC</span></div>
        {posts.map((post, index) => (
          <motion.a id={post.tag.includes('C') ? 'c' : post.tag === 'WEB' ? 'web' : index === 1 ? 'oi' : undefined} href={post.href} className="directory-row" key={post.href} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6, delay: .12 + index * .07 }}>
            <span className="directory-number">{post.number}</span>
            <span className="directory-date">{post.date}</span>
            <span className="directory-copy"><strong>{post.title}</strong><small>{post.excerpt}</small></span>
            <span className="directory-tag">{post.tag}</span>
            <i>↗</i>
          </motion.a>
        ))}
      </section>

      <footer className="footer shell"><span>© 2023 YOUNGKX.CN</span><span>4 POSTS</span><a href="/#top">返回首页 ↗</a></footer>
    </main>
  );
}

'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { CategorySummary } from '@/lib/articles';
import SiteFooter from './SiteFooter';

export default function CategoriesPage({ categories, articleCount }: { categories: CategorySummary[]; articleCount: number }) {
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
    <main className="categories-page">
      <header className="nav shell">
        <a className="brand" href="/#top"><img className="brand-avatar" src="/avatar.webp" alt="Youngkx 头像" /><span className="brand-name">Youngkx</span></a>
        <nav className="nav-links categories-nav"><a href="/#top">首页</a><a href="/articles/">文章</a><a href="/categories/">分类</a></nav>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="切换主题"><span className="theme-icon">{theme === 'dark' ? '☼' : '◐'}</span><span className="theme-label">{theme === 'dark' ? 'LIGHT' : 'DARK'}</span></button>
      </header>

      <section className="categories-hero shell">
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8 }}>
          <h1>文章分类</h1>
          <p>{categories.length} 个主题 · {articleCount} 篇文章</p>
        </motion.div>
      </section>

      <section className="category-directory shell">
        {categories.map((group, groupIndex) => (
          <motion.section className="category-group" id={group.id} key={group.id} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-70px' }} transition={{ duration: .65, delay: groupIndex * .05 }}>
            <header><span>{group.number}</span><div><h2>{group.title}</h2><p>{group.description}</p></div><b>{group.posts.length} 篇文章</b></header>
            <div className="category-posts">
              {group.posts.map((post) => <a href={post.href} key={`${group.id}-${post.href}`}><span>{post.dateLabel}</span><strong>{post.title}</strong><i>↗</i></a>)}
            </div>
          </motion.section>
        ))}
      </section>

      <SiteFooter backHref="/#top" backLabel="返回首页 ↗" />
    </main>
  );
}

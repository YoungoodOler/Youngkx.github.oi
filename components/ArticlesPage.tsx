'use client';

import { motion } from 'framer-motion';
import type { ArticleSummary } from '@/lib/articles';
import { useSiteExperience } from './SiteExperience';
import SiteFooter from './SiteFooter';

export default function ArticlesPage({ posts }: { posts: ArticleSummary[] }) {
  const { theme, toggleTheme } = useSiteExperience();

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
        <motion.div
          initial={{ opacity: 0, y: 72, filter: 'blur(18px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: .92, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1>所有文章</h1>
          <p>共 {posts.length} 篇文章</p>
        </motion.div>
        <motion.div className="articles-hero-number" initial={{ opacity: 0, scale: .82, y: 48, filter: 'blur(20px)' }} animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 1.08, delay: .08, ease: [0.22, 1, 0.36, 1] }}>{String(posts.length).padStart(2, '0')}</motion.div>
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

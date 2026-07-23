'use client';

import { motion } from 'framer-motion';
import type { CategorySummary } from '@/lib/articles';
import { useSiteExperience } from './SiteExperience';
import SiteFooter from './SiteFooter';

export default function CategoriesPage({ categories, articleCount }: { categories: CategorySummary[]; articleCount: number }) {
  const { theme, toggleTheme } = useSiteExperience();

  return (
    <main className="categories-page">
      <header className="nav shell">
        <a className="brand" href="/#top"><img className="brand-avatar" src="/avatar.webp" alt="Youngkx 头像" /><span className="brand-name">Youngkx</span></a>
        <nav className="nav-links categories-nav"><a href="/#top">首页</a><a href="/articles/">文章</a><a href="/categories/">分类</a></nav>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="切换主题"><span className="theme-icon">{theme === 'dark' ? '☼' : '◐'}</span><span className="theme-label">{theme === 'dark' ? 'LIGHT' : 'DARK'}</span></button>
      </header>

      <section className="categories-hero shell">
        <motion.div
          initial={{ opacity: 0, y: 72, filter: 'blur(18px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: .92, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1>文章分类</h1>
          <p>{categories.length} 个主题 · {articleCount} 篇文章</p>
        </motion.div>
      </section>

      <section className="category-directory shell">
        {categories.map((group, groupIndex) => (
          <motion.section className="category-group" id={group.id} key={group.id} initial={{ opacity: 0, y: 68, filter: 'blur(15px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ once: true, margin: '-70px' }} transition={{ duration: .82, delay: groupIndex * .05, ease: [0.22, 1, 0.36, 1] }}>
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

'use client';

import { m } from 'framer-motion';
import Link from 'next/link';
import type { ArticleSummary } from '@/lib/articles';
import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';

const MotionLink = m.create(Link);

export default function ArticlesPage({ posts }: { posts: ArticleSummary[] }) {
  return (
    <main className="articles-page">
      <SiteHeader navClassName="articles-nav" articleHref="/#posts" />

      <section className="articles-hero shell">
        <m.div
          initial={{ opacity: 0, y: 72, filter: 'blur(18px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.92, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1>所有文章</h1>
          <p>共 {posts.length} 篇文章</p>
        </m.div>
        <m.div
          className="articles-hero-number"
          initial={{ opacity: 0, scale: 0.82, y: 48, filter: 'blur(20px)' }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.08, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          {String(posts.length).padStart(2, '0')}
        </m.div>
      </section>

      <section className="article-directory shell">
        {posts.map((post, index) => (
          <MotionLink
            href={post.href}
            className="directory-row"
            key={post.href}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 + index * 0.07 }}
          >
            <span className="directory-number">{post.number}</span>
            <span className="directory-date">{post.dateLabel}</span>
            <span className="directory-copy">
              <strong>{post.title}</strong>
              <small className="directory-mobile-date">发布于 {post.dateLabel}</small>
              <small>{post.excerpt}</small>
            </span>
            <span className="directory-tag">{post.tagLabel}</span>
            <i>↗</i>
          </MotionLink>
        ))}
      </section>

      <SiteFooter backHref="/#top" backLabel="返回首页 ↗" />
    </main>
  );
}

import type { CSSProperties } from 'react';
import Link from 'next/link';
import type { ArticleSummary } from '@/lib/articles';
import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';

export default function ArticlesPage({ posts }: { posts: ArticleSummary[] }) {
  return (
    <main className="articles-page">
      <SiteHeader navClassName="articles-nav" articleHref="/#posts" resources />

      <section className="articles-hero shell">
        <div>
          <h1>All Articles</h1>
          <p>{posts.length} Entries In The Archive</p>
        </div>
        <div className="articles-hero-number">{String(posts.length).padStart(2, '0')}</div>
      </section>

      <section className="article-directory shell">
        {posts.map((post, index) => (
          <Link
            href={post.href}
            prefetch={false}
            className="directory-row"
            key={post.href}
            style={{ '--directory-delay': `${Math.min(index, 6) * 35}ms` } as CSSProperties}
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
          </Link>
        ))}
      </section>

      <SiteFooter backHref="/#top" backLabel="返回首页 ↗" />
    </main>
  );
}

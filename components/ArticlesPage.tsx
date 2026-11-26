import type { CSSProperties } from 'react';
import Link from 'next/link';
import type { ArticleSummary } from '@/lib/articles';
import SiteFooter from './SiteFooter';
import PageBackdrop from './PageBackdrop';
import SiteHeader from './SiteHeader';

export default function ArticlesPage({
  posts,
}: {
  posts: (ArticleSummary & { opening: string[] })[];
}) {
  return (
    <main className="articles-page">
      <PageBackdrop />
      <SiteHeader navClassName="articles-nav" resources />

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
            <div className="directory-heading">
              <h2 className="directory-title">{post.title}</h2>
              <span className="directory-tag">{post.tagLabel}</span>
            </div>
            <time className="directory-date" dateTime={post.date}>
              发布于 {post.dateLabel}
            </time>
            <div className="directory-opening">
              {post.opening.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex}>{paragraph}</p>
              ))}
            </div>
          </Link>
        ))}
      </section>

      <SiteFooter backHref="/#top" backLabel="返回首页 ↗" />
    </main>
  );
}

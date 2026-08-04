'use client';

import { m } from 'framer-motion';
import Link from 'next/link';
import type { CategorySummary } from '@/lib/articles';
import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';

export default function CategoriesPage({
  categories,
  articleCount,
}: {
  categories: CategorySummary[];
  articleCount: number;
}) {
  return (
    <main className="categories-page">
      <SiteHeader navClassName="categories-nav" />

      <section className="categories-hero shell">
        <m.div
          initial={{ opacity: 0, y: 72, filter: 'blur(18px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.92, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1>文章分类</h1>
          <p>
            {categories.length} 个主题 · {articleCount} 篇文章
          </p>
        </m.div>
      </section>

      <section className="category-directory shell">
        {categories.map((group, groupIndex) => (
          <m.section
            className="category-group"
            id={group.id}
            key={group.id}
            initial={{ opacity: 0, y: 68, filter: 'blur(15px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-70px' }}
            transition={{ duration: 0.82, delay: groupIndex * 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <header>
              <span>{group.number}</span>
              <div>
                <h2>{group.title}</h2>
                <p>{group.description}</p>
              </div>
              <b>{group.posts.length} 篇文章</b>
            </header>
            <div className="category-posts">
              {group.posts.map((post) => (
                <Link href={post.href} key={`${group.id}-${post.href}`}>
                  <span>{post.dateLabel}</span>
                  <strong>{post.title}</strong>
                  <i>↗</i>
                </Link>
              ))}
            </div>
          </m.section>
        ))}
      </section>

      <SiteFooter backHref="/#top" backLabel="返回首页 ↗" />
    </main>
  );
}

import type { Metadata } from 'next';
import HomePage from '@/components/HomePage';
import { articleSummaries, categorySummaries } from '@/lib/articles';
import { selectLatestArticle } from '@/lib/article-selection';
import { usefulLinkCount } from '@/lib/useful-links';
import './home.css';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function Page() {
  const latestPost = selectLatestArticle(articleSummaries);
  return (
    <HomePage
      featuredPosts={articleSummaries.slice(0, 3)}
      latestPost={latestPost && { href: latestPost.href, title: latestPost.title }}
      articleCount={articleSummaries.length}
      categories={categorySummaries.map(({ id, title, description, posts }) => ({
        id,
        title,
        description,
        posts: posts.map(({ href, title }) => ({ href, title })),
      }))}
      usefulLinkCount={usefulLinkCount}
    />
  );
}

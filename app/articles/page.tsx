import type { Metadata } from 'next';
import ArticlesPage from '@/components/ArticlesPage';
import { getArticleOpening } from '@/lib/article-opening';
import { articleSummaries, getArticleByPath } from '@/lib/articles';

export const metadata: Metadata = {
  title: 'All Articles | Youngkx',
  description: 'The complete Youngkx Blog archive.',
  alternates: { canonical: '/articles/' },
};

export default function Page() {
  const posts = articleSummaries.map((post) => {
    const article = getArticleByPath(post.href.split('/').filter(Boolean));
    const opening = getArticleOpening(article?.content ?? '');
    return { ...post, opening: opening.length ? opening : [post.excerpt] };
  });
  return <ArticlesPage posts={posts} />;
}

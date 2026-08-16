import type { Metadata } from 'next';
import ArticlesPage from '@/components/ArticlesPage';
import { articleSummaries } from '@/lib/articles';

export const metadata: Metadata = {
  title: 'All Articles | Youngkx',
  description: 'The complete Youngkx Blog archive.',
  alternates: { canonical: '/articles/' },
};

export default function Page() {
  return <ArticlesPage posts={articleSummaries} />;
}

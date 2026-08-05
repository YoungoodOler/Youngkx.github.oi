import type { Metadata } from 'next';
import ArticlesPage from '@/components/pages/ArticlesPage';
import { articleSummaries } from '@/lib/articles';

export const metadata: Metadata = {
  title: '所有文章 | Youngkx',
  description: 'Youngkx Blog 的全部文章。',
  alternates: { canonical: '/articles/' },
};

export default function Page() {
  return <ArticlesPage posts={articleSummaries} />;
}

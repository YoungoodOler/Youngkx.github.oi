import type { Metadata } from 'next';
import CategoriesPage from '@/components/CategoriesPage';
import { articleSummaries, categorySummaries } from '@/lib/articles';

export const metadata: Metadata = {
  title: 'Topics | Youngkx',
  description: 'Browse the Youngkx Blog archive by topic.',
  alternates: { canonical: '/categories/' },
};

export default function Page() {
  return <CategoriesPage categories={categorySummaries} articleCount={articleSummaries.length} />;
}

import CategoriesPage from '@/components/CategoriesPage';
import { articleSummaries, categorySummaries } from '@/lib/articles';

export const metadata = {
  title: '文章分类 | Youngkx',
  description: '按照标签浏览 Youngkx Blog 的文章。',
};

export default function Page() {
  return <CategoriesPage categories={categorySummaries} articleCount={articleSummaries.length} />;
}

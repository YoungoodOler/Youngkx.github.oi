import HomePage from '@/components/HomePage';
import { articleSummaries, categorySummaries } from '@/lib/articles';

export default function Page() {
  return <HomePage posts={articleSummaries} categories={categorySummaries} />;
}

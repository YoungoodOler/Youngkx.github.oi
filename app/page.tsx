import type { Metadata } from 'next';
import HomePage from '@/components/HomePage';
import { articleSummaries, categorySummaries } from '@/lib/articles';
import { usefulLinkCount } from '@/lib/useful-links';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function Page() {
  return (
    <HomePage
      posts={articleSummaries}
      categories={categorySummaries}
      usefulLinkCount={usefulLinkCount}
    />
  );
}

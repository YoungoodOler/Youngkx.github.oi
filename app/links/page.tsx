import type { Metadata } from 'next';
import LinksPage from '@/components/LinksPage';
import { usefulLinkGroups } from '@/lib/useful-links';

export const metadata: Metadata = {
  title: 'Useful Links | Youngkx',
  description: 'A personal directory of useful tools, references, and frequently visited links.',
  alternates: { canonical: '/links/' },
};

export default function Page() {
  return <LinksPage groups={usefulLinkGroups} />;
}

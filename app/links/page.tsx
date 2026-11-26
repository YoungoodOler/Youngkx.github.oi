import type { Metadata } from 'next';
import LinksPage from '@/components/LinksPage';
import { friendLinksPath, friendLinksTitle } from '@/lib/useful-links';
import '../[year]/[...slug]/article-interactions.css';
import './links.css';

export const metadata: Metadata = {
  title: `${friendLinksTitle} | Youngkx`,
  description: 'Youngkx 的友链、联系方式和留言板。',
  alternates: { canonical: friendLinksPath },
};

export default function Page() {
  return <LinksPage />;
}

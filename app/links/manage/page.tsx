import type { Metadata } from 'next';
import LinksManager from '@/components/LinksManager';

export const metadata: Metadata = {
  title: 'Link Manager | Youngkx',
  description: 'Private workspace for managing the Youngkx useful links directory.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <LinksManager />;
}

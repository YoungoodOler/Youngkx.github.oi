import type { Metadata } from 'next';
import LinksManager from '@/components/LinksManager';
import '../links.css';

export const metadata: Metadata = {
  title: '友链管理 | Youngkx',
  description: '站长可以在这里新增、编辑和发布友链。',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <LinksManager />;
}

import type { Metadata } from 'next';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: '404 | Youngkx',
};

export default function NotFound() {
  return (
    <main className="categories-page">
      <SiteHeader />
      <section className="categories-hero shell">
        <h1>404</h1>
        <p>页面未找到</p>
      </section>
      <SiteFooter backHref="/#top" backLabel="返回首页 ↗" />
    </main>
  );
}

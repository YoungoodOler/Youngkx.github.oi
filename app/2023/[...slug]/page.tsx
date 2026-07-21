import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArticleView from '@/components/ArticleView';
import articles from '@/content/articles.json';

type RouteProps = { params: Promise<{ slug: string[] }> };

function getArticle(slug: string[]) {
  const key = slug.map((segment) => {
    try { return decodeURIComponent(segment); } catch { return segment; }
  }).join('/').normalize('NFC');
  return articles.find((article) => article.key.normalize('NFC') === key);
}

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.key.split('/') }));
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const article = getArticle((await params).slug);
  if (!article) return {};
  return { title: `${article.title} | Youngkx`, description: article.excerpt };
}

export default async function Page({ params }: RouteProps) {
  const article = getArticle((await params).slug);
  if (!article) notFound();
  return <ArticleView article={article} />;
}

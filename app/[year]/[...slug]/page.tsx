import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArticleView from '@/components/pages/ArticleView';
import { articles, getArticleByPath } from '@/lib/articles';

type RouteProps = { params: Promise<{ year: string; slug: string[] }> };

function decodePath(year: string, slug: string[]) {
  return [year, ...slug].map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });
}

export function generateStaticParams() {
  return articles.map((article) => ({ year: article.path[0], slug: article.path.slice(1) }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { year, slug } = await params;
  const article = getArticleByPath(decodePath(year, slug));
  if (!article) return {};
  const canonical = `/${article.path.join('/')}/`;
  return {
    title: `${article.title} | Youngkx`,
    description: article.excerpt,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.excerpt,
      url: canonical,
      publishedTime: article.date,
      tags: article.tags,
    },
  };
}

export default async function Page({ params }: RouteProps) {
  const { year, slug } = await params;
  const article = getArticleByPath(decodePath(year, slug));
  if (!article) notFound();
  return <ArticleView article={article} />;
}

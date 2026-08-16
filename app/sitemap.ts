import type { MetadataRoute } from 'next';
import { articleSummaries } from '@/lib/articles';
import { absoluteUrl } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const latestUpdate = articleSummaries[0]?.date;
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: latestUpdate, changeFrequency: 'weekly', priority: 1 },
    {
      url: absoluteUrl('/articles/'),
      lastModified: latestUpdate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: absoluteUrl('/categories/'),
      lastModified: latestUpdate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: absoluteUrl('/links/'),
      lastModified: latestUpdate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  return [
    ...staticPages,
    ...articleSummaries.map((article) => ({
      url: absoluteUrl(article.href),
      lastModified: article.date,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}

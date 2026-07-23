import rawArticles from '@/content/articles.json';
import { cardTone, inferCardPreset, isCardPreset, type CardPreset } from './card-presets';
import { loadMarkdownArticles } from './markdown-articles';

export type ArticleRecord = {
  path: string[];
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
  content: string;
  card?: CardPreset;
};

export type ArticleSummary = {
  number: string;
  title: string;
  excerpt: string;
  date: string;
  dateLabel: string;
  tags: string[];
  tagLabel: string;
  href: string;
  tone: 'mint' | 'blue' | 'violet' | 'amber' | 'rose';
  card: CardPreset;
};

export type CategorySummary = {
  id: string;
  number: string;
  title: string;
  description: string;
  posts: ArticleSummary[];
};

const legacyArticles = (rawArticles as ArticleRecord[]).map((article) => {
  const card = typeof article.card === 'string' ? article.card.toLowerCase() : article.card;
  return { ...article, card: isCardPreset(card) ? card : undefined };
});
const articles: ArticleRecord[] = [...legacyArticles, ...loadMarkdownArticles()];

const categoryDetails: Record<string, { title: string; description: string; order: number }> = {
  OI: { title: 'OI', description: '信息学竞赛、算法学习与参赛记录', order: 0 },
  C: { title: 'C / C++', description: '语言基础、函数用法与代码笔记', order: 1 },
  WEB: { title: 'Web', description: '网络协议与 Web 基础知识', order: 2 },
  AI: { title: 'AI', description: '人工智能、模型应用与实践记录', order: 3 },
  VLOG: { title: 'Vlog', description: '生活影像、旅行与日常记录', order: 4 },
  闲谈: { title: '闲谈', description: '想法、随笔与生活片段', order: 5 },
};

function categoryId(tag: string) {
  const known = tag.toUpperCase();
  if (known === 'OI') return 'oi';
  if (known === 'C') return 'c';
  if (known === 'WEB') return 'web';
  if (known === 'AI') return 'ai';
  if (known === 'VLOG') return 'vlog';
  return `tag-${Array.from(tag.normalize('NFC')).map((character) => character.codePointAt(0)?.toString(16)).join('-')}`;
}

function validateArticles(records: ArticleRecord[]) {
  const paths = new Set<string>();
  for (const article of records) {
    if (!article.path?.length || !article.title || !article.date || !article.tags?.length || !article.content) {
      throw new Error(`文章数据不完整：${article.title || '未命名文章'}`);
    }
    const articlePath = article.path.join('/').normalize('NFC');
    if (paths.has(articlePath)) throw new Error(`文章路径重复：${articlePath}`);
    paths.add(articlePath);
  }
}

validateArticles(articles);

export const articleSummaries: ArticleSummary[] = [...articles]
  .sort((left, right) => right.date.localeCompare(left.date) || left.title.localeCompare(right.title, 'zh-CN'))
  .map((article, index) => {
    const card = article.card ?? inferCardPreset(article.tags, index);
    return {
      number: String(index + 1).padStart(2, '0'),
      title: article.title,
      excerpt: article.excerpt,
      date: article.date,
      dateLabel: article.date.replaceAll('-', '.'),
      tags: article.tags,
      tagLabel: article.tags.join(' / '),
      href: `/${article.path.join('/')}/`,
      tone: cardTone(card),
      card,
    };
  });

const tags = [...new Set(articleSummaries.flatMap((article) => article.tags))]
  .sort((left, right) => {
    const leftOrder = categoryDetails[left]?.order ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = categoryDetails[right]?.order ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.localeCompare(right, 'zh-CN');
  });

export const categorySummaries: CategorySummary[] = tags.map((tag, index) => ({
  id: categoryId(tag),
  number: String(index + 1).padStart(2, '0'),
  title: categoryDetails[tag]?.title ?? tag,
  description: categoryDetails[tag]?.description ?? `${tag} 相关文章`,
  posts: articleSummaries.filter((article) => article.tags.includes(tag)),
}));

export function getArticleByPath(articlePath: string[]) {
  const normalizedPath = articlePath.map((segment) => segment.normalize('NFC')).join('/');
  return articles.find((article) => article.path.map((segment) => segment.normalize('NFC')).join('/') === normalizedPath);
}

export { articles };

import rawArticles from '@/content/articles.json';

export type ArticleRecord = {
  path: string[];
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
  content: string;
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
  tone: 'mint' | 'blue' | 'violet';
  visual: 'terminal' | 'network' | 'timeline' | 'protocol';
};

export type CategorySummary = {
  id: string;
  number: string;
  title: string;
  description: string;
  posts: ArticleSummary[];
};

const articles = rawArticles as ArticleRecord[];

const categoryDetails: Record<string, { title: string; description: string; order: number }> = {
  OI: { title: 'OI', description: '信息学竞赛、算法学习与参赛记录', order: 0 },
  C: { title: 'C / C++', description: '语言基础、函数用法与代码笔记', order: 1 },
  WEB: { title: 'Web', description: '网络协议与 Web 基础知识', order: 2 },
};

function categoryId(tag: string) {
  const known = tag.toUpperCase();
  if (known === 'OI') return 'oi';
  if (known === 'C') return 'c';
  if (known === 'WEB') return 'web';
  return `tag-${Array.from(tag.normalize('NFC')).map((character) => character.codePointAt(0)?.toString(16)).join('-')}`;
}

function presentation(tags: string[], index: number): Pick<ArticleSummary, 'tone' | 'visual'> {
  if (tags.includes('C')) return { tone: 'mint', visual: 'terminal' };
  if (tags.includes('WEB')) return { tone: 'blue', visual: 'protocol' };
  if (tags.includes('OI')) return index % 2 === 0
    ? { tone: 'violet', visual: 'timeline' }
    : { tone: 'blue', visual: 'network' };
  return index % 2 === 0
    ? { tone: 'violet', visual: 'timeline' }
    : { tone: 'blue', visual: 'network' };
}

function validateArticles(records: ArticleRecord[]) {
  const paths = new Set<string>();
  for (const article of records) {
    if (!article.path?.length || !article.title || !article.date || !article.tags?.length || !article.content) {
      throw new Error(`文章数据不完整：${article.title || '未命名文章'}`);
    }
    const path = article.path.join('/').normalize('NFC');
    if (paths.has(path)) throw new Error(`文章路径重复：${path}`);
    paths.add(path);
  }
}

validateArticles(articles);

export const articleSummaries: ArticleSummary[] = [...articles]
  .sort((left, right) => right.date.localeCompare(left.date) || left.title.localeCompare(right.title, 'zh-CN'))
  .map((article, index) => ({
    number: String(index + 1).padStart(2, '0'),
    title: article.title,
    excerpt: article.excerpt,
    date: article.date,
    dateLabel: article.date.replaceAll('-', '.'),
    tags: article.tags,
    tagLabel: article.tags.join(' / '),
    href: `/${article.path.join('/')}/`,
    ...presentation(article.tags, index),
  }));

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

export function getArticleByPath(path: string[]) {
  const normalizedPath = path.map((segment) => segment.normalize('NFC')).join('/');
  return articles.find((article) => article.path.map((segment) => segment.normalize('NFC')).join('/') === normalizedPath);
}

export { articles };

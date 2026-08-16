import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { articles, articleSummaries, categorySummaries, getArticleByPath } from '@/lib/articles';
import { selectLatestArticle } from '@/lib/article-selection';
import { parseFrontMatter } from '@/lib/markdown-articles';
import { absoluteUrl } from '@/lib/site';

describe('Markdown front matter', () => {
  it('parses YAML metadata and preserves Markdown content', () => {
    const parsed = parseFrontMatter(
      '\uFEFF---\r\ntitle: "Example"\r\ndate: "2026-08-11"\r\ntags:\r\n  - Web\r\n---\r\n\r\n## Body\r\n',
      'example.md',
    );

    expect(parsed.data).toEqual({ title: 'Example', date: '2026-08-11', tags: ['Web'] });
    expect(parsed.content).toBe('\r\n## Body\r\n');
  });

  it('rejects unterminated YAML front matter', () => {
    expect(() => parseFrontMatter('---\ntitle: Example\n', 'example.md')).toThrow(
      'example.md 的 YAML front matter 缺少结束分隔线',
    );
  });
});

describe('article index', () => {
  it('keeps every route unique and resolvable', () => {
    const paths = articles.map((article) => article.path.join('/').normalize('NFC'));

    expect(new Set(paths).size).toBe(paths.length);
    for (const article of articles) {
      expect(getArticleByPath(article.path)).toBe(article);
    }
  });

  it('sorts summaries from newest to oldest', () => {
    const dates = articleSummaries.map((article) => article.date);
    const sortedDates = [...dates].sort((left, right) => right.localeCompare(left));

    expect(dates).toEqual(sortedDates);
  });

  it('selects the newest article for the lead card regardless of input order', () => {
    expect(selectLatestArticle([...articleSummaries].reverse())).toBe(articleSummaries[0]);
  });

  it('publishes the Markdown CodeX guide with generated heading anchors', () => {
    const guide = articles.find((article) => article.title === 'CodeX使用教程');

    expect(guide?.path).toEqual(['2026', '07', '26', 'how-to-use-codex']);
    expect(guide?.content).toContain('<h2 id="1-codex简介">');
  });

  it('only references known articles from categories', () => {
    const knownHrefs = new Set(articleSummaries.map((article) => article.href));

    for (const category of categorySummaries) {
      expect(category.posts.length).toBeGreaterThan(0);
      for (const post of category.posts) expect(knownHrefs.has(post.href)).toBe(true);
    }
  });

  it('publishes every article in the sitemap', () => {
    const urls = new Set(sitemap().map((entry) => entry.url));

    expect(urls).toContain('https://www.youngkx.cn/');
    for (const article of articleSummaries) {
      expect(urls).toContain(absoluteUrl(article.href));
    }
  });

  it('points robots.txt to the canonical sitemap', () => {
    expect(robots()).toMatchObject({
      sitemap: 'https://www.youngkx.cn/sitemap.xml',
      host: 'https://www.youngkx.cn',
    });
  });
});

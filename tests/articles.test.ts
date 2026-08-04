import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { articles, articleSummaries, categorySummaries, getArticleByPath } from '@/lib/articles';
import { absoluteUrl } from '@/lib/site';

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

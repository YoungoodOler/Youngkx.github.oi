import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { isCardPreset, type CardPreset } from './card-presets';

export type MarkdownArticleRecord = {
  path: string[];
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
  content: string;
  card?: CardPreset;
};

function normalizeDate(value: unknown, filename: string) {
  const date = value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${filename} 的 date 必须使用 YYYY-MM-DD 格式`);
  }
  return date;
}

function normalizeTags(value: unknown, filename: string) {
  const tags = Array.isArray(value)
    ? value.map(String)
    : typeof value === 'string' ? value.split(',') : [];
  const normalized = tags.map((tag) => tag.trim()).filter(Boolean);
  if (!normalized.length) throw new Error(`${filename} 至少需要一个 tag`);
  return normalized;
}

function normalizeSlug(value: unknown, fallback: string, filename: string) {
  const slug = String(value || fallback).trim().replace(/^\/+|\/+$/g, '');
  if (!slug || /[\\/?#]/.test(slug)) throw new Error(`${filename} 的 slug 不能包含 / \\ ? #`);
  return slug;
}

function headingText(html: string) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function addHeadingIds(html: string) {
  const used = new Map<string, number>();
  return html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_match, level: string, inner: string) => {
    const base = headingText(inner)
      .normalize('NFC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-') || 'section';
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    const id = count ? `${base}-${count + 1}` : base;
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
}

export function loadMarkdownArticles(): MarkdownArticleRecord[] {
  const directory = path.join(process.cwd(), 'content', 'posts');
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.md$/i.test(entry.name) && !entry.name.startsWith('_'))
    .flatMap((entry) => {
      const fullPath = path.join(directory, entry.name);
      const source = readFileSync(fullPath, 'utf8');
      const parsed = matter(source);
      if (parsed.data.draft === true) return [];

      const filename = `content/posts/${entry.name}`;
      const title = String(parsed.data.title ?? '').trim();
      const excerpt = String(parsed.data.excerpt ?? '').trim();
      if (!title) throw new Error(`${filename} 缺少 title`);
      if (!excerpt) throw new Error(`${filename} 缺少 excerpt`);
      if (!parsed.content.trim()) throw new Error(`${filename} 没有正文`);

      const date = normalizeDate(parsed.data.date, filename);
      const slug = normalizeSlug(parsed.data.slug, path.basename(entry.name, path.extname(entry.name)), filename);
      const cardValue = typeof parsed.data.card === 'string' ? parsed.data.card.toLowerCase() : parsed.data.card;
      if (cardValue !== undefined && !isCardPreset(cardValue)) {
        throw new Error(`${filename} 的 card 不受支持：${String(parsed.data.card)}`);
      }

      const rendered = marked.parse(parsed.content, { gfm: true, async: false });
      if (typeof rendered !== 'string') throw new Error(`${filename} 无法同步渲染`);

      return [{
        path: [...date.split('-'), slug],
        title,
        date,
        tags: normalizeTags(parsed.data.tags, filename),
        excerpt,
        content: addHeadingIds(rendered),
        card: cardValue as CardPreset | undefined,
      }];
    });
}

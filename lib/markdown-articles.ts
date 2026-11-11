import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { load as parseYaml } from 'js-yaml';
import hljs from 'highlight.js';
import { Marked, Renderer } from 'marked';
import markedKatex from 'marked-katex-extension';
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

type FrontMatterResult = {
  data: Record<string, unknown>;
  content: string;
};

const frontMatterPattern = /^---[^\S\r\n]*\r?\n([\s\S]*?)\r?\n---[^\S\r\n]*(?:\r?\n|$)/;

const markdown = new Marked({
  gfm: true,
  renderer: {
    code({ text, lang }) {
      const language = lang?.trim().split(/\s+/, 1)[0].toLowerCase();
      // Keep output samples and unknown languages as escaped plain text.
      if (
        !language ||
        /^(?:text|txt|plaintext|plain)$/.test(language) ||
        !hljs.getLanguage(language)
      )
        return false;

      const highlighted = hljs.highlight(text, { language, ignoreIllegals: true }).value;
      return `<pre><code class="hljs language-${language}">${highlighted}\n</code></pre>\n`;
    },
    table(token) {
      return `<div class="markdown-table">\n${Renderer.prototype.table.call(this, token)}</div>\n`;
    },
  },
});
markdown.use(markedKatex({ nonStandard: true, output: 'mathml', throwOnError: false }));

export function parseFrontMatter(source: string, filename = 'Markdown source'): FrontMatterResult {
  const normalizedSource = source.replace(/^\uFEFF/, '');
  if (!normalizedSource.startsWith('---')) return { data: {}, content: normalizedSource };

  const match = frontMatterPattern.exec(normalizedSource);
  if (!match) throw new Error(`${filename} 的 YAML front matter 缺少结束分隔线`);

  const parsed = parseYaml(match[1]);
  if (
    parsed !== undefined &&
    (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
  ) {
    throw new Error(`${filename} 的 YAML front matter 必须是键值对象`);
  }

  return {
    data: (parsed ?? {}) as Record<string, unknown>,
    content: normalizedSource.slice(match[0].length),
  };
}

function normalizeDate(value: unknown, filename: string) {
  const date =
    value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${filename} 的 date 必须使用 YYYY-MM-DD 格式`);
  }
  return date;
}

function normalizeTags(value: unknown, filename: string) {
  const tags = Array.isArray(value)
    ? value.map(String)
    : typeof value === 'string'
      ? value.split(',')
      : [];
  const normalized = tags.map((tag) => tag.trim()).filter(Boolean);
  if (!normalized.length) throw new Error(`${filename} 至少需要一个 tag`);
  return normalized;
}

function normalizeSlug(value: unknown, fallback: string, filename: string) {
  const slug = String(value || fallback)
    .trim()
    .replace(/^\/+|\/+$/g, '');
  if (!slug || /[\\/?#]/.test(slug)) throw new Error(`${filename} 的 slug 不能包含 / \\ ? #`);
  return slug;
}

function headingText(html: string) {
  return html
    .replace(/<annotation\b[^>]*>[\s\S]*?<\/annotation>|<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function addHeadingIds(html: string) {
  const used = new Set<string>();
  const counts = new Map<string, number>();
  return html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_match, level: string, inner: string) => {
    const base =
      headingText(inner)
        .normalize('NFC')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .trim()
        .replace(/\s+/g, '-') || 'section';
    let count = counts.get(base) ?? 1;
    let id = count === 1 ? base : `${base}-${count}`;
    while (used.has(id)) id = `${base}-${++count}`;
    counts.set(base, count);
    used.add(id);
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
}

export function renderMarkdown(source: string) {
  return addHeadingIds(markdown.parse(source, { async: false }));
}

export function loadMarkdownArticles(): MarkdownArticleRecord[] {
  const directory = path.join(process.cwd(), 'content', 'posts');
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.md$/i.test(entry.name) && !entry.name.startsWith('_'))
    .flatMap((entry) => {
      const fullPath = path.join(directory, entry.name);
      const source = readFileSync(fullPath, 'utf8');
      const parsed = parseFrontMatter(source, `content/posts/${entry.name}`);
      if (parsed.data.draft === true) return [];

      const filename = `content/posts/${entry.name}`;
      const title = String(parsed.data.title ?? '').trim();
      const excerpt = String(parsed.data.excerpt ?? '').trim();
      if (!title) throw new Error(`${filename} 缺少 title`);
      if (!excerpt) throw new Error(`${filename} 缺少 excerpt`);
      if (!parsed.content.trim()) throw new Error(`${filename} 没有正文`);

      const date = normalizeDate(parsed.data.date, filename);
      const slug = normalizeSlug(
        parsed.data.slug,
        path.basename(entry.name, path.extname(entry.name)),
        filename,
      );
      const cardValue =
        typeof parsed.data.card === 'string' ? parsed.data.card.toLowerCase() : parsed.data.card;
      if (cardValue !== undefined && !isCardPreset(cardValue)) {
        throw new Error(`${filename} 的 card 不受支持：${String(parsed.data.card)}`);
      }

      const rendered = renderMarkdown(parsed.content);

      return [
        {
          path: [...date.split('-'), slug],
          title,
          date,
          tags: normalizeTags(parsed.data.tags, filename),
          excerpt,
          content: rendered,
          card: cardValue as CardPreset | undefined,
        },
      ];
    });
}

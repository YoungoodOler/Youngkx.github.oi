import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { getArticleOpening } from '@/lib/article-opening';
import { articles, articleSummaries, categorySummaries, getArticleByPath } from '@/lib/articles';
import { selectLatestArticle } from '@/lib/article-selection';
import { parseFrontMatter, renderMarkdown } from '@/lib/markdown-articles';
import { absoluteUrl } from '@/lib/site';
import { getTagTitle, normalizeTag } from '@/lib/tag-titles';

describe('Markdown front matter', () => {
  it('keeps heading anchors unique when repeated titles collide with numbered titles', () => {
    const html = renderMarkdown('## Example\n## Example\n## Example-2\n## Example\n## Example-2');
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
    expect(ids).toEqual(['example', 'example-2', 'example-2-2', 'example-3', 'example-2-3']);
    expect(new Set(ids).size).toBe(ids.length);
  });

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

describe('Markdown math', () => {
  it('renders escaped \\\\( \\\\) and \\\\[ \\\\] TeX and strips Markdown escapes inside it', () => {
    const html = renderMarkdown(
      String.raw`退化到 \\(O(n^2)\\)。` + '\n\n' + String.raw`\\[ X\_{n+1}=x\\%m \\]`,
    );

    expect(html).not.toContain('katex-error');
    expect(html).not.toContain('\\(');
    expect(html).toContain('<annotation encoding="application/x-tex">O(n^2)</annotation>');
    expect(html).toContain('<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">');
    expect(html).toContain('<annotation encoding="application/x-tex">X_{n+1}=x\\%m</annotation>');
  });

  it('leaves escaped TeX delimiters inside code untouched', () => {
    const html = renderMarkdown('`\\\\(x\\\\)`');
    expect(html).toBe('<p><code>\\\\(x\\\\)</code></p>\n');
  });
});

describe('Markdown code highlighting', () => {
  it.each(['cpp', 'C++', 'c', 'python', 'js', 'ts'])(
    'highlights fenced %s code during Markdown rendering',
    (language) => {
      const source = language === 'python' ? 'if True:\n    return 42' : 'if (true) return 42;';
      const html = renderMarkdown(`\`\`\`${language}\n${source}\n\`\`\``);

      expect(html).toContain('class="hljs language-');
      expect(html).toContain('class="hljs-keyword"');
      expect(html).toContain('class="hljs-number"');
    },
  );

  it.each(['text', 'plaintext', 'unknown-language', ''])(
    'keeps %s output samples escaped and unhighlighted',
    (language) => {
      const html = renderMarkdown(`\`\`\`${language}\n<script>alert("x")</script> & 42\n\`\`\``);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&amp;');
      expect(html).not.toContain('<span');
    },
  );

  it('escapes HTML inside highlighted code without changing the source text', () => {
    const html = renderMarkdown('```cpp title="example"\nstd::cout << "<script>&";\n```');

    expect(html).toContain('class="hljs language-cpp"');
    expect(html).toContain('&lt;script&gt;&amp;');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('title="example"');
  });

  it('publishes highlighted code in both the greedy and sort Markdown articles', () => {
    for (const slug of ['greedy-algorithm', 'cpp-sort-tutorial']) {
      const article = articles.find((entry) => entry.path.at(-1) === slug);
      expect(article?.content).toContain('class="hljs language-cpp"');
      expect(article?.content).toContain('class="hljs-keyword"');
    }
  });
});

describe('Markdown math and tables', () => {
  it('renders inline and display LaTeX as MathML', () => {
    const html = renderMarkdown('## 求解 $x^2$\n\n若$x>0$，则\n\n$$\n\\frac{x}{2}\n$$\n');

    expect(html).toContain('<h2 id="求解-x2">');
    expect(html).toContain('若<span class="katex"><math');
    expect(html).toContain('<mo>&gt;</mo>');
    expect(html).toContain('display="block"');
    expect(html).toContain('<mfrac><mi>x</mi><mn>2</mn></mfrac>');
  });

  it('keeps dollar delimiters literal in code and after a backslash', () => {
    const html = renderMarkdown('`$x$` 和 \\$5、\\$10\n\n```text\n$$\nx^2\n$$\n```');

    expect(html).toContain('<code>$x$</code> 和 $5、$10');
    expect(html).toContain('<pre><code class="language-text">$$\nx^2\n$$');
    expect(html).not.toContain('<math');
  });

  it('falls back to the source of invalid LaTeX', () => {
    const html = renderMarkdown('公式 $\\frac{1$ 后面的内容');

    expect(html).toContain('class="katex-error"');
    expect(html).toContain('>\\frac{1</span> 后面的内容');
  });

  it('wraps a GFM table for scrolling and renders math in its cells', () => {
    const html = renderMarkdown('| 公式 | 说明 |\n| ---: | :--- |\n| $x^2$ | 平方 |');

    expect(html).toContain('<div class="markdown-table">\n<table>');
    expect(html).toContain('>公式</th>');
    expect(html).toMatch(/<td[^>]*><span class="katex"><math/);
    expect(html).toContain('</table>\n</div>');
  });
});

describe('article index', () => {
  it('takes readable opening paragraphs from Markdown and legacy HTML', () => {
    const markdown = renderMarkdown(
      '# 标题\n\n![封面](cover.webp)\n\n[目录 →](/contents/)\n\n**正文**开头。\n\n第二段。\n\n## 小节\n\n- 列表条目。',
    );

    expect(getArticleOpening(markdown)).toEqual(['正文开头。', '第二段。', '列表条目。']);
    expect(
      getArticleOpening('<h2>标题</h2><div><p>TCP&#x2F;IP<br> &amp; <code>C++</code></p></div>'),
    ).toEqual(['TCP/IP & C++']);
    expect(getArticleOpening('<pre><p>示例</p></pre><p><img src="cover.webp"></p>')).toEqual([]);
  });

  it('keeps a longer opening across blocks and trims it by character', () => {
    const first = '正文。'.repeat(200);
    const second = '𠮷'.repeat(60);

    expect(getArticleOpening(`<p>${first}</p><p>${second}</p>`)).toEqual([
      first,
      `${'𠮷'.repeat(50)}…`,
    ]);
  });

  it('groups C/C++ tag aliases under the existing category and display name', () => {
    for (const tag of ['C', 'C++', 'C/C++', 'C / C++', ' c / c++ ']) {
      expect(normalizeTag(tag)).toBe('C');
      expect(getTagTitle(tag)).toBe('C / C++');
    }
    expect(normalizeTag('C#')).toBe('C#');
    for (const tag of ['cs', 'talk', 'WEB', '闲谈']) {
      expect(normalizeTag(tag)).toBe(tag);
    }

    const categories = categorySummaries.filter((category) => category.title === 'C / C++');
    expect(categories).toHaveLength(1);
    expect(categories[0].id).toBe('c');
    expect(categories[0].posts.map((post) => post.href).sort()).toEqual([
      '/2023/11/05/printf用法详解/',
      '/2026/10/08/cpp-stl/',
      '/2026/11/02/cpp-sort-tutorial/',
      '/2026/11/03/greedy-algorithm/',
      '/2026/11/19/cpp-randomization/',
      '/2026/11/25/algorithm-competition-data-structure/',
    ]);
  });

  it('keeps every route unique and resolvable', () => {
    const paths = articles.map((article) => article.path.join('/').normalize('NFC'));

    expect(new Set(paths).size).toBe(paths.length);
    for (const article of articles) {
      expect(getArticleByPath(article.path)).toBe(article);
    }
  });

  it('serves every data structure chapter without putting it in article listings', () => {
    const overviewPath = ['2026', '11', '25', 'algorithm-competition-data-structure'];
    const overviewHref = `/${overviewPath.join('/')}/`;
    const overview = getArticleByPath(overviewPath);
    expect(overview).toBeDefined();
    expect(articleSummaries.some((article) => article.href === overviewHref)).toBe(true);

    const chapters = articles.filter(
      (article) => article.parentPath?.join('/') === overviewPath.join('/'),
    );
    expect(chapters).toHaveLength(14);

    const summaries = new Set(articleSummaries.map((article) => article.href));
    const categoryHrefs = new Set(
      categorySummaries.flatMap((category) => category.posts.map((post) => post.href)),
    );
    const sitemapUrls = new Set(sitemap().map((entry) => entry.url));

    for (const chapter of chapters) {
      const href = `/${chapter.path.join('/')}/`;
      expect(getArticleByPath(chapter.path)).toBe(chapter);
      expect(chapter.path.slice(0, -1)).toEqual(overviewPath);
      expect(chapter.content).toContain('href="../"');
      expect(overview?.content).toContain(`class="ds-map-link" href="${href}"`);
      expect(overview?.content).toContain(`<p><a href="${href}">`);
      expect(summaries.has(href)).toBe(false);
      expect(categoryHrefs.has(href)).toBe(false);
      expect(sitemapUrls.has(absoluteUrl(href))).toBe(false);
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

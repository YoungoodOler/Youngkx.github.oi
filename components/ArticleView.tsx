'use client';

import { motion, useScroll, useSpring } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ArticleRecord } from '@/lib/articles';
import { useSiteExperience } from './SiteExperience';
import SiteFooter from './SiteFooter';

type TocItem = { id: string; text: string; level: number };

const languageNames: Record<string, string> = {
  bash: 'Shell',
  c: 'C',
  'c++': 'C++',
  cpp: 'C++',
  csharp: 'C#',
  cs: 'C#',
  css: 'CSS',
  go: 'Go',
  html: 'HTML',
  http: 'HTTP',
  java: 'Java',
  javascript: 'JavaScript',
  js: 'JavaScript',
  json: 'JSON',
  jsx: 'JSX',
  markdown: 'Markdown',
  md: 'Markdown',
  plaintext: 'Plain text',
  powershell: 'PowerShell',
  ps1: 'PowerShell',
  py: 'Python',
  python: 'Python',
  rust: 'Rust',
  scss: 'SCSS',
  sh: 'Shell',
  shell: 'Shell',
  sql: 'SQL',
  text: 'Plain text',
  ts: 'TypeScript',
  tsx: 'TSX',
  typescript: 'TypeScript',
  xml: 'XML',
  yaml: 'YAML',
  yml: 'YAML',
};

function displayLanguage(token: string) {
  const normalized = token.trim().toLowerCase();
  return languageNames[normalized]
    ?? normalized.split(/[-_]/).filter(Boolean).map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ')
    ?? 'Plain text';
}

function detectLanguage(container: HTMLElement, codeElement: HTMLElement, code: string) {
  const classTokens = [codeElement, codeElement.parentElement, container]
    .flatMap((element) => element ? [...element.classList] : []);

  for (const token of classTokens) {
    const declared = token.match(/^(?:language|lang)-(.+)$/i)?.[1];
    if (declared) return displayLanguage(declared);
    if (languageNames[token.toLowerCase()]) return displayLanguage(token);
  }

  const source = code.trim();
  if (!source) return 'Plain text';
  if (/^[\[{]/.test(source)) {
    try {
      JSON.parse(source);
      return 'JSON';
    } catch {
      // Continue with syntax heuristics when the fragment is not complete JSON.
    }
  }
  if (/^(?:GET|POST|PUT|PATCH|DELETE|HEAD)\s+\S+\s+HTTP\/\d|^HTTP\/\d\.\d\s+\d{3}/m.test(source)) return 'HTTP';
  if (/<(?:!doctype|html|head|body|main|section|div|span|a|p|script|style)\b/i.test(source)) return 'HTML';
  if (/(?:^|\n)\s*#include\b|\bstd::|\bcout\s*<<|\bcin\s*>>|\bint\s+main\s*\(|\b(?:printf|scanf)\s*\(/.test(source)) return /\bstd::|\biostream\b|\bcout\b|\bcin\b|\btemplate\s*</.test(source) ? 'C++' : 'C';
  if (/\b(?:using\s+System|Console\.WriteLine|namespace\s+\w+\s*\{)\b/.test(source)) return 'C#';
  if (/\b(?:interface|type)\s+\w+|:\s*(?:string|number|boolean)\b|\bas const\b/.test(source)) return 'TypeScript';
  if (/\b(?:const|let|var)\s+\w+|=>|console\.(?:log|error|warn)\b|\bfunction\s+\w+\s*\(/.test(source)) return 'JavaScript';
  if (/(?:^|\n)\s*(?:def\s+\w+|from\s+\S+\s+import|import\s+\S+|print\s*\()/m.test(source)) return 'Python';
  if (/\b(?:fn\s+\w+|let\s+mut|println!|impl\s+\w+)\b/.test(source)) return 'Rust';
  if (/\b(?:package\s+main|func\s+\w+\s*\(|fmt\.Print)\b/.test(source)) return 'Go';
  if (/\b(?:public\s+static\s+void\s+main|System\.out\.println)\b/.test(source)) return 'Java';
  if (/\b(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b[\s\S]*\b(?:FROM|VALUES|SET|WHERE)\b/i.test(source)) return 'SQL';
  if (/(?:^|\n)\s*(?:Get-|Set-|Write-Host|\$\w+\s*=)/m.test(source)) return 'PowerShell';
  if (/(?:^|\n)\s*(?:npm|npx|pnpm|yarn|git|curl|wget|cd|mkdir)\b/m.test(source)) return 'Shell';
  if (/(?:^|\n)\s*(?:[.#][\w-]+|@media|[a-z][\w-]*)[^{]*\{[\s\S]*[\w-]+\s*:/i.test(source)) return 'CSS';
  if (/^(?:---\s*\n)?(?:[\w-]+:\s*.+\n){2,}/m.test(source)) return 'YAML';
  if (/^(?:#{1,6}\s+\S|[-*+]\s+\S|\d+\.\s+\S)/m.test(source)) return 'Markdown';
  return 'Plain text';
}

function readCode(element: HTMLElement) {
  return (element.innerText || element.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\n+$/, '');
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    if (!copied) throw new Error('copy failed');
  }
}

export default function ArticleView({ article }: { article: ArticleRecord }) {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });
  const contentRef = useRef<HTMLElement>(null);
  const { theme, toggleTheme } = useSiteExperience();
  const [toc, setToc] = useState<TocItem[]>([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const articleMarkup = useMemo(() => ({ __html: article.content }), [article.content]);
  const characters = useMemo(() => article.content.replace(/<[^>]+>/g, '').replace(/\s+/g, '').length, [article.content]);
  const minutes = Math.max(1, Math.ceil(characters / 500));

  useEffect(() => {
    const headings = [...(contentRef.current?.querySelectorAll('h2, h3') ?? [])];
    setToc(headings.map((heading) => ({ id: heading.id, text: heading.textContent ?? '', level: heading.tagName === 'H3' ? 3 : 2 })));
  }, [article.content]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;

    const cleanup: Array<() => void> = [];

    const frame = window.requestAnimationFrame(() => {
      const legacyBlocks = [...root.querySelectorAll<HTMLElement>('figure.highlight')];
      const modernBlocks = [...root.querySelectorAll<HTMLPreElement>('pre')]
        .filter((pre) => !pre.closest('figure.highlight'));

      const enhance = (
        container: HTMLElement,
        codeElement: HTMLElement,
        pre: HTMLPreElement,
        wrapped: boolean,
      ) => {
        const code = readCode(codeElement);
        const language = detectLanguage(container, codeElement, code);
        const toolbar = document.createElement('div');
        const dots = document.createElement('span');
        const languageLabel = document.createElement('span');
        const copyButton = document.createElement('button');
        let feedbackTimer = 0;

        toolbar.className = 'code-toolbar';
        dots.className = 'code-window-dots';
        dots.setAttribute('aria-hidden', 'true');
        dots.append(document.createElement('i'), document.createElement('i'), document.createElement('i'));
        languageLabel.className = 'code-language';
        languageLabel.textContent = language;
        copyButton.className = 'code-copy';
        copyButton.type = 'button';
        copyButton.textContent = '⧉ 复制';
        copyButton.setAttribute('aria-label', `复制${language}代码`);
        copyButton.setAttribute('aria-live', 'polite');

        const handleCopy = async () => {
          window.clearTimeout(feedbackTimer);
          try {
            await copyText(code);
            copyButton.textContent = '✓ 已复制';
            copyButton.classList.add('copied');
          } catch {
            copyButton.textContent = '复制失败';
          }
          feedbackTimer = window.setTimeout(() => {
            copyButton.textContent = '⧉ 复制';
            copyButton.classList.remove('copied');
          }, 1400);
        };

        copyButton.addEventListener('click', handleCopy);
        toolbar.append(dots, languageLabel, copyButton);
        container.dataset.language = language;
        container.classList.add('code-enhanced');
        container.prepend(toolbar);

        cleanup.push(() => {
          window.clearTimeout(feedbackTimer);
          copyButton.removeEventListener('click', handleCopy);
          toolbar.remove();
          container.classList.remove('code-enhanced');
          delete container.dataset.language;
          if (wrapped) {
            container.before(pre);
            container.remove();
          }
        });
      };

      legacyBlocks.forEach((figure) => {
        const codePre = figure.querySelector<HTMLPreElement>('.code pre')
          ?? [...figure.querySelectorAll<HTMLPreElement>('pre')].at(-1);
        if (codePre) enhance(figure, codePre, codePre, false);
      });

      modernBlocks.forEach((pre) => {
        const codeElement = pre.querySelector<HTMLElement>('code') ?? pre;
        const wrapper = document.createElement('figure');
        wrapper.className = 'code-block-shell';
        pre.before(wrapper);
        wrapper.append(pre);
        enhance(wrapper, codeElement, pre, true);
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      cleanup.reverse().forEach((dispose) => dispose());
    };
  }, [article.content]);

  const copyLink = async () => {
    const link = window.location.href;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const input = document.createElement('textarea');
      input.value = link;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <main className="modern-article-page">
      <motion.div className="progress" style={{ scaleX: progress }} />
      <header className="nav shell">
        <a className="brand" href="/#top"><img className="brand-avatar" src="/avatar.webp" alt="Youngkx 头像" /><span className="brand-name">Youngkx</span></a>
        <nav className="nav-links article-nav-links"><a href="/#top">首页</a><a href="/articles/">文章</a><a href="/categories/">分类</a></nav>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="切换主题"><span className="theme-icon">{theme === 'dark' ? '☼' : '◐'}</span><span className="theme-label">{theme === 'dark' ? 'LIGHT' : 'DARK'}</span></button>
      </header>

      <header className="modern-article-hero">
        <motion.div className="shell" initial={{ opacity: 0, y: 78, filter: 'blur(20px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: .98, ease: [0.22, 1, 0.36, 1] }}>
          <span className="article-breadcrumb">{article.tags.join(' / ')}</span>
          <h1>{article.title}</h1>
          <div className="article-meta"><span>发布于 {article.date}</span><span>{characters.toLocaleString()} 字</span><span>约 {minutes} 分钟</span></div>
        </motion.div>
      </header>

      <div className="modern-article-layout shell">
        <article ref={contentRef} className="modern-article-content" dangerouslySetInnerHTML={articleMarkup} />
        <div className="modern-copyright"><span>作者</span><strong>Youngkx</strong><span>说明</span><code>原创内容，转载请注明出处</code></div>
      </div>

      <aside className={tocOpen ? 'modern-toc open' : 'modern-toc'}>
        <div><strong>文章目录</strong><small>{toc.length} 节</small></div>
        {toc.map((item) => <a className={item.level === 3 ? 'level-3' : ''} href={`#${item.id}`} key={item.id} onClick={() => setTocOpen(false)}>{item.text}</a>)}
      </aside>

      <div className="modern-article-tools">
        <a href="/#top" title="返回主页" aria-label="返回主页">⌂</a>
        <button className={tocOpen ? 'active' : ''} onClick={() => setTocOpen(!tocOpen)} title="文章目录" aria-label="文章目录">☷</button>
        <button onClick={copyLink} title="复制链接" aria-label="复制链接">{copied ? '✓' : '⧉'}</button>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="返回顶部" aria-label="返回顶部">↑</button>
      </div>

      <SiteFooter backHref="/articles/" backLabel="全部文章 ↗" />
    </main>
  );
}

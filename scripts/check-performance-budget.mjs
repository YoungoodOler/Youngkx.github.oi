import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { brotliCompressSync } from 'node:zlib';

const outputDirectory = path.resolve('out');
const simpleComputerDemo = path.join('demos', 'simple-computer', 'index.html');
const limits = {
  routeJavaScriptRaw: 640 * 1024,
  routeJavaScriptBrotli: 180 * 1024,
  cssRaw: 64 * 1024,
  cssBrotli: 16 * 1024,
  fonts: 64 * 1024,
  chineseCssRaw: 192 * 1024,
  chineseCssBrotli: 40 * 1024,
  chineseFonts: 11 * 1024 * 1024,
};

if (!existsSync(outputDirectory)) {
  throw new Error('缺少 out/，请先运行 npm run build');
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function assetPath(url) {
  const pathname = decodeURIComponent(url.split('?')[0]);
  return path.join(outputDirectory, ...pathname.replace(/^\/+/, '').split('/'));
}

// Shared chunks and styles are referenced by many routes. Compress each file once.
// This cache lives only for this CLI invocation, so each build is checked afresh.
const assetSizes = new Map();
function assetSize(filePath) {
  let bytes = assetSizes.get(filePath);
  if (!bytes) {
    const buffer = readFileSync(filePath);
    bytes = { raw: buffer.byteLength, brotli: brotliCompressSync(buffer).byteLength };
    assetSizes.set(filePath, bytes);
  }
  return bytes;
}

// Keep the existing page budgets and measure on-demand CJK assets separately.
const chineseFace =
  /@font-face\s*\{(?=[^}]*font-family:\s*["']?Noto (?:Sans|Serif) SC["']?\s*[;}])[^}]*\}/gi;
const chineseFontFiles = new Set();
const stylesheetSizes = new Map();
function stylesheetSize(filePath) {
  let bytes = stylesheetSizes.get(filePath);
  if (!bytes) {
    const source = readFileSync(filePath, 'utf8');
    const chineseRules = [...source.matchAll(chineseFace)].map(([rule]) => rule);
    for (const rule of chineseRules) {
      const font = /url\(["']?([^"')]+\.woff2)["']?\)/.exec(rule)?.[1];
      if (font) chineseFontFiles.add(assetPath(font));
    }
    const otherStyles = source.replace(chineseFace, '');
    const chineseStyles = chineseRules.join('');
    bytes = {
      raw: Buffer.byteLength(otherStyles),
      brotli: otherStyles ? brotliCompressSync(otherStyles).length : 0,
      chineseRaw: Buffer.byteLength(chineseStyles),
      chineseBrotli: chineseStyles ? brotliCompressSync(chineseStyles).length : 0,
    };
    stylesheetSizes.set(filePath, bytes);
  }
  return bytes;
}

function routeAssetSize(relativeHtmlPath, kind = 'script') {
  const htmlPath = path.join(outputDirectory, relativeHtmlPath);
  const html = readFileSync(htmlPath, 'utf8');
  const sources =
    kind === 'script'
      ? new Set(
          [...html.matchAll(/<script[^>]+src=["']([^"']+\.js(?:\?[^"']*)?)["']/g)].map(
            (match) => match[1],
          ),
        )
      : new Set(
          [...html.matchAll(/<link\b[^>]*>/g)]
            .map((match) => match[0])
            .filter((tag) => /rel=["']stylesheet["']/.test(tag))
            .map((tag) => /href=["']([^"']+)["']/.exec(tag)?.[1])
            .filter(Boolean),
        );
  const inlineStyles =
    kind === 'style' && relativeHtmlPath === simpleComputerDemo
      ? [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join('\n')
      : '';
  if (!sources.size && !inlineStyles) {
    throw new Error(`${relativeHtmlPath} 没有找到${kind === 'style' ? '样式表' : '客户端脚本'}`);
  }
  const inlineBytes = Buffer.from(inlineStyles);
  return [...sources].reduce(
    (total, source) => {
      const filePath = assetPath(source);
      if (!existsSync(filePath))
        throw new Error(`${relativeHtmlPath} 引用了不存在的脚本：${source}`);
      const bytes = kind === 'style' ? stylesheetSize(filePath) : assetSize(filePath);
      total.raw += bytes.raw;
      total.brotli += bytes.brotli;
      total.chineseRaw += bytes.chineseRaw ?? 0;
      total.chineseBrotli += bytes.chineseBrotli ?? 0;
      return total;
    },
    {
      raw: inlineBytes.length,
      brotli: inlineBytes.length ? brotliCompressSync(inlineBytes).length : 0,
      chineseRaw: 0,
      chineseBrotli: 0,
    },
  );
}

const files = walk(outputDirectory);
const cssFiles = files.filter((file) => file.endsWith('.css'));
const fontFiles = files.filter((file) => /\.(?:woff2?|ttf|otf)$/i.test(file));
const textFiles = files.filter((file) => /\.(?:css|html|js|txt|xml)$/i.test(file));
const cssRaw = cssFiles.reduce((total, file) => total + statSync(file).size, 0);
const cssBrotli = cssFiles.reduce((total, file) => total + assetSize(file).brotli, 0);
cssFiles.forEach(stylesheetSize);
const fonts = fontFiles
  .filter((file) => !chineseFontFiles.has(file))
  .reduce((total, file) => total + statSync(file).size, 0);
const chineseFonts = [...chineseFontFiles].reduce((total, file) => total + statSync(file).size, 0);
const routes = [
  ['首页', 'index.html'],
  ['文章列表', path.join('articles', 'index.html')],
  ['分类列表', path.join('categories', 'index.html')],
  ['文章详情', path.join('2026', '07', '26', 'how-to-use-codex', 'index.html')],
  ['文件仓库', path.join('repo', 'index.html')],
  ['仓库管理', path.join('repo', 'manage', 'index.html')],
];
const failures = [];

for (const [label, relativePath] of routes) {
  const bytes = routeAssetSize(relativePath);
  console.log(
    `${label}初始脚本：${formatBytes(bytes.raw)} raw，${formatBytes(bytes.brotli)} Brotli`,
  );
  if (bytes.raw > limits.routeJavaScriptRaw) failures.push(`${label}初始脚本原始体积超过预算`);
  if (bytes.brotli > limits.routeJavaScriptBrotli) {
    failures.push(`${label}初始脚本 Brotli 体积超过预算`);
  }
  const css = routeAssetSize(relativePath, 'style');
  console.log(`${label} CSS：${formatBytes(css.raw)} raw，${formatBytes(css.brotli)} Brotli`);
}

console.log(`全部路由 CSS 资源：${formatBytes(cssRaw)} raw，${formatBytes(cssBrotli)} Brotli`);
console.log(`其他字体：${formatBytes(fonts)}`);
console.log(`按需加载的中文字体：${chineseFontFiles.size} 个子集，${formatBytes(chineseFonts)}`);

// Route-specific styles are independent downloads. Enforce the original CSS
// limits on every exported page, including pages outside the script sample.
for (const file of files.filter((file) => file.endsWith('.html'))) {
  const relativePath = path.relative(outputDirectory, file);
  const css = routeAssetSize(relativePath, 'style');
  if (css.raw > limits.cssRaw) failures.push(`${relativePath} CSS 原始体积超过预算`);
  if (css.brotli > limits.cssBrotli) failures.push(`${relativePath} CSS Brotli 体积超过预算`);
  if (css.chineseRaw > limits.chineseCssRaw || css.chineseBrotli > limits.chineseCssBrotli) {
    failures.push(`${relativePath} 中文字体 CSS 体积超过预算`);
  }
  const html = readFileSync(file, 'utf8');
  for (const [tag] of html.matchAll(/<link\b[^>]*>/g)) {
    if (!/\brel=["']preload["']/.test(tag) || !/\bas=["']font["']/.test(tag)) continue;
    const href = /\bhref=["']([^"']+)["']/.exec(tag)?.[1];
    if (href && chineseFontFiles.has(assetPath(href))) {
      failures.push(`${relativePath} 预加载了按需分发的中文字体`);
    }
  }
}
if (fonts > limits.fonts) failures.push('其他字体总体积超过预算');
if (chineseFonts > limits.chineseFonts) failures.push('中文字体总体积超过预算');

const remoteFontReference = textFiles.find((file) => {
  const source = readFileSync(file, 'utf8');
  return /fonts\.(?:googleapis|gstatic)\.com/i.test(source);
});
if (remoteFontReference) {
  failures.push(
    `构建结果重新引用了远程字体：${path.relative(outputDirectory, remoteFontReference)}`,
  );
}

if (failures.length) {
  console.error('\n性能预算失败：');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('性能预算通过。');
}

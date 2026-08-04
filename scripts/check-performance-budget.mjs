import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { brotliCompressSync } from 'node:zlib';

const outputDirectory = path.resolve('out');
const limits = {
  routeJavaScriptRaw: 640 * 1024,
  routeJavaScriptBrotli: 180 * 1024,
  cssRaw: 64 * 1024,
  cssBrotli: 16 * 1024,
  fonts: 64 * 1024,
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

function routeJavaScriptSize(relativeHtmlPath) {
  const htmlPath = path.join(outputDirectory, relativeHtmlPath);
  const html = readFileSync(htmlPath, 'utf8');
  const sources = new Set(
    [...html.matchAll(/<script[^>]+src=["']([^"']+\.js(?:\?[^"']*)?)["']/g)].map(
      (match) => match[1],
    ),
  );
  if (!sources.size) throw new Error(`${relativeHtmlPath} 没有找到客户端脚本`);
  return [...sources].reduce(
    (total, source) => {
      const filePath = assetPath(source);
      if (!existsSync(filePath))
        throw new Error(`${relativeHtmlPath} 引用了不存在的脚本：${source}`);
      const sourceBuffer = readFileSync(filePath);
      total.raw += sourceBuffer.byteLength;
      total.brotli += brotliCompressSync(sourceBuffer).byteLength;
      return total;
    },
    { raw: 0, brotli: 0 },
  );
}

const files = walk(outputDirectory);
const cssFiles = files.filter((file) => file.endsWith('.css'));
const fontFiles = files.filter((file) => /\.(?:woff2?|ttf|otf)$/i.test(file));
const textFiles = files.filter((file) => /\.(?:css|html|js|txt|xml)$/i.test(file));
const cssRaw = cssFiles.reduce((total, file) => total + statSync(file).size, 0);
const cssBrotli = cssFiles.reduce(
  (total, file) => total + brotliCompressSync(readFileSync(file)).byteLength,
  0,
);
const fonts = fontFiles.reduce((total, file) => total + statSync(file).size, 0);
const routes = [
  ['首页', 'index.html'],
  ['文章列表', path.join('articles', 'index.html')],
  ['分类列表', path.join('categories', 'index.html')],
  ['文章详情', path.join('2026', '07', '26', 'how-to-use-codex', 'index.html')],
];
const failures = [];

for (const [label, relativePath] of routes) {
  const bytes = routeJavaScriptSize(relativePath);
  console.log(
    `${label}初始脚本：${formatBytes(bytes.raw)} raw，${formatBytes(bytes.brotli)} Brotli`,
  );
  if (bytes.raw > limits.routeJavaScriptRaw) failures.push(`${label}初始脚本原始体积超过预算`);
  if (bytes.brotli > limits.routeJavaScriptBrotli) {
    failures.push(`${label}初始脚本 Brotli 体积超过预算`);
  }
}

console.log(`CSS：${formatBytes(cssRaw)} raw，${formatBytes(cssBrotli)} Brotli`);
console.log(`字体：${fontFiles.length} 个，${formatBytes(fonts)}`);

if (cssRaw > limits.cssRaw) failures.push('CSS 原始体积超过预算');
if (cssBrotli > limits.cssBrotli) failures.push('CSS Brotli 体积超过预算');
if (fonts > limits.fonts) failures.push('字体总体积超过预算');

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

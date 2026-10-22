import { realpath, rm } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = await realpath(path.resolve(import.meta.dirname, '..'));
const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--dry-run')) throw new Error('仅支持 --dry-run 参数。');
const dryRun = args.includes('--dry-run');
const generatedPaths = [
  '.next',
  '.wrangler/tmp',
  '.wrangler/e2e-state',
  'out',
  'playwright-report',
  'test-results',
  'tsconfig.tsbuildinfo',
];

// Check every existing target before deleting anything. Preserve local preview R2/KV data.
const targets = [];
for (const relativePath of generatedPaths) {
  const target = path.resolve(projectRoot, relativePath);
  let resolved;
  try {
    resolved = await realpath(target);
  } catch (error) {
    if (error.code === 'ENOENT') continue;
    throw error;
  }
  if (!resolved.startsWith(`${projectRoot}${path.sep}`))
    throw new Error(`拒绝清理项目外的路径：${relativePath}`);
  targets.push(target);
}

for (const target of targets) {
  console.log(`${dryRun ? '将清理' : '清理'}：${path.relative(projectRoot, target)}`);
  if (!dryRun) await rm(target, { recursive: true, force: true });
}
console.log(`${dryRun ? '预览完成' : '清理完成'}，已保留本地预览数据、源码、文章和依赖。`);

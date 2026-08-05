import { rm } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const generatedPaths = [
  '.next',
  '.wrangler',
  'out',
  'playwright-report',
  'test-results',
  'tsconfig.tsbuildinfo',
];

for (const relativePath of generatedPaths) {
  const target = path.resolve(projectRoot, relativePath);
  if (target !== projectRoot && target.startsWith(`${projectRoot}${path.sep}`)) {
    await rm(target, { recursive: true, force: true });
  }
}

console.log('已清理构建缓存、部署产物与测试报告。');

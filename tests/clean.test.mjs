import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, expect, it } from 'vitest';

const run = promisify(execFile);
const roots = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'youngkx-clean-'));
  roots.push(root);
  await mkdir(path.join(root, 'scripts'));
  await copyFile('scripts/clean.mjs', path.join(root, 'scripts/clean.mjs'));
  const generated = [
    '.next/cache',
    'out/index.html',
    'test-results/report',
    '.wrangler/e2e-state/test',
    '.wrangler/tmp/cache',
    'tsconfig.tsbuildinfo',
  ];
  const retained = [
    '.wrangler/state/v3/r2/file',
    'content/posts/article.md',
    'node_modules/dependency/index.js',
  ];
  for (const relative of [...generated, ...retained]) {
    const target = path.join(root, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, 'keep');
  }
  return { root, generated, retained };
}

it('cleans generated files while preserving local R2, source, and dependencies', async () => {
  const { root, generated, retained } = await fixture();
  await run(process.execPath, [path.join(root, 'scripts/clean.mjs')]);
  for (const relative of generated)
    await expect(readFile(path.join(root, relative))).rejects.toMatchObject({ code: 'ENOENT' });
  for (const relative of retained)
    expect(await readFile(path.join(root, relative), 'utf8')).toBe('keep');
});

it('dry-run lists targets without deleting files', async () => {
  const { root, generated, retained } = await fixture();
  const { stdout } = await run(process.execPath, [
    path.join(root, 'scripts/clean.mjs'),
    '--dry-run',
  ]);
  expect(stdout).toContain('.next');
  for (const relative of [...generated, ...retained])
    expect(await readFile(path.join(root, relative), 'utf8')).toBe('keep');
});

it('refuses paths redirected outside the project before deleting any files', async () => {
  const { root } = await fixture();
  const outside = await mkdtemp(path.join(os.tmpdir(), 'youngkx-clean-outside-'));
  roots.push(outside);
  await writeFile(path.join(outside, 'sentinel'), 'keep');
  await rm(path.join(root, '.wrangler'), { recursive: true, force: true });
  await mkdir(path.join(outside, 'tmp'));
  await symlink(
    outside,
    path.join(root, '.wrangler'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  await expect(run(process.execPath, [path.join(root, 'scripts/clean.mjs')])).rejects.toMatchObject(
    { code: 1 },
  );
  expect(await readFile(path.join(root, '.next/cache'), 'utf8')).toBe('keep');
  expect(await readFile(path.join(outside, 'sentinel'), 'utf8')).toBe('keep');
});

import { expect, test, type Route } from '@playwright/test';
import { readFile, mkdir, open, rm } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { defaultRepositorySettings, type RepositoryListing } from '../../lib/file-repository';

const settings = defaultRepositorySettings();
const fixture: RepositoryListing = {
  settings,
  folders: [
    { id: 'lessons', name: '课程资料', createdAt: '2026-10-22T01:00:00Z' },
    { id: 'templates', name: '代码模板', createdAt: '2026-10-22T02:00:00Z' },
  ],
  files: [
    {
      id: 'document',
      folderId: 'lessons',
      name: '电学练习.pdf',
      description: '九年级电路与电阻练习，附参考答案。',
      size: 204800,
      uploadedAt: '2026-10-22T03:00:00Z',
    },
    {
      id: 'code',
      folderId: 'templates',
      name: 'graph.cpp',
      description: 'An annotated shortest path template.',
      size: 7200,
      uploadedAt: '2026-10-21T03:00:00Z',
    },
    {
      id: 'archive',
      folderId: 'lessons',
      name: 'resources.zip',
      description: 'Source files and reference material.',
      size: 5242880,
      uploadedAt: '2026-10-20T03:00:00Z',
    },
    {
      id: 'notes',
      folderId: null,
      name: 'notes.md',
      description: 'Release notes.',
      size: 100,
      uploadedAt: '2026-10-19T03:00:00Z',
    },
  ],
  cursor: null,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('youngkx-theme', 'dark');
    sessionStorage.clear();
  });
});

test('公开仓库按说明搜索、筛选、排序并下载，深浅主题均无横向溢出', async ({ page }, testInfo) => {
  await page.route('**/api/files', (route) => route.fulfill({ json: fixture }));
  await page.route('**/api/files/document', (route) =>
    route.fulfill({
      body: 'sample download',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition':
          "attachment; filename*=UTF-8''%E7%94%B5%E5%AD%A6%E7%BB%83%E4%B9%A0.pdf",
      },
    }),
  );
  await page.goto('/repo/');
  await expect(page.getByRole('heading', { name: settings.title, exact: true })).toBeVisible();
  await expect(page.getByText('YOUNGKX / FILE REPOSITORY', { exact: true })).toHaveCount(0);
  await expect(page.locator('.repo-breadcrumb')).toHaveCount(0);
  await expect(page.locator('.repo-file-row')).toHaveCount(2);
  await expect(page.locator('.repo-file-list')).not.toContainText('notes.md');
  await expect(page.getByRole('button', { name: 'Open folder 课程资料' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open folder 课程资料' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'Open folder 代码模板' })).toBeVisible();
  await expect(page.locator('.repo-folder-grid, .repo-folder-path')).toHaveCount(0);
  await expect(
    page.getByText('Notes, resources, and files to keep and share.', { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText('Pick a file. Take it with you.', { exact: false })).toHaveCount(0);
  await expect(page.locator('.repo-filters')).toHaveCount(0);
  await page.getByRole('searchbox').fill('shortest');
  await expect(page.locator('.repo-file-row')).toHaveCount(1);
  await expect(page.locator('.repo-file-row')).toContainText('graph.cpp');
  await expect(page.locator('.repo-file-folder')).toContainText('代码模板');
  await expect(page.locator('.repo-folder-tabs [aria-pressed="true"]')).toHaveCount(0);
  await page.getByRole('searchbox').fill('Release notes');
  await expect(page.locator('.repo-file-row')).toContainText('notes.md');
  await expect(page.locator('.repo-file-folder')).toContainText('Unfiled');
  await page.getByRole('button', { name: 'Open folder 课程资料' }).click();
  await page.getByRole('searchbox', { name: 'Search files' }).fill('电阻');
  await expect(page.locator('.repo-file-row')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Download 电学练习.pdf' })).toHaveAttribute(
    'href',
    '/api/files/document',
  );
  await expect(page.getByRole('link', { name: 'Download 电学练习.pdf' })).toHaveAttribute(
    'download',
    '电学练习.pdf',
  );
  await page.getByRole('searchbox').fill('');
  await page.getByRole('button', { name: 'Open folder 代码模板' }).click();
  await expect(page.locator('.repo-file-row')).toHaveCount(1);
  await expect(page.locator('.repo-file-row')).toContainText('graph.cpp');
  await page.getByRole('button', { name: 'Open folder 课程资料' }).click();
  await page.getByRole('combobox', { name: 'Sort files' }).selectOption('size');
  await expect(page.locator('.repo-file-row').first()).toContainText('resources.zip');
  for (const theme of ['dark', 'light']) {
    if (theme === 'light') {
      await page.getByRole('button', { name: '切换主题' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      await expect(page.locator('html')).not.toHaveClass(/theme-changing/);
      await expect
        .poll(() => page.evaluate(() => getComputedStyle(document.body).color))
        .toBe('rgb(23, 25, 34)');
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThan(2);
    await expect(page.getByRole('link', { name: 'Manage Repo' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`repo-${theme}.png`), fullPage: true });
  }
});

test('分页合并去重，空仓库、暂停与故障各自提示', async ({ page }) => {
  let mode = 'pagination';
  const flatFixture = {
    ...fixture,
    folders: fixture.folders.slice(0, 1),
    files: fixture.files.map((file) => ({ ...file, folderId: 'lessons' })),
  };
  await page.route('**/api/files*', (route) => {
    if (mode === 'error')
      return route.fulfill({ status: 503, json: { error: 'File storage is not configured yet.' } });
    if (mode === 'empty') return route.fulfill({ json: { settings, files: [], cursor: null } });
    if (mode === 'paused')
      return route.fulfill({
        json: { settings: { ...settings, publicEnabled: false }, files: [], cursor: null },
      });
    return route.fulfill({
      json: route.request().url().includes('cursor=')
        ? flatFixture
        : { ...flatFixture, files: flatFixture.files.slice(0, 2), cursor: 'next-page' },
    });
  });
  await page.goto('/repo/');
  await expect(page.locator('.repo-file-row')).toHaveCount(2);
  await expect(
    page.getByText('Load more files, or search across the entire repository.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Load more files/ }).click();
  await expect(page.locator('.repo-file-row')).toHaveCount(4);
  await expect(page.getByRole('button', { name: /Load more files/ })).toHaveCount(0);
  mode = 'empty';
  await page.reload();
  await expect(page.getByRole('heading', { name: 'No folders yet.' })).toBeVisible();
  mode = 'paused';
  await page.reload();
  await expect(page.getByRole('heading', { name: 'A little pause.' })).toBeVisible();
  await expect(page.getByRole('searchbox')).toHaveCount(0);
  mode = 'error';
  await page.reload();
  await expect(page.locator('.repo-notice[role="alert"]')).toContainText(
    'File storage is not configured yet.',
  );
  await expect(page.getByRole('heading', { name: 'No folders yet.' })).toHaveCount(0);
  mode = 'empty';
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'No folders yet.' })).toBeVisible();
});

test('全局搜索自动遍历全部分页，去重并在分页失败后重试', async ({ page }) => {
  let fail = false;
  await page.route('**/api/files*', async (route) => {
    const cursor = new URL(route.request().url()).searchParams.get('cursor');
    if (cursor === 'last' && fail)
      return route.fulfill({ status: 503, json: { error: 'Search page unavailable.' } });
    return route.fulfill({
      json: {
        ...fixture,
        files:
          cursor === 'last'
            ? fixture.files.slice(2)
            : cursor
              ? fixture.files.slice(0, 2)
              : fixture.files.slice(0, 1),
        cursor: cursor === 'last' ? null : cursor ? 'last' : 'next',
      },
    });
  });
  await page.goto('/repo/');
  await page.getByRole('searchbox').fill('notes');
  await expect(page.locator('.repo-file-row')).toHaveCount(1);
  await expect(page.locator('.repo-file-row')).toContainText('notes.md');
  await expect(page.getByRole('status')).toContainText('1 results across all folders');
  await page.getByRole('searchbox').fill('   ');
  await expect(page.locator('.repo-file-row')).toHaveCount(2);
  fail = true;
  await page.reload();
  await page.getByRole('searchbox').fill('notes');
  await expect(page.locator('.repo-notice[role="alert"]')).toContainText(
    'Search page unavailable.',
  );
  await expect(page.getByRole('heading', { name: 'No matching files.' })).toHaveCount(0);
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.repo-file-row')).toContainText('notes.md');
  await expect(page.getByRole('status')).toContainText('1 results across all folders');
});

test('真实 R2 图片和视频可点击预览、关闭、播放和下载', async ({ page, request }, testInfo) => {
  const original = (await (await request.get('/api/files/admin')).json()) as RepositoryListing;
  const ids: string[] = [];
  let folderId: string | undefined;
  try {
    await request.put('/api/files/settings', {
      data: { ...original.settings, publicEnabled: true },
    });
    const folder = await request.post('/api/files/folders', {
      data: { name: `media-${testInfo.project.name}-${Date.now()}` },
    });
    folderId = (await folder.json()).folder.id;
    await page.goto('/repo/');
    const media = [
      {
        name: 'preview-image.png',
        bytes: await readFile(path.resolve('tests/fixtures/repository-preview.png')),
      },
      {
        name: 'preview-video.webm',
        bytes: await readFile(path.resolve('tests/fixtures/repository-preview.webm')),
      },
    ];
    for (const file of media) {
      const response = await request.post(`/api/files?name=${file.name}&folderId=${folderId}`, {
        data: file.bytes,
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      expect(response.status()).toBe(201);
      ids.push((await response.json()).file.id);
    }
    await page.reload();
    await page.getByRole('searchbox').fill('preview-');
    const imageTrigger = page.getByRole('button', {
      name: 'Preview preview-image.png',
      exact: true,
    });
    await imageTrigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect
      .poll(() => dialog.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBe(160);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThan(2);
    await page.screenshot({ path: testInfo.outputPath('repo-image-preview.png') });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(imageTrigger).toBeFocused();
    await page.getByRole('button', { name: 'Preview preview-video.webm', exact: true }).click();
    const video = dialog.locator('video');
    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState))
      .toBeGreaterThanOrEqual(2);
    await video.evaluate((element: HTMLVideoElement) => element.play());
    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime))
      .toBeGreaterThan(0);
    await page.screenshot({ path: testInfo.outputPath('repo-video-preview.png') });
    await dialog.getByRole('button', { name: 'Close preview' }).click();
    await expect(dialog).toHaveCount(0);
    for (let index = 0; index < ids.length; index++) {
      const preview = await request.get(`/api/files/${ids[index]}?preview=1`, {
        headers: { Range: 'bytes=0-9' },
      });
      expect(preview.status()).toBe(206);
      expect((await preview.body()).equals(media[index].bytes.subarray(0, 10))).toBeTruthy();
      const download = await request.get(`/api/files/${ids[index]}`);
      expect(download.headers()['content-disposition']).toContain('attachment;');
      expect((await download.body()).equals(media[index].bytes)).toBeTruthy();
    }
    await page.route(`**/api/files/${ids[0]}?preview=1`, (route) =>
      route.fulfill({ status: 403, body: 'Paused' }),
    );
    await imageTrigger.click();
    await expect(dialog.getByRole('alert')).toContainText('could not be previewed');
    await expect(dialog.getByRole('link', { name: 'Download preview-image.png' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Close preview' }).click();
  } finally {
    for (const id of ids) await request.delete(`/api/files/${id}`);
    if (folderId) await request.delete(`/api/files/folders/${folderId}`);
    await request.put('/api/files/settings', { data: original.settings });
  }
});

test('管理 token 校验、会话失效和锁定', async ({ page }) => {
  let expired = false;
  await page.route('**/api/files/admin', (route) =>
    route.request().headers().authorization === 'Bearer frontend-test-token' && !expired
      ? route.fulfill({ json: fixture })
      : route.fulfill({ status: 401, json: { error: 'Invalid manage token.' } }),
  );
  await page.goto('/repo/manage/');
  await expect(page.getByRole('button', { name: 'Unlock Repo' })).toBeEnabled();
  await expect(page.getByRole('heading', { name: 'Your collection, your key.' })).toHaveCount(0);
  await expect(
    page.getByText('It is remembered only for this browser tab.', { exact: false }),
  ).toHaveCount(0);
  await page.getByLabel('Manage token', { exact: true }).fill('wrong-token');
  await page.getByRole('button', { name: 'Unlock Repo' }).click();
  await expect(page.locator('.repo-notice[role="alert"]')).toContainText('Invalid manage token.');
  await page.getByLabel('Manage token', { exact: true }).fill('frontend-test-token');
  await page.getByRole('button', { name: 'Unlock Repo' }).click();
  await expect(page.getByRole('button', { name: 'Upload file', exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('youngkx-links-token'))).toBe(
    'frontend-test-token',
  );
  expired = true;
  await page.getByRole('button', { name: 'Refresh list' }).click();
  await expect(page.getByRole('button', { name: 'Unlock Repo' })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('youngkx-links-token'))).toBeNull();
  expired = false;
  await page.getByRole('button', { name: 'Unlock Repo' }).click();
  await page.getByRole('button', { name: 'Lock workspace' }).click();
  await expect(page.getByRole('button', { name: 'Unlock Repo' })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('youngkx-links-token'))).toBeNull();
});

test('本地 R2 完整操作：自建文件夹、上传、改名说明、下载、移动和删除', async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(90_000);
  const original = (await (await request.get('/api/files/admin')).json()) as RepositoryListing;
  const name = `repo-ui-${testInfo.project.name}-${Date.now()}.txt`;
  const renamed = `已更新-${name}`;
  const folderName = `自建-${testInfo.project.name}-${Date.now()}`;
  const renamedFolder = `更新-${folderName}`;
  const content = Buffer.from('Repo browser integration.\n中文正文\n');
  let id: string | undefined;
  let folderId: string | undefined;
  let destinationId: string | undefined;
  try {
    await request.put('/api/files/settings', {
      data: { ...original.settings, publicEnabled: true },
    });
    await page.goto('/repo/manage/');
    await expect(page.getByRole('button', { name: 'Upload file', exact: true })).toBeVisible();
    await page.locator('.repo-folder-create').getByLabel('Folder name').fill(folderName);
    await page.getByRole('button', { name: 'Create folder', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Folder created.');
    const created = (await (await request.get('/api/files/admin')).json()) as RepositoryListing;
    folderId = created.folders.find((folder) => folder.name === folderName)?.id;
    expect(folderId).toBeTruthy();
    await expect(page.getByRole('combobox', { name: 'Upload to folder' })).toHaveValue(folderId!);
    await page
      .getByLabel('Choose a file to upload')
      .setInputFiles({ name, mimeType: 'text/plain', buffer: content });
    await page.getByLabel('File description', { exact: true }).fill('Uploaded from the browser.');
    await page.getByRole('button', { name: 'Upload file', exact: true }).click();
    const item = page
      .locator('.repo-managed-file')
      .filter({ has: page.getByRole('heading', { name, exact: true }) });
    await expect(item).toContainText('Uploaded from the browser.');
    const stored = (await (await request.get('/api/files/admin')).json()) as RepositoryListing;
    id = stored.files.find((file) => file.name === name)?.id;
    expect(id).toBeTruthy();
    expect(stored.files.find((file) => file.id === id)?.folderId).toBe(folderId);
    await item.getByRole('button', { name: 'Edit details' }).click();
    await item.getByLabel('File name', { exact: true }).fill(renamed);
    await item
      .getByRole('textbox', { name: 'Description', exact: true })
      .fill('修改说明，保留原始文件内容。');
    await item.getByRole('button', { name: 'Save details' }).click();
    await expect(page.getByRole('status')).toContainText('File details saved.');
    await page.locator('.repo-folder-tools').getByLabel('Folder name').fill(renamedFolder);
    await page.getByRole('button', { name: 'Rename folder', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Folder renamed.');
    await page.getByRole('button', { name: 'Delete folder', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm delete folder', exact: true }).click();
    await expect(page.locator('.repo-notice[role="alert"]')).toContainText(
      /Move or delete the files/,
    );
    await page.getByLabel('Repository title').fill('Repo browser test');
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByRole('status')).toContainText('Settings saved.');
    await page.goto('/repo/');
    await expect(
      page.getByRole('heading', { name: 'Repo browser test', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: `Open folder ${renamedFolder}`, exact: true }).click();
    await expect(page.getByText('修改说明，保留原始文件内容。')).toBeVisible();
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('link', { name: `Download ${renamed}`, exact: true }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe(renamed);
    expect(await readFile((await download.path())!)).toEqual(content);
    await page.goto('/repo/manage/');
    await page.getByRole('checkbox', { name: /Public downloads/ }).uncheck();
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByRole('status')).toContainText('Settings saved.');
    await page.goto('/repo/');
    await expect(page.getByRole('heading', { name: 'A little pause.' })).toBeVisible();
    await page.goto('/repo/manage/');
    await page.locator('.repo-folder-create').getByLabel('Folder name').fill(`${folderName}-move`);
    await page.getByRole('button', { name: 'Create folder', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Folder created.');
    destinationId = await page.getByRole('combobox', { name: 'Upload to folder' }).inputValue();
    await page.getByRole('button', { name: `Open folder ${renamedFolder}`, exact: true }).click();
    const updated = page
      .locator('.repo-managed-file')
      .filter({ has: page.getByRole('heading', { name: renamed, exact: true }) });
    await updated.getByRole('button', { name: 'Edit details' }).click();
    await expect(updated.getByRole('combobox', { name: 'Folder', exact: true })).not.toContainText(
      'Repo /',
    );
    await updated
      .getByRole('combobox', { name: 'Folder', exact: true })
      .selectOption(destinationId!);
    await updated.getByRole('button', { name: 'Save details' }).click();
    await expect(updated).toHaveCount(0);
    await page.getByRole('button', { name: 'Delete folder', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm delete folder', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Folder deleted.');
    await page.getByRole('button', { name: `Open folder ${folderName}-move`, exact: true }).click();
    await expect(updated).toBeVisible();
    await updated.getByRole('button', { name: `Delete ${renamed}`, exact: true }).click();
    await updated.getByRole('button', { name: 'Delete permanently' }).click();
    await expect(updated).toHaveCount(0);
  } finally {
    if (!id) {
      const current = (await (await request.get('/api/files/admin')).json()) as RepositoryListing;
      id = current.files.find((file) => file.name === name || file.name === renamed)?.id;
    }
    if (id) await request.delete(`/api/files/${id}`);
    if (!folderId) {
      const current = (await (await request.get('/api/files/admin')).json()) as RepositoryListing;
      folderId = current.folders.find(
        (folder) => folder.name === folderName || folder.name === renamedFolder,
      )?.id;
    }
    if (folderId) await request.delete(`/api/files/folders/${folderId}`);
    if (destinationId) await request.delete(`/api/files/folders/${destinationId}`);
    await request.put('/api/files/settings', { data: original.settings });
  }
});

test('首页右侧 Links 和 Repo 入口可直接跳转', async ({ page }, testInfo) => {
  await page.goto('/');
  const resources = page.getByRole('navigation', { name: '资源导航' });
  await expect(resources.getByRole('link')).toHaveText(['Links', 'Repo']);
  await expect(resources).toBeVisible();
  if (!testInfo.project.name.startsWith('mobile')) {
    const first = await page.locator('.nav-links').boundingBox();
    const second = await resources.boundingBox();
    expect(second!.x - (first!.x + first!.width)).toBeGreaterThan(20);
  }
  await resources.getByRole('link', { name: 'Links', exact: true }).click();
  await expect(page).toHaveURL(/\/links\/$/);
  await page.goto('/');
  await page
    .getByRole('navigation', { name: '资源导航' })
    .getByRole('link', { name: 'Repo', exact: true })
    .click();
  await expect(page).toHaveURL(/\/repo\/$/);
});

test('Links、Repo及管理页顶栏都有相互跳转入口', async ({ page }, testInfo) => {
  for (const pathname of ['/links/', '/repo/', '/links/manage/', '/repo/manage/']) {
    await page.goto(pathname);
    const nav = page.getByRole('navigation', { name: '资源导航' });
    await expect(nav.getByRole('link')).toHaveText(['Links', 'Repo']);
    await expect(nav).toBeVisible();
    await expect(
      nav.getByRole('link', {
        name: pathname.startsWith('/links/') ? 'Links' : 'Repo',
        exact: true,
      }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThan(2);
    if (testInfo.project.name.startsWith('mobile')) {
      const menu = page.getByRole('button', { name: '切换菜单', exact: true });
      await menu.click();
      await expect(
        page
          .getByRole('navigation', { name: '主导航' })
          .getByRole('link', { name: 'Home', exact: true }),
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
    }
    const destination = pathname.startsWith('/links/') ? 'Repo' : 'Links';
    await nav.getByRole('link', { name: destination, exact: true }).click();
    await expect(page).toHaveURL(destination === 'Repo' ? /\/repo\/$/ : /\/links\/$/);
  }
});

async function fileHash(filename: string) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
}

test('取消分片上传会中止会话，保留文件以便重试', async ({ page }) => {
  const held: Route[] = [];
  let aborted = false;
  await page.route('**/api/files/admin', (route) =>
    route.fulfill({
      json: {
        settings: { ...settings, maxUploadMiB: 1024 },
        folders: fixture.folders,
        files: [],
        cursor: null,
      },
    }),
  );
  await page.route(/\/api\/files\/uploads(?:\/.*)?$/, (route) => {
    if (route.request().method() === 'DELETE') {
      aborted = true;
      return route.fulfill({ json: { aborted: true } });
    }
    if (route.request().method() === 'PUT') {
      held.push(route);
      return;
    }
    return route.fulfill({
      status: 201,
      json: { id: 'cancel-session', uploadId: 'test-upload', partSizeMiB: 32 },
    });
  });
  try {
    await page.goto('/repo/manage/');
    await page.getByLabel('Choose a file to upload').setInputFiles({
      name: 'cancelled.bin',
      mimeType: 'application/octet-stream',
      buffer: Buffer.alloc(33 * 1024 * 1024),
    });
    await page.getByRole('button', { name: 'Upload file', exact: true }).click();
    await expect.poll(() => held.length).toBe(1);
    await page.getByRole('button', { name: 'Cancel upload', exact: true }).click();
    await expect.poll(() => aborted).toBe(true);
    await expect(page.locator('.repo-notice[role="alert"]')).toContainText('Upload canceled.');
    await expect(page.getByRole('button', { name: 'Upload file', exact: true })).toBeEnabled();
    await expect(page.getByRole('heading', { name: 'cancelled.bin', exact: true })).toHaveCount(0);
  } finally {
    for (const route of held) await route.abort().catch(() => {});
  }
});

test('浏览器分片上传超过95MiB、重试失败分片并下载校验SHA256', async ({
  page,
  request,
}, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), '大文件字节完整性在桌面浏览器验证。');
  test.setTimeout(180_000);
  const filename = `large-${Date.now()}.bin`;
  const localPath = testInfo.outputPath(filename);
  const size = 100 * 1024 * 1024 + 211;
  const original = (await (await request.get('/api/files/admin')).json()) as RepositoryListing;
  let id: string | undefined;
  let folderId: string | undefined;
  const folderName = `large-uploads-${Date.now()}`;
  let retried = false;
  let publishedDuringUpload = false;
  const requestedParts: number[] = [];
  await mkdir(path.dirname(localPath), { recursive: true });
  const source = await open(localPath, 'w');
  try {
    await source.truncate(size);
    const marker = Buffer.from('Youngkx multipart binary integrity — 分片边界校验');
    for (const offset of [0, 32 * 1024 * 1024 - 17, 64 * 1024 * 1024 - 9, size - marker.length])
      await source.write(marker, 0, marker.length, offset);
  } finally {
    await source.close();
  }
  try {
    const created = await request.post('/api/files/folders', { data: { name: folderName } });
    expect(created.status()).toBe(201);
    folderId = (await created.json()).folder.id as string;
    const prepared = await request.put('/api/files/settings', {
      data: { ...original.settings, publicEnabled: true, maxUploadMiB: 1024 },
    });
    expect(prepared.ok()).toBeTruthy();
    await page.route('**/api/files/uploads/**/parts/*', async (route) => {
      const partNumber = Number(route.request().url().split('/').at(-1));
      requestedParts.push(partNumber);
      if (partNumber === 1 && !retried) {
        retried = true;
        return route.fulfill({ status: 503, json: { error: 'Temporary connection failure.' } });
      }
      if (partNumber === 2) {
        const pending = (await (await request.get('/api/files')).json()) as RepositoryListing;
        publishedDuringUpload = pending.files.some((file) => file.name === filename);
      }
      return route.continue();
    });
    await page.goto('/repo/manage/');
    await expect(page.getByRole('spinbutton', { name: 'Upload limit (GB)' })).toHaveAttribute(
      'max',
      '5',
    );
    await page.getByRole('spinbutton', { name: 'Upload limit (GB)' }).fill('5');
    await page.getByRole('button', { name: 'Save settings', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Settings saved.');
    await page.getByRole('combobox', { name: 'Upload to folder' }).selectOption(folderId!);
    await page.getByLabel('Choose a file to upload').setInputFiles(localPath);
    await page
      .getByLabel('File description', { exact: true })
      .fill('A real file larger than the previous upload limit.');
    await page.getByRole('button', { name: 'Upload file', exact: true }).click();
    await expect(page.getByRole('heading', { name: filename, exact: true })).toBeVisible({
      timeout: 120_000,
    });
    expect(requestedParts).toEqual([1, 1, 2, 3, 4]);
    expect(publishedDuringUpload).toBe(false);
    const stored = (await (await request.get('/api/files/admin')).json()) as RepositoryListing;
    const file = stored.files.find((file) => file.name === filename);
    id = file?.id;
    expect(file?.size).toBe(size);
    const head = await request.head(`/api/files/${id}`);
    expect(Number(head.headers()['content-length'])).toBe(size);
    await page.goto('/repo/');
    await page.getByRole('button', { name: `Open folder ${folderName}`, exact: true }).click();
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('link', { name: `Download ${filename}`, exact: true }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe(filename);
    expect(await fileHash((await download.path())!)).toBe(await fileHash(localPath));
  } finally {
    if (!id) {
      const listing = (await (await request.get('/api/files/admin')).json()) as RepositoryListing;
      id = listing.files.find((file) => file.name === filename)?.id;
    }
    if (id) await request.delete(`/api/files/${id}`);
    if (folderId) await request.delete(`/api/files/folders/${folderId}`);
    await request.put('/api/files/settings', { data: original.settings });
    await rm(localPath, { force: true });
  }
});

test('首页 Cards 的 Repo 入口抵达仓库', async ({ page }) => {
  await page.goto('/#interactive-cards');
  const card = page.getByRole('link', { name: '打开文件仓库 Repo' });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/repo\/$/);
  await expect(page.getByRole('heading', { name: settings.title, exact: true })).toBeVisible();
});

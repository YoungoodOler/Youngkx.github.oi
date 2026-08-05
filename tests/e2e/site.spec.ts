import { expect, test, type Page } from '@playwright/test';

async function useStoredTheme(page: Page, theme: 'dark' | 'light' = 'dark') {
  await page.addInitScript((storedTheme) => {
    localStorage.setItem('youngkx-theme', storedTheme);
    sessionStorage.clear();
  }, theme);
}

async function openPage(page: Page, pathname: string) {
  await page.goto(pathname, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.scene canvas')).toBeVisible({ timeout: 12_000 });
}

test('主页首屏和第二阶段保持完整分层布局', async ({ page }, testInfo) => {
  await useStoredTheme(page);
  await openPage(page, '/');

  const title = page.locator('.hero-title-layer h1');
  await expect(title).toContainText('Youngkx');
  await expect(title).toContainText('Blog');
  const initialTitleBox = await title.boundingBox();
  expect(initialTitleBox).not.toBeNull();
  expect(initialTitleBox?.height ?? 0).toBeGreaterThan(
    testInfo.project.name.startsWith('mobile') ? 110 : 250,
  );

  const targetScroll = await page.locator('.hero-stage').evaluate((stage) => {
    if (!(stage instanceof HTMLElement)) throw new Error('hero-stage 必须是 HTML 元素');
    const travel = Math.max(1, stage.offsetHeight - window.innerHeight);
    return stage.offsetTop + travel * 0.75;
  });
  await page.evaluate((scrollTop) => window.scrollTo(0, scrollTop), targetScroll);
  await page.waitForTimeout(650);

  await expect(page.locator('.hero-copy-intro')).toBeVisible();
  await expect(page.locator('.hero-copy-description')).toBeVisible();
  await expect(page.locator('.hero-copy-actions')).toBeVisible();

  const restingTitleBox = await title.boundingBox();
  const detailBox = await page.locator('.hero-detail-layer').boundingBox();
  expect(restingTitleBox).not.toBeNull();
  expect(detailBox).not.toBeNull();
  expect(Math.abs((restingTitleBox?.x ?? 0) - (detailBox?.x ?? 0))).toBeLessThan(
    testInfo.project.name.startsWith('mobile') ? 24 : 48,
  );
  expect(restingTitleBox?.width ?? 0).toBeGreaterThan(
    testInfo.project.name.startsWith('mobile') ? 240 : 500,
  );
});

test('主题切换保留粒子幕并快速应用新主题', async ({ page }) => {
  await useStoredTheme(page);
  await openPage(page, '/articles/');

  await page.locator('.theme-toggle').click();
  await expect(page.locator('.site-transition--theme')).toBeVisible();
  await expect.poll(() => page.locator('html').getAttribute('data-theme')).toBe('light');
  await expect(page.locator('.site-transition')).toHaveCount(0, { timeout: 1_300 });
  await expect(page.getByRole('heading', { name: '所有文章' })).toBeVisible();
  await expect(page.locator('.scene canvas')).toBeVisible();
});

test('跨页面切换显示粒子幕并到达目标页面', async ({ page }) => {
  await useStoredTheme(page);
  await openPage(page, '/articles/');

  await page.getByRole('link', { name: '分类' }).click();
  await expect(page.locator('.site-transition--page-out')).toBeVisible();
  await expect(page).toHaveURL(/\/categories\/$/, { timeout: 5_000 });
  await expect(page.getByRole('heading', { name: '文章分类' })).toBeVisible();
  await expect(page.locator('.scene canvas')).toBeVisible();
});

test('文章代码块能够识别语言并复制', async ({ page }) => {
  await useStoredTheme(page);
  await openPage(page, '/2023/11/05/printf用法详解/');

  const copyButton = page.locator('.code-copy').first();
  const language = page.locator('.code-language').first();
  await expect(copyButton).toBeVisible();
  await expect(language).not.toHaveText('');
  await copyButton.click();
  await expect(copyButton).toContainText('已复制');
});

test('减少动态效果时立即切换且不创建粒子幕', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await useStoredTheme(page);
  await openPage(page, '/');

  await page.locator('.theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.site-transition')).toHaveCount(0);
});

test('手机导航能够展开并访问主要入口', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), '仅在手机视口验证');
  await useStoredTheme(page);
  await openPage(page, '/');

  const menu = page.getByRole('button', { name: '切换菜单' });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.nav-links')).toHaveClass(/open/);
  await expect(page.getByRole('link', { name: '文章', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '分类', exact: true })).toBeVisible();

  const menuBox = await page.locator('.nav-links').boundingBox();
  const viewport = page.viewportSize();
  expect(menuBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(menuBox?.width ?? Infinity).toBeLessThan(260);
  expect(menuBox?.height ?? Infinity).toBeLessThan(240);
  expect((menuBox?.x ?? 0) + (menuBox?.width ?? 0) / 2).toBeGreaterThan((viewport?.width ?? 0) / 2);
  expect((viewport?.width ?? 0) - ((menuBox?.x ?? 0) + (menuBox?.width ?? 0))).toBeLessThan(24);
  expect(menuBox?.y ?? 0).toBeGreaterThan(50);
});

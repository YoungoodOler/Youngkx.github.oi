import { expect, test, type Page } from '@playwright/test';

async function useStoredTheme(page: Page, theme: 'dark' | 'light' = 'dark') {
  await page.addInitScript((storedTheme) => {
    localStorage.setItem('youngkx-theme', storedTheme);
    sessionStorage.clear();
  }, theme);
}

async function openPage(page: Page, pathname: string) {
  await page.goto(pathname);
  if (new URL(pathname, 'http://localhost').pathname === '/') {
    await expect(page.getByRole('region', { name: '站点入口' })).toBeVisible();
  }
}

test('首页首屏显示大 Logo 和 Tech Text，字符背景随首屏滚走', async ({ page }) => {
  await useStoredTheme(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const heading = page.getByRole('heading', { level: 1, name: 'Youngkx Blog' });
  const background = page.locator('.home-ascii-background');
  const largeLogo = page.locator('.electric-logo');
  const cards = page.getByRole('region', { name: 'Cards', exact: true });
  const brand = page.getByRole('link', { name: 'Youngkx Blog 首页' });
  await expect(heading).toBeInViewport();
  await expect(heading).toHaveAttribute('data-tech-text', '');
  await expect(largeLogo).toHaveAttribute('data-electric-logo', '');
  await expect(largeLogo).toBeInViewport();
  await expect(background.locator('canvas')).toBeVisible();
  await expect(page.locator('.writing-background .dot-grid')).toHaveCount(1);
  await expect(brand).toHaveAttribute('href', '#top');
  await expect(brand).toHaveAttribute('data-sticker-peel', '');
  await expect(cards.getByRole('heading', { name: 'Cards', exact: true })).not.toBeInViewport();

  const bgTop = await background.evaluate((element) => element.getBoundingClientRect().top);
  await page.evaluate(() => window.scrollTo({ top: 180, behavior: 'instant' }));
  await expect
    .poll(() => background.evaluate((element) => element.getBoundingClientRect().top))
    .toBeLessThan(bgTop - 175);
  await cards.evaluate((element) => element.scrollIntoView({ behavior: 'instant' }));
  await expect(background).not.toBeInViewport();
  await expect(cards.getByRole('heading', { name: 'Cards', exact: true })).toBeInViewport();
  await expect(largeLogo.locator('canvas')).toHaveCount(0);
});

test('导航和 Cards 标题保留各自的界面字体', async ({ page }) => {
  await useStoredTheme(page);
  await openPage(page, '/');

  const fonts = await page.evaluate(() => ({
    navigation: getComputedStyle(document.querySelector('.nav-links')!).fontFamily,
    title: getComputedStyle(document.querySelector('#signal-deck-title')!).fontFamily,
  }));

  expect(fonts.navigation).not.toBe(fonts.title);
  expect(fonts.navigation.toLowerCase()).not.toContain('mono');
  expect(fonts.title.toLowerCase()).toContain('georgia');
  await expect(page.locator('.nav-links')).toContainText('Home');
  await expect(page.locator('.nav-links')).not.toContainText('HOME');
  await expect(page.locator('.nav-links a')).toHaveText(['Home', 'Cards', 'Articles', 'Topics']);
  await expect(page.locator('.nav-links a[href="#interactive-cards"]')).toHaveText('Cards');
});

test('滚轮连续通过 Cards 且可以立即反向滚动', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), '桌面滚轮回归测试');
  await useStoredTheme(page);
  await openPage(page, '/#interactive-cards');

  const carousel = page.getByRole('region', { name: '站点入口' });
  await expect(carousel).toHaveAttribute('data-renderer', 'liquid', { timeout: 15_000 });
  const box = await carousel.locator('canvas').boundingBox();
  if (!box) throw new Error('找不到 Liquid 轮播画布');
  const initialScroll = await page.evaluate(() => window.scrollY);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 800);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(initialScroll + 500);
  const forwardScroll = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, -600);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(forwardScroll - 400);
});

test('主页 Cards 使用 Liquid 轮播并显示最新文章标题', async ({ page }, testInfo) => {
  await useStoredTheme(page);
  await openPage(page, '/#interactive-cards');

  const carousel = page.getByRole('region', { name: '站点入口' });
  const latest = carousel.getByRole('link', { name: /打开最新文章/ });
  const topics = carousel.getByRole('link', { name: '浏览文章主题' });
  const repo = carousel.getByRole('link', { name: '打开文件仓库 Repo' });
  const firstArticle = page.locator('#posts .article-card').first();
  await expect(latest.locator('small')).toHaveText(await firstArticle.locator('h3').innerText());
  const latestHref = await firstArticle.getByRole('link').getAttribute('href');
  if (!latestHref) throw new Error('找不到最新文章链接');
  await expect(latest).toHaveAttribute('href', latestHref);
  await expect(latest).toBeInViewport();
  await expect(carousel).toHaveAttribute('data-renderer', 'liquid', { timeout: 15_000 });
  await expect(page.locator('.card-swap, .global-particle-scene')).toHaveCount(0);

  const canvas = carousel.locator('canvas');
  await expect(canvas).toBeInViewport();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('找不到 Liquid 轮播画布');
  const x = Math.round(box.x + box.width * 0.67);
  const y = Math.round(box.y + box.height / 2);
  const distance = Math.round(Math.min(box.width * 0.63, 310));

  if (testInfo.project.name.startsWith('mobile')) {
    const client = await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (const fraction of [0.16, 0.4, 0.65, 1]) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x - Math.round(distance * fraction), y }],
      });
    }
    // Let the velocity sample expire to exercise snap-to-card without a fling.
    await page.waitForTimeout(120);
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await client.detach();
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - distance, y, { steps: 8 });
    await page.waitForTimeout(120);
    await page.mouse.up();
  }

  await expect(topics).toHaveAttribute('href', '/categories/');
  await expect(topics).toBeInViewport();
  await expect(page).toHaveURL(/\/#interactive-cards$/);

  await topics.press('End');
  await expect(repo).toBeFocused();
  await expect(repo).toHaveAttribute('href', '/repo/');
  await carousel.getByRole('button', { name: '下一张卡片' }).click();
  await expect(latest).toHaveAttribute('href', latestHref);
});

test('常用链接卡片进入独立目录页', async ({ page }) => {
  await useStoredTheme(page);
  await page.route('**/api/links', async (route) => {
    await route.fulfill({
      json: { version: 1, updatedAt: null, groups: [] },
      headers: { 'Cache-Control': 'no-store' },
    });
  });
  await openPage(page, '/#interactive-cards');

  const carousel = page.getByRole('region', { name: '站点入口' });
  await carousel.press('End');
  await carousel.press('ArrowLeft');
  const linksCard = page.getByRole('link', { name: '打开常用链接' });
  await expect(linksCard).toHaveAttribute('href', '/links/');
  await expect(linksCard).toBeInViewport({ ratio: 0.9 });
  await linksCard.click();

  await expect(page).toHaveURL(/\/links\/$/, { timeout: 5_000 });
  await expect(page.getByRole('heading', { name: 'Useful Links' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ready For Your Links' })).toBeVisible();
  await expect(page.locator('.global-particle-scene, .home-ascii-background')).toHaveCount(0);
});

test('常用链接目录从接口读取标题和说明', async ({ page }) => {
  await useStoredTheme(page);
  await page.route('**/api/links', async (route) => {
    await route.fulfill({
      json: {
        version: 1,
        updatedAt: '2026-08-14T00:00:00.000Z',
        groups: [
          {
            id: 'daily-tools',
            title: 'Daily Tools',
            description: 'Services used every day.',
            links: [
              {
                id: 'cloudflare',
                title: 'Cloudflare Dashboard',
                href: 'https://dash.cloudflare.com/',
                label: 'Service',
                description: 'Manage domains and Workers.',
              },
            ],
          },
        ],
      },
    });
  });
  await openPage(page, '/links/');

  await expect(page.getByRole('heading', { name: 'Daily Tools' })).toBeVisible();
  await expect(page.getByText('Services used every day.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Cloudflare Dashboard/ })).toHaveAttribute(
    'href',
    'https://dash.cloudflare.com/',
  );
  await expect(page.getByText('Manage domains and Workers.')).toBeVisible();
});

test('链接管理页能够直接新增说明并保存发布', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), '桌面视口验证完整编辑流程');
  await useStoredTheme(page);
  let savedPayload: unknown = null;
  await page.route(/\/api\/links(?:\/admin)?$/, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/api/links/admin') {
      await route.fulfill({ json: { authorized: true } });
      return;
    }
    if (request.method() === 'PUT') {
      savedPayload = request.postDataJSON();
      await route.fulfill({
        json: { ...(savedPayload as object), updatedAt: '2026-08-14T00:00:00.000Z' },
      });
      return;
    }
    await route.fulfill({ json: { version: 1, updatedAt: null, groups: [] } });
  });
  await openPage(page, '/links/manage/');

  await page.getByRole('button', { name: /Create Your First Group/ }).click();
  await page.getByRole('button', { name: /Add Link To New Collection/ }).click();
  await page.getByLabel('Group Title').fill('Daily Tools');
  await page.getByLabel('Group Description').fill('Services used every day.');
  await page.getByLabel('Title', { exact: true }).fill('Cloudflare Dashboard');
  await page.getByLabel('URL', { exact: true }).fill('https://dash.cloudflare.com/');
  await page.getByLabel('Short Label').fill('Service');
  await page.getByLabel('Description', { exact: true }).fill('Manage domains and Workers.');
  await page.getByRole('button', { name: 'Save Changes' }).click();

  await expect(page.getByText('Saved. The public Links page is now updated.')).toBeVisible();
  expect(savedPayload).toMatchObject({
    version: 1,
    groups: [
      {
        title: 'Daily Tools',
        description: 'Services used every day.',
        links: [
          {
            title: 'Cloudflare Dashboard',
            href: 'https://dash.cloudflare.com/',
            label: 'Service',
            description: 'Manage domains and Workers.',
          },
        ],
      },
    ],
  });
});

test('主题切换保留粒子幕并快速应用新主题', async ({ page }) => {
  await useStoredTheme(page);
  await openPage(page, '/articles/');

  await page.locator('.theme-toggle').click();
  await expect(page.locator('.site-transition--theme')).toBeVisible();
  await expect.poll(() => page.locator('html').getAttribute('data-theme')).toBe('light');
  await expect(page.locator('.site-transition')).toHaveCount(0, { timeout: 1_300 });
  await expect(page.getByRole('heading', { name: 'All Articles' })).toBeVisible();
  await expect(
    page.locator('.global-particle-scene, .home-ascii-background, .dot-grid'),
  ).toHaveCount(0);
});

test('跨页面切换显示粒子幕并到达目标页面', async ({ page }) => {
  await useStoredTheme(page);
  await openPage(page, '/articles/');

  const menu = page.getByRole('button', { name: '切换菜单', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('link', { name: 'Topics' }).click();
  await expect(page.locator('.site-transition--page-out')).toBeVisible();
  await expect(page).toHaveURL(/\/categories\/$/, { timeout: 5_000 });
  await expect(page.getByRole('heading', { name: 'Topics' })).toBeVisible();
  await expect(page.locator('.global-particle-scene, .home-ascii-background')).toHaveCount(0);
});

test('内页的 Sticker Peel Logo 可以返回首页', async ({ page }) => {
  await useStoredTheme(page);
  await page.goto('/categories/', { waitUntil: 'domcontentloaded' });

  const brand = page.getByRole('link', { name: 'Youngkx Blog 首页' });
  await expect(brand).toHaveAttribute('data-sticker-peel', '');
  await brand.click();
  await expect(page).toHaveURL(/\/#top$/, { timeout: 5_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Youngkx Blog' })).toBeInViewport();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(3);
});

test('贴纸 Logo 跟随鼠标和触点从四个方向卷边', async ({ page, context }, testInfo) => {
  await useStoredTheme(page);
  await page.goto('/categories/', { waitUntil: 'domcontentloaded' });
  const brand = page.getByRole('link', { name: 'Youngkx Blog 首页' });
  await expect(brand).toHaveAttribute('data-sticker-peel', '');
  const canvas = brand.locator('canvas');
  const box = await brand.boundingBox();
  if (!box) throw new Error('未找到顶栏 Logo 的位置');
  expect(
    await canvas.evaluate((element: HTMLCanvasElement) => element.width),
  ).toBeGreaterThanOrEqual(Math.round(box.width * 3));

  const touch = testInfo.project.name.startsWith('mobile')
    ? await context.newCDPSession(page)
    : undefined;
  try {
    for (const [x, y] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      const position = {
        x: box.width * (0.5 + 0.32 * x),
        y: box.height * (0.5 + 0.32 * y),
      };
      if (touch) {
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x: box.x + position.x, y: box.y + position.y }],
        });
      } else {
        await brand.hover({ position });
      }
      await expect
        .poll(() =>
          canvas.evaluate((element: HTMLCanvasElement) => {
            const gl = element.getContext('webgl2');
            const program = gl?.getParameter(gl.CURRENT_PROGRAM);
            if (!gl || !program) return null;
            const direction = gl.getUniformLocation(program, 'uDir');
            if (!direction) return null;
            const value = gl.getUniform(program, direction) as Float32Array;
            return Array.from(value, (axis) => (Math.abs(axis) > 0.4 ? Math.sign(axis) : 0));
          }),
        )
        .toEqual([-x, -y]);
      if (touch)
        await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    }
  } finally {
    await touch?.detach();
  }
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

test('首页固定为暗色，并在减少动态效果时使用静态 Logo', async ({ page }) => {
  await useStoredTheme(page, 'light');
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const brand = page.getByRole('link', { name: 'Youngkx Blog 首页' });
  await expect(brand).toHaveAttribute('data-sticker-peel', '');
  const largeLogo = page.locator('.electric-logo');
  await expect(largeLogo).toHaveAttribute('data-electric-logo', '');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(brand.locator('canvas')).toHaveCount(0);
  await expect(largeLogo.locator('canvas')).toHaveCount(0);
  await expect(page.locator('.tech-text canvas')).toBeHidden();

  await expect(page.locator('.theme-toggle')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.home-page')).toHaveCSS('background-color', 'rgb(8, 9, 13)');
  await expect(page.locator('#topics')).toHaveCSS('color', 'rgb(232, 234, 242)');
  await expect(page.locator('.home-lighting, .side-rays, .home-topics-region')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '更多文章', exact: true })).toHaveAttribute(
    'href',
    '/articles/',
  );
  await expect(page.locator('.site-transition')).toHaveCount(0);
  await expect(brand).toBeVisible();
  expect(await brand.evaluate((link) => getComputedStyle(link, '::before').maskImage)).toContain(
    '/youngkx-logo.webp',
  );
  await expect(page.getByRole('heading', { level: 1, name: 'Youngkx Blog' })).toBeInViewport();
  const carousel = page.getByRole('region', { name: '站点入口' });
  await expect(carousel).toHaveAttribute('data-renderer', 'poster');
  await carousel.getByRole('button', { name: '下一张卡片' }).click();
  await expect(carousel.getByRole('link', { name: '浏览文章主题' })).toBeInViewport({
    ratio: 0.9,
  });
  await expect(carousel.locator('.flex-carousel__reel').first()).toHaveCSS(
    'transition-duration',
    '0s',
  );
});

test('Cards 导航越过首屏且手机菜单保持可用', async ({ page }, testInfo) => {
  await useStoredTheme(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('link', { name: 'Youngkx Blog 首页' })).toHaveAttribute(
    'data-sticker-peel',
    '',
  );

  const mobile = testInfo.project.name.startsWith('mobile');
  const menu = page.getByRole('button', { name: '切换菜单' });
  if (mobile) {
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.nav-links')).toHaveClass(/open/);
  }

  const interactiveCardsLink = page.getByRole('link', {
    name: 'Cards',
    exact: true,
  });
  await expect(interactiveCardsLink).toBeVisible();
  await expect(page.getByRole('link', { name: 'Articles', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Topics', exact: true })).toBeVisible();

  if (mobile) {
    const menuBox = await page.locator('.nav-links').boundingBox();
    const viewport = page.viewportSize();
    expect(menuBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(menuBox?.width ?? Infinity).toBeLessThan(260);
    expect(menuBox?.height ?? Infinity).toBeLessThan(240);
    expect((menuBox?.x ?? 0) + (menuBox?.width ?? 0) / 2).toBeGreaterThan(
      (viewport?.width ?? 0) / 2,
    );
    expect((viewport?.width ?? 0) - ((menuBox?.x ?? 0) + (menuBox?.width ?? 0))).toBeLessThan(24);
    expect(menuBox?.y ?? 0).toBeGreaterThan(50);
  }

  await page.evaluate(() => window.scrollTo({ top: 650, behavior: 'instant' }));
  await interactiveCardsLink.click();
  await expect(page).toHaveURL(/#interactive-cards$/);
  if (mobile) {
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.nav-links')).not.toHaveClass(/open/);
  }
  await expect
    .poll(() =>
      page
        .locator('#interactive-cards')
        .evaluate((element) => Math.abs(element.getBoundingClientRect().top)),
    )
    .toBeLessThan(3);
  await expect(page.getByRole('heading', { level: 2, name: 'Cards' })).toBeInViewport();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/#interactive-cards$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Cards' })).toBeInViewport();
  await expect(page.getByRole('region', { name: 'Cards', exact: true })).toBeInViewport();
  await expect
    .poll(() =>
      page
        .locator('#interactive-cards')
        .evaluate((element) => Math.abs(element.getBoundingClientRect().top)),
    )
    .toBeLessThan(3);
});

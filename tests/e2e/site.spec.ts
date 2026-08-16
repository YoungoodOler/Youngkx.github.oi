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
  const transitionTravel = await page.locator('.hero-stage').evaluate((stage) => {
    if (!(stage instanceof HTMLElement)) throw new Error('hero-stage 必须是 HTML 元素');
    return (stage.offsetHeight - window.innerHeight) / window.innerHeight;
  });
  expect(transitionTravel).toBeGreaterThan(2.3);

  const readableScroll = await page.locator('.hero-stage').evaluate((stage) => {
    if (!(stage instanceof HTMLElement)) throw new Error('hero-stage 必须是 HTML 元素');
    const travel = Math.max(1, stage.offsetHeight - window.innerHeight);
    return stage.offsetTop + travel * 0.44;
  });
  await page.evaluate((scrollTop) => window.scrollTo(0, scrollTop), readableScroll);
  await page.waitForTimeout(450);
  for (const selector of [
    '.hero-detail-layer',
    '.hero-copy-intro',
    '.hero-copy-description',
    '.hero-copy-actions',
  ]) {
    await expect
      .poll(() =>
        page.locator(selector).evaluate((element) => Number(getComputedStyle(element).opacity)),
      )
      .toBeGreaterThan(0.98);
  }

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
  await expect(page.locator('.hero-detail-copy')).toContainText('Recording, Learning & Building');
  await expect(page.locator('.hero-quote')).toHaveText('Life is real, life is earnest.');
  await expect(page.locator('.hero-copy-description')).toHaveText(
    'Notes on OI, C / C++, the web, and everyday life.',
  );
  await expect(page.locator('.hero-detail-copy')).toContainText('Explore Posts');
  await expect(page.locator('.hero-detail-copy')).toContainText('Browse Topics');
  await expect(page.getByText('SCROLL TO EXPLORE')).toHaveCount(0);

  const restingTitleBox = await title.boundingBox();
  const detailBox = await page.locator('.hero-detail-layer').boundingBox();
  const viewport = page.viewportSize();
  expect(restingTitleBox).not.toBeNull();
  expect(detailBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(Math.abs((restingTitleBox?.x ?? 0) - (detailBox?.x ?? 0))).toBeLessThan(
    testInfo.project.name.startsWith('mobile') ? 24 : 48,
  );
  expect(restingTitleBox?.width ?? 0).toBeGreaterThan(
    (viewport?.width ?? 0) * (testInfo.project.name.startsWith('mobile') ? 0.5 : 0.3),
  );

  const transitionScroll = await page.locator('.hero-stage').evaluate((stage) => {
    if (!(stage instanceof HTMLElement)) throw new Error('hero-stage 必须是 HTML 元素');
    const travel = Math.max(1, stage.offsetHeight - window.innerHeight);
    return stage.offsetTop + travel * 0.86;
  });
  await page.evaluate((scrollTop) => window.scrollTo(0, scrollTop), transitionScroll);
  await page.waitForTimeout(450);
  await expect(
    page.locator('[data-home-transition="portal"], [data-home-transition="bridge"]'),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      page
        .locator('.signal-deck__grid')
        .evaluate((element) => Number(getComputedStyle(element).opacity)),
    )
    .toBeGreaterThan(0.8);
  await expect
    .poll(() =>
      page.locator('.signal-deck__grid').evaluate((element) => getComputedStyle(element).transform),
    )
    .not.toBe('none');
  await expect
    .poll(() =>
      page.locator('.signal-deck__grid').evaluate((element) => getComputedStyle(element).clipPath),
    )
    .toBe('none');

  const settledScroll = await page.locator('.hero-stage').evaluate((stage) => {
    if (!(stage instanceof HTMLElement)) throw new Error('hero-stage 必须是 HTML 元素');
    const travel = Math.max(1, stage.offsetHeight - window.innerHeight);
    return stage.offsetTop + travel * 0.94;
  });
  await page.evaluate((scrollTop) => window.scrollTo(0, scrollTop), settledScroll);
  await page.waitForTimeout(650);
  await expect
    .poll(() =>
      page
        .locator('.hero-detail-layer')
        .evaluate((element) => Number(getComputedStyle(element).opacity)),
    )
    .toBeLessThan(0.02);
  await expect
    .poll(() =>
      page.locator('.signal-deck').evaluate((element) => Number(getComputedStyle(element).opacity)),
    )
    .toBeGreaterThan(0.5);

  const postTransitionScroll = await page.locator('.hero-stage').evaluate((stage) => {
    if (!(stage instanceof HTMLElement)) throw new Error('hero-stage 必须是 HTML 元素');
    return stage.offsetTop + Math.max(1, stage.offsetHeight - window.innerHeight) + 400;
  });
  await page.evaluate((scrollTop) => window.scrollTo(0, scrollTop), postTransitionScroll);
  await page.waitForTimeout(700);
  await expect
    .poll(() =>
      page.locator('.signal-deck').evaluate((element) => Number(getComputedStyle(element).opacity)),
    )
    .toBeGreaterThan(0.98);
  await expect(page.locator('.signal-card').first()).toBeVisible();
});

test('界面字体变为现代粗体且主页展示标题保持原字体', async ({ page }) => {
  await useStoredTheme(page);
  await openPage(page, '/');

  const fonts = await page.evaluate(() => ({
    navigation: getComputedStyle(document.querySelector('.nav-links')!).fontFamily,
    title: getComputedStyle(document.querySelector('.hero-title-layer h1')!).fontFamily,
  }));

  expect(fonts.navigation).not.toBe(fonts.title);
  expect(fonts.navigation.toLowerCase()).not.toContain('mono');
  expect(fonts.title.toLowerCase()).toContain('georgia');
  await expect(page.locator('.nav-links')).toContainText('Home');
  await expect(page.locator('.nav-links')).not.toContainText('HOME');
});

test('高速下滑会先停留在动态索引卡片页', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), '桌面滚轮回归测试');
  await useStoredTheme(page);
  await openPage(page, '/');

  await page.mouse.wheel(0, 12_000);
  await page.waitForTimeout(900);

  const landing = await page.evaluate(() => {
    const deck = document.querySelector('.signal-deck');
    const articles = document.querySelector('#posts');
    if (!(deck instanceof HTMLElement) || !(articles instanceof HTMLElement)) {
      throw new Error('主页卡片页或文章区不存在');
    }
    const deckRect = deck.getBoundingClientRect();
    const articlesRect = articles.getBoundingClientRect();
    return {
      deckTop: deckRect.top,
      deckBottom: deckRect.bottom,
      articlesTop: articlesRect.top,
      viewportHeight: window.innerHeight,
    };
  });

  expect(landing.deckTop).toBeGreaterThanOrEqual(70);
  expect(landing.deckTop).toBeLessThan(120);
  expect(landing.deckBottom).toBeGreaterThan(landing.viewportHeight * 0.7);
  expect(landing.articlesTop).toBeGreaterThan(landing.viewportHeight * 0.85);
  await expect(page.locator('.signal-card')).toHaveCount(4);
  await expect(page.locator('.signal-card').first()).toBeVisible();
});

test('主页动态索引卡片支持鼠标景深并保持移动端布局', async ({ page }, testInfo) => {
  await useStoredTheme(page);
  await openPage(page, '/');

  const deck = page.locator('.signal-deck');
  const cards = deck.locator('.signal-card');
  await deck.scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);

  await expect(cards).toHaveCount(4);
  await expect(cards.first()).toBeVisible();
  await expect(
    deck.getByRole('heading', { name: 'Explore the archive through motion.' }),
  ).toBeVisible();
  await expect(deck).not.toContainText('移动鼠标');
  await expect(deck).not.toContainText('CURSOR REACTIVE');
  await expect(page.locator('.signal-deck__heading > p, .section-heading > p')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Articles', exact: true })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Topics', exact: true })).toHaveCount(1);
  await expect(deck.getByRole('link', { name: /打开最新文章/ })).toHaveAttribute('href', /\/$/);
  await expect(deck.getByRole('link', { name: '浏览文章主题' })).toHaveAttribute(
    'href',
    '/categories/',
  );
  await expect(deck.getByRole('link', { name: '打开常用链接' })).toHaveAttribute('href', '/links/');

  const grid = deck.locator('.signal-deck__grid');
  const readGridSurface = () =>
    grid.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        clipPath: style.clipPath,
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        borderWidths: [
          style.borderTopWidth,
          style.borderRightWidth,
          style.borderBottomWidth,
          style.borderLeftWidth,
        ],
        boxShadow: style.boxShadow,
      };
    });
  const expectClearGridSurface = async () => {
    const surface = await readGridSurface();
    expect(surface.overflowX).toBe('visible');
    expect(surface.overflowY).toBe('visible');
    expect(surface.clipPath).toBe('none');
    expect(surface.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(surface.backgroundImage).toBe('none');
    expect(surface.borderWidths).toEqual(['0px', '0px', '0px', '0px']);
    expect(surface.boxShadow).toBe('none');
  };

  await expectClearGridSurface();
  await page.locator('.theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expectClearGridSurface();

  if (testInfo.project.name.startsWith('mobile')) {
    const layout = await cards.evaluateAll((elements) => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      boxes: elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      }),
    }));
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    for (const box of layout.boxes) {
      expect(box.left).toBeGreaterThanOrEqual(14);
      expect(box.right).toBeLessThanOrEqual(layout.viewportWidth - 14);
      expect(box.width).toBeGreaterThan(300);
    }
    return;
  }

  const leadCard = deck.locator('.signal-card--lead');
  const box = await leadCard.boundingBox();
  const gridBox = await grid.boundingBox();
  expect(box).not.toBeNull();
  expect(gridBox).not.toBeNull();
  const initialTransform = await leadCard.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  await page.mouse.move((box?.x ?? 0) + (box?.width ?? 0) * 0.82, (box?.y ?? 0) + 90);
  await expect
    .poll(() => leadCard.evaluate((element) => getComputedStyle(element).transform))
    .not.toBe(initialTransform);
  await expect
    .poll(() =>
      leadCard
        .locator('.signal-card__glare')
        .evaluate((element) => getComputedStyle(element).backgroundImage),
    )
    .toContain('radial-gradient');

  const liftedBox = await leadCard.boundingBox();
  expect(liftedBox).not.toBeNull();
  expect(liftedBox?.y ?? 0).toBeLessThan((gridBox?.y ?? 0) - 1);
});

test('常用链接卡片进入独立目录页', async ({ page }) => {
  await useStoredTheme(page);
  await page.route('**/api/links', async (route) => {
    await route.fulfill({
      json: { version: 1, updatedAt: null, groups: [] },
      headers: { 'Cache-Control': 'no-store' },
    });
  });
  await openPage(page, '/');

  const linksCard = page.locator('.signal-card--portal a');
  await linksCard.scrollIntoViewIfNeeded();
  await expect(linksCard).toHaveAttribute('href', '/links/');
  await linksCard.click();

  await expect(page).toHaveURL(/\/links\/$/, { timeout: 5_000 });
  await expect(page.getByRole('heading', { name: 'Useful Links' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ready For Your Links' })).toBeVisible();
  await expect(page.locator('.scene canvas')).toBeVisible();
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
  await expect(page.locator('.scene canvas')).toBeVisible();
});

test('跨页面切换显示粒子幕并到达目标页面', async ({ page }) => {
  await useStoredTheme(page);
  await openPage(page, '/articles/');

  await page.getByRole('link', { name: 'Topics' }).click();
  await expect(page.locator('.site-transition--page-out')).toBeVisible();
  await expect(page).toHaveURL(/\/categories\/$/, { timeout: 5_000 });
  await expect(page.getByRole('heading', { name: 'Topics' })).toBeVisible();
  await expect(page.locator('.scene canvas')).toBeVisible();
});

test('从内页返回首页后重新同步星球滚动坐标', async ({ page }) => {
  await useStoredTheme(page);
  await openPage(page, '/');

  const progress = 0.58;
  const assertHeroCoordinates = async () => {
    const travel = await page.locator('.hero-stage').evaluate((stage) => {
      if (!(stage instanceof HTMLElement)) throw new Error('hero-stage 必须是 HTML 元素');
      return Math.max(1, stage.offsetHeight - window.innerHeight);
    });
    await page.evaluate((scrollTop) => window.scrollTo(0, scrollTop), travel * progress);
    await page.waitForTimeout(150);
    const measuredTravel = Number(
      await page.locator('.scene').getAttribute('data-hero-scroll-travel'),
    );
    expect(Math.abs(measuredTravel - travel)).toBeLessThan(2);
  };

  await assertHeroCoordinates();
  await page.locator('.signal-card--topics a').click();
  await expect(page).toHaveURL(/\/categories\/$/, { timeout: 5_000 });
  await expect(page.locator('.site-transition')).toHaveCount(0, { timeout: 1_300 });
  await page.locator('.brand').click();
  await expect(page).toHaveURL(/\/#top$/, { timeout: 5_000 });
  await expect(page.locator('.scene')).toHaveAttribute('data-subject-layout', 'synced');
  await assertHeroCoordinates();
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
  await page.locator('.signal-deck').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-home-transition="portal"]')).toHaveCount(0);
  await expect(page.locator('[data-home-transition="bridge"]')).toHaveCount(0);
  await expect
    .poll(() =>
      page.locator('.signal-deck').evaluate((element) => Number(getComputedStyle(element).opacity)),
    )
    .toBeGreaterThan(0.98);
  await expect
    .poll(() =>
      page
        .locator('.signal-card')
        .first()
        .evaluate((element) => getComputedStyle(element).transform),
    )
    .toBe('none');
});

test('手机导航能够展开并访问主要入口', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), '仅在手机视口验证');
  await useStoredTheme(page);
  await openPage(page, '/');

  const menu = page.getByRole('button', { name: '切换菜单' });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.nav-links')).toHaveClass(/open/);
  await expect(page.getByRole('link', { name: 'Articles', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Topics', exact: true })).toBeVisible();

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

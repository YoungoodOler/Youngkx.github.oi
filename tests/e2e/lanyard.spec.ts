import { expect, test, type Page } from '@playwright/test';

async function openHomePass(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const card = page.locator('.lanyard-card-target');
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.lanyard-content')).toHaveJSProperty('inert', false);
  await expect(card).toBeInViewport({ ratio: 1 });
  const viewport = page.viewportSize();
  const canvas = await page.locator('.lanyard-canvas').boundingBox();
  const before = await card.boundingBox();
  if (!viewport || !canvas || !before) throw new Error('未取得证件或画布尺寸');
  return { card, canvas, before, viewport };
}

for (const control of ['移动挂绳顶端', '翻转 Youngkx 名片']) {
  test(`「${control}」可下拉证件越过首屏底边`, async ({ page }) => {
    const { card, canvas, before, viewport } = await openHomePass(page);
    await expect(page.locator('#interactive-cards .lanyard')).toHaveCount(0);
    expect(before.x + before.width / 2).toBeGreaterThan(viewport.width * 0.7);
    expect(before.height).toBeGreaterThan(viewport.width <= 560 ? 120 : 220);

    const grip = await page.getByRole('button', { name: control }).boundingBox();
    if (!grip) throw new Error('未取得证件拖动起点');
    const x = grip.x + grip.width / 2;
    await page.mouse.move(x, grip.y + grip.height / 2);
    await page.mouse.down();
    try {
      await page.mouse.move(x - 20, canvas.y + canvas.height - 5, { steps: 12 });
      await expect
        .poll(() => card.evaluate((element) => element.getBoundingClientRect().bottom))
        .toBeGreaterThan(canvas.y + canvas.height + 24);
    } finally {
      await page.mouse.up();
    }

    if (control === '移动挂绳顶端') {
      await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'instant' }));
      await expect(card).toBeInViewport({ ratio: 0.8 });
    }
  });
}

test('证件可横跨首页并在页面两侧停住', async ({ page }) => {
  const { card, canvas, before } = await openHomePass(page);
  const pageWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(canvas.x).toBe(0);
  expect(canvas.width).toBe(pageWidth);
  const y = before.y + before.height / 2;

  await page.mouse.move(before.x + before.width / 2, y);
  await page.mouse.down();
  try {
    await page.mouse.move(1, y, { steps: 14 });
    await expect
      .poll(() => card.evaluate((element) => Math.abs(element.getBoundingClientRect().left)))
      .toBeLessThan(12);
    expect(
      await card.evaluate((element) => element.getBoundingClientRect().left),
    ).toBeGreaterThanOrEqual(-1);

    await page.mouse.move(pageWidth - 1, y, { steps: 16 });
    await expect
      .poll(() =>
        card.evaluate(
          (element, edge) => Math.abs(edge - element.getBoundingClientRect().right),
          pageWidth,
        ),
      )
      .toBeLessThan(12);
    expect(
      await card.evaluate((element) => element.getBoundingClientRect().right),
    ).toBeLessThanOrEqual(pageWidth + 1);
  } finally {
    await page.mouse.up();
  }
});

import { expect, test } from '@playwright/test';

type Point = { x: number; y: number };

declare global {
  interface Window {
    techTextPaint: {
      glyphs: Record<string, Point>;
      outlines: Record<string, Point>;
      frameLeft: number;
      framePositions: number[];
    };
  }
}

test('首页字母可拖离标题并回弹，选框在字母之间平移', async ({ page, context }, testInfo) => {
  await page.addInitScript(() => {
    const paint = { glyphs: {}, outlines: {}, frameLeft: 0, framePositions: [] };
    window.techTextPaint = paint;
    const ctx = CanvasRenderingContext2D.prototype;
    const { clearRect, fillText, strokeText, strokeRect } = ctx;
    const isTitle = (canvas: HTMLCanvasElement) => canvas.parentElement?.id === 'home-title';
    ctx.clearRect = function (...args) {
      if (isTitle(this.canvas)) paint.outlines = {};
      clearRect.apply(this, args);
    };
    ctx.fillText = function (...args) {
      if (isTitle(this.canvas) && (args[0] === 'Y' || args[0] === 'B')) {
        window.techTextPaint.glyphs[args[0]] = { x: args[1], y: args[2] };
      }
      fillText.apply(this, args);
    };
    ctx.strokeText = function (...args) {
      if (isTitle(this.canvas) && args[0] === 'B') {
        window.techTextPaint.outlines.B = { x: args[1], y: args[2] };
      }
      strokeText.apply(this, args);
    };
    ctx.strokeRect = function (...args) {
      if (isTitle(this.canvas)) {
        window.techTextPaint.frameLeft = args[0];
        const positions = window.techTextPaint.framePositions;
        positions.push(args[0]);
        if (positions.length > 160) positions.shift();
      }
      strokeRect.apply(this, args);
    };
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const title = page.getByRole('heading', { name: 'Youngkx Blog', exact: true });
  const sample = () => page.evaluate(() => window.techTextPaint);
  await expect.poll(async () => (await sample()).frameLeft).toBeGreaterThan(0);
  const box = await title.boundingBox();
  if (!box) throw new Error('未找到首页标题');
  const { Y: first, B: original } = (await sample()).glyphs;
  const point = (glyph: Point) => ({ x: box.x + glyph.x + 7, y: box.y + glyph.y - 18 });
  const start = point(original);
  const destination = { x: start.x - 45, y: start.y + 96 };
  const mobile = testInfo.project.name.startsWith('mobile');

  if (!mobile) {
    const left = point(first);
    await page.mouse.move(left.x, left.y);
    await expect.poll(async () => Math.abs((await sample()).frameLeft - first.x)).toBeLessThan(14);
    const from = (await sample()).frameLeft;
    await page.evaluate(() => {
      window.techTextPaint.framePositions = [];
    });
    await page.mouse.move(start.x, start.y);
    await expect
      .poll(async () => Math.abs((await sample()).frameLeft - original.x))
      .toBeLessThan(14);
    const { framePositions, frameLeft } = await sample();
    expect(framePositions.some((x) => x > from + 10 && x < frameLeft - 10)).toBe(true);
    await page.mouse.down();
    await page.mouse.move(destination.x, destination.y, { steps: 6 });
  }

  const touch = mobile ? await context.newCDPSession(page) : undefined;
  if (touch) {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [destination] });
  }
  try {
    await expect.poll(async () => (await sample()).glyphs.B.y - original.y).toBeGreaterThan(85);
    await expect.poll(async () => (await sample()).outlines.B?.y).toBe(original.y);
    await expect(title).toHaveCSS('cursor', 'grabbing');
  } finally {
    if (touch) {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await touch.detach();
    } else {
      await page.mouse.up();
    }
  }
  await expect.poll(async () => Math.abs((await sample()).glyphs.B.y - original.y)).toBeLessThan(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(title.locator('canvas')).toBeHidden();
  await expect(title.locator('span')).toHaveCSS('opacity', '1');
});

import { expect, test } from '@playwright/test';

for (const theme of ['dark', 'light'] as const) {
  test(`Markdown 代码高亮在 ${theme} 主题下保留颜色和复制内容`, async ({ page }, testInfo) => {
    await page.addInitScript((storedTheme) => {
      localStorage.setItem('youngkx-theme', storedTheme);
    }, theme);
    await page.goto('/2026/11/03/greedy-algorithm/');

    const block = page
      .locator('figure.code-block-shell')
      .filter({ has: page.locator('code.hljs') })
      .first();
    const code = block.locator('code');
    await expect(block.locator('.code-language')).toHaveText('C++');
    await expect(code.locator('.hljs-keyword').first()).toBeVisible();
    const colors = await code.evaluate((element) => ({
      base: getComputedStyle(element).color,
      keyword: getComputedStyle(element.querySelector('.hljs-keyword')!).color,
      string: getComputedStyle(element.querySelector('.hljs-string')!).color,
    }));
    expect(new Set(Object.values(colors)).size).toBe(3);
    await expect(page.locator('code.language-text span')).toHaveCount(0);

    const source = (await code.textContent())!.replace(/\n+$/, '');
    await block.locator('.code-copy').click();
    await expect(block.locator('.code-copy')).toContainText('已复制');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied.replace(/\r\n/g, '\n')).toBe(source);
    await block.screenshot({ path: testInfo.outputPath(`code-${theme}.png`) });
  });
}

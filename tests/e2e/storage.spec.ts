import { expect, test } from '@playwright/test';

test('浏览器禁用存储时仍可切换主题及使用链接管理', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    for (const key of ['localStorage', 'sessionStorage']) {
      Object.defineProperty(window, key, {
        get() {
          throw new DOMException('Storage blocked', 'SecurityError');
        },
      });
    }
  });
  await page.route('**/api/links', (route) =>
    route.fulfill({
      json: { version: 1, updatedAt: null, groups: [] },
    }),
  );
  await page.route('**/api/links/admin', (route) =>
    route.fulfill({
      status: route.request().headers().authorization === 'Bearer fixture-token' ? 200 : 401,
      json: {},
    }),
  );
  await page.goto('/links/manage/');
  const toggle = page.locator('.theme-toggle');
  await expect(toggle.locator('.theme-label')).toHaveText('Light');
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByLabel('Admin Token').fill('fixture-token');
  await page.getByRole('button', { name: 'Unlock Manager' }).click();
  await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
  await expect(page.locator('.manager-notice')).toHaveText(
    'Manager unlocked for this browser tab.',
  );
  expect(errors).toEqual([]);
});

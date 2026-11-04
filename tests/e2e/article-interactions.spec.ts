import { expect, test } from '@playwright/test';

const article = '/2026/07/26/how-to-use-codex/';
const query = new URLSearchParams({ article }).toString();

test('访客可以点赞、自定义用户名评论并回复，刷新后仍保留', async ({
  page,
  browser,
  request,
}, testInfo) => {
  test.setTimeout(60_000);
  const username = `读者-${testInfo.project.name}-${Date.now()}`.slice(0, 32);
  const text = `这是一条公开评论 <img src=x onerror=alert(1)> ${Date.now()}`;
  const replyName = `回复者-${testInfo.project.name}`.slice(0, 32);
  const replyText = `感谢分享，这是一条回复 ${Date.now()}`;
  let commentId: number | undefined;
  let liked = false;
  const visitor = await browser.newContext({
    viewport: page.viewportSize()!,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    reducedMotion: 'reduce',
  });
  try {
    await page.addInitScript(() => {
      localStorage.setItem('youngkx-theme', 'dark');
    });
    await page.goto(article, { waitUntil: 'domcontentloaded' });
    const like = page.getByRole('button', { name: '点赞文章', exact: true });
    await expect(like).toBeEnabled();
    const initial = Number(await page.locator('.article-like-count').textContent());
    await like.click();
    liked = true;
    await expect(page.getByRole('button', { name: '取消点赞', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('.article-like-count')).toHaveText(String(initial + 1));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: '取消点赞', exact: true })).toBeEnabled();
    await expect(page.locator('.article-like-count')).toHaveText(String(initial + 1));
    await page.locator('#comment-nickname').fill(username);
    await page.getByLabel('评论内容', { exact: true }).fill(text);
    const publication = page.waitForResponse(
      (response) =>
        response.url().includes('/api/articles/comments?') &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: '发布评论' }).click();
    const published = await publication;
    expect(published.status()).toBe(201);
    commentId = (await published.json()).comment.id;
    await expect(page.getByText('评论已发布，感谢分享你的想法。')).toBeVisible();
    await expect(
      page
        .locator('.article-comment-thread')
        .filter({ hasText: text })
        .locator('.article-comment-body > p')
        .first(),
    ).toHaveText(text);
    await expect(page.locator('.article-comment-list img')).toHaveCount(0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText(username, { exact: true })).toBeVisible();
    await expect(page.locator('#comment-nickname')).toHaveValue(username);

    await visitor.addInitScript(() => {
      localStorage.setItem('youngkx-theme', 'dark');
    });
    const replyPage = await visitor.newPage();
    await replyPage.goto(article, { waitUntil: 'domcontentloaded' });
    await replyPage.getByRole('button', { name: `回复 ${username}`, exact: true }).click();
    const replyForm = replyPage.locator('.article-reply-form');
    await replyForm.getByLabel('用户名', { exact: false }).fill(replyName);
    await replyForm.getByLabel('回复内容', { exact: true }).fill(replyText);
    await replyForm.getByRole('button', { name: '发布回复' }).click();
    await expect(replyPage.getByText('回复已发布。', { exact: true })).toBeVisible();
    await expect(replyPage.locator('.article-reply-list')).toContainText(replyName);
    await expect(replyPage.locator('.article-reply-list')).toContainText(replyText);
    await replyPage.reload({ waitUntil: 'domcontentloaded' });
    const thread = replyPage.locator('.article-comment-thread').filter({ hasText: text });
    await thread.getByRole('button', { name: '查看 1 条回复', exact: true }).click();
    await expect(thread.locator('.article-reply-list')).toContainText(replyText);
    await expect(replyPage.getByRole('button', { name: '点赞文章', exact: true })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await thread.getByRole('button', { name: `回复 ${replyName}`, exact: true }).click();
    await expect(thread.locator('.article-reply-form')).toContainText(`回复 @${replyName}`);
    await thread.getByRole('button', { name: '取消回复', exact: true }).click();

    const interactions = replyPage.locator('.article-interactions');
    await interactions.screenshot({ path: testInfo.outputPath('interactions-dark.png') });
    await replyPage.locator('.theme-toggle').click();
    await expect(replyPage.locator('html')).toHaveAttribute('data-theme', 'light');
    await interactions.screenshot({ path: testInfo.outputPath('interactions-light.png') });
    expect(
      await replyPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(1);
    await page.getByRole('button', { name: '取消点赞', exact: true }).click();
    liked = false;
    await expect(page.locator('.article-like-count')).toHaveText(String(initial));
  } finally {
    if (liked) await page.request.put(`/api/articles/like?${query}`, { data: { liked: false } });
    if (commentId) await request.delete(`/api/articles/comments/${commentId}?${query}`);
    await visitor.close();
  }
});

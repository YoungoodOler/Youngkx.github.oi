import { expect, test } from '@playwright/test';
import type { ArticleComment } from '../../lib/article-interactions';

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

test('评论与回复发送和分页后保持先后顺序，管理员可确认删除并退出管理', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  const token = 'comment-moderation-browser-test';
  let expired = false;
  let records: ArticleComment[] = Array.from({ length: 25 }, (_, index) => ({
    id: index + 1,
    nickname: `访客${index + 1}`,
    content: `评论${index + 1}`,
    createdAt: '2026-11-04T06:00:00.000Z',
    parentId: null,
    replyToId: null,
    replyTo: null,
    replyCount: 0,
  }));
  records.push(
    ...Array.from({ length: 25 }, (_, index) => ({
      id: index + 101,
      nickname: `回复者${index + 1}`,
      content: `回复${index + 1}`,
      createdAt: '2026-11-04T06:01:00.000Z',
      parentId: 1,
      replyToId: index === 1 ? 101 : 1,
      replyTo: index === 1 ? '回复者1' : '访客1',
      replyCount: 0,
    })),
  );
  const withCounts = (record: ArticleComment) => ({
    ...record,
    replyCount: records.filter((item) => item.parentId === record.id).length,
  });
  const pageOf = (parent: number | null, after: number) => {
    const all = records
      .filter((item) => item.parentId === parent && item.id > after)
      .sort((left, right) => left.id - right.id);
    const items = all.slice(0, 20).map(withCounts);
    return { items, nextCursor: all.length > 20 ? items.at(-1)!.id : null };
  };
  await page.route('**/api/articles/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const authorized = req.headers().authorization === `Bearer ${token}` && !expired;
    if (url.pathname.endsWith('/admin')) {
      await route.fulfill(
        authorized
          ? { json: { authorized: true } }
          : { status: 401, json: { error: '管理口令不正确，请重新输入。' } },
      );
    } else if (url.pathname.endsWith('/interactions')) {
      const result = pageOf(null, Number(url.searchParams.get('after') ?? 0));
      await route.fulfill({
        json: {
          likes: 0,
          liked: false,
          commentCount: records.length,
          comments: result.items,
          nextCursor: result.nextCursor,
        },
      });
    } else if (url.pathname.endsWith('/replies')) {
      const result = pageOf(
        Number(url.searchParams.get('parent')),
        Number(url.searchParams.get('after') ?? 0),
      );
      await route.fulfill({ json: { replies: result.items, nextCursor: result.nextCursor } });
    } else if (req.method() === 'POST') {
      const input = req.postDataJSON();
      const target = records.find((item) => item.id === input.replyToId);
      const comment: ArticleComment = {
        id: target ? 2000 : 1000,
        nickname: input.nickname || '匿名访客',
        content: input.content,
        createdAt: '2026-11-04T07:00:00.000Z',
        parentId: target ? (target.parentId ?? target.id) : null,
        replyToId: target?.id ?? null,
        replyTo: target?.nickname ?? null,
        replyCount: 0,
      };
      records.push(comment);
      await route.fulfill({
        status: 201,
        json: {
          comment,
          commentCount: records.length,
          parentReplyCount:
            comment.parentId === null
              ? null
              : records.filter((item) => item.parentId === comment.parentId).length,
        },
      });
    } else if (req.method() === 'DELETE') {
      if (!authorized) {
        await route.fulfill({ status: 401, json: { error: '管理口令已失效。' } });
        return;
      }
      const id = Number(url.pathname.split('/').at(-1));
      const removed = records.find((item) => item.id === id)!;
      records = records
        .filter((item) => item.id !== id && item.parentId !== id)
        .map((item) =>
          item.replyToId === id ? { ...item, replyToId: null, replyTo: null } : item,
        );
      await route.fulfill({
        json: {
          deleted: true,
          commentCount: records.length,
          parentId: removed.parentId,
          parentReplyCount:
            removed.parentId === null
              ? null
              : records.filter((item) => item.parentId === removed.parentId).length,
        },
      });
    } else await route.continue();
  });
  await page.addInitScript(() => {
    localStorage.setItem('youngkx-theme', 'dark');
  });
  await page.goto(article, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: '点赞文章', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: /^删除(?:评论|回复) / })).toHaveCount(0);
  await page.locator('#comment-content').fill('最后发的评论');
  await page.getByRole('button', { name: '发布评论', exact: false }).click();
  await expect(page.locator('.article-comment-thread').last()).toHaveAttribute(
    'data-comment-id',
    '1000',
  );
  await page.getByRole('button', { name: '加载更多评论 ↓', exact: true }).click();
  const rootIds = () =>
    page
      .locator('.article-comment-thread')
      .evaluateAll((elements) =>
        elements.map((element) => Number(element.getAttribute('data-comment-id'))),
      );
  expect(await rootIds()).toEqual([...Array.from({ length: 25 }, (_, index) => index + 1), 1000]);

  const thread = page.locator('.article-comment-thread[data-comment-id="1"]');
  await thread.getByRole('button', { name: '查看 25 条回复', exact: true }).click();
  await expect(thread.locator('.article-reply-list > li[data-comment-id]')).toHaveCount(20);
  await thread.getByRole('button', { name: '回复 访客1', exact: true }).click();
  await thread.getByLabel('回复内容', { exact: true }).fill('最后发的回复');
  await thread.getByRole('button', { name: '发布回复', exact: false }).click();
  await expect(thread.locator('.article-reply-list > li[data-comment-id]').last()).toHaveAttribute(
    'data-comment-id',
    '2000',
  );
  await thread.getByRole('button', { name: '加载更多回复 ↓', exact: true }).click();
  const replyIds = () =>
    thread
      .locator('.article-reply-list > li[data-comment-id]')
      .evaluateAll((elements) =>
        elements.map((element) => Number(element.getAttribute('data-comment-id'))),
      );
  expect(await replyIds()).toEqual([
    ...Array.from({ length: 25 }, (_, index) => index + 101),
    2000,
  ]);

  await page.getByRole('button', { name: '管理评论', exact: true }).click();
  await page.getByLabel('管理口令', { exact: true }).fill('wrong-token');
  await page.getByRole('button', { name: '解锁管理', exact: true }).click();
  await expect(page.locator('.comment-moderation-form')).toContainText('管理口令不正确');
  await expect(page.getByRole('button', { name: /^删除(?:评论|回复) / })).toHaveCount(0);
  await page.getByLabel('管理口令', { exact: true }).fill(token);
  await page.getByRole('button', { name: '解锁管理', exact: true }).click();
  await expect(page.getByRole('button', { name: '退出管理', exact: true })).toBeVisible();
  const firstReply = thread.locator('.article-reply-list > li[data-comment-id="101"]');
  await firstReply.getByRole('button', { name: '删除回复 101', exact: true }).click();
  await firstReply.getByRole('button', { name: '取消', exact: true }).click();
  await expect(firstReply).toBeVisible();
  await firstReply.getByRole('button', { name: '删除回复 101', exact: true }).click();
  await firstReply.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(firstReply).toHaveCount(0);
  await expect(thread.locator('[data-comment-id="102"] .article-reply-to')).toHaveCount(0);
  await thread.getByRole('button', { name: '删除评论 1', exact: true }).click();
  await expect(thread.getByRole('group', { name: '确认删除' })).toContainText('及其 25 条回复');
  await thread.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(thread).toHaveCount(0);
  await expect(page.locator('#article-comments-title')).toHaveText('评论 25');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: '退出管理', exact: true })).toBeVisible();
  await expect(page.locator('.article-comment-thread').first()).toHaveAttribute(
    'data-comment-id',
    '2',
  );
  await expect(page.locator('.article-comment-thread[data-comment-id="1"]')).toHaveCount(0);
  await page.locator('.theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const second = page.locator('.article-comment-thread[data-comment-id="2"]');
  await second.getByRole('button', { name: '删除评论 2', exact: true }).click();
  await second
    .getByRole('group', { name: '确认删除' })
    .screenshot({ path: testInfo.outputPath('delete-confirmation-light.png') });
  expired = true;
  await second.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(
    page.getByText('管理凭证已失效，请点击“管理评论”重新解锁。', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /^删除(?:评论|回复) / })).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem('youngkx-links-token'))).toBeNull();
  expired = false;
  await page.getByRole('button', { name: '管理评论', exact: true }).click();
  await page.getByLabel('管理口令', { exact: true }).fill(token);
  await page.getByRole('button', { name: '解锁管理', exact: true }).click();
  await page.getByRole('button', { name: '退出管理', exact: true }).click();
  await expect(page.getByRole('button', { name: /^删除(?:评论|回复) / })).toHaveCount(0);
});

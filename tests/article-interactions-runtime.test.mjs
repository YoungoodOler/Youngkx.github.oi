import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestHarness } from 'wrangler';

const article = '/2026/11/04/first/';
const otherArticle = '/2026/11/04/second/';
const origin = 'https://www.youngkx.cn';
const adminToken = 'isolated-interactions-test-token';
let db;
const server = createTestHarness({
  workers: [
    {
      config: {
        name: 'article-interactions-test',
        main: path.resolve('cloudflare/worker.ts'),
        compatibility_date: '2026-08-03',
        compatibility_flags: ['nodejs_compat'],
        vars: { LINKS_ADMIN_TOKEN: adminToken },
        assets: { directory: path.resolve('tests/fixtures/article-assets'), binding: 'ASSETS' },
        d1_databases: [
          {
            binding: 'ARTICLE_INTERACTIONS',
            database_name: 'article-interactions-test',
            database_id: 'article-interactions-test',
            migrations_dir: path.resolve('cloudflare/migrations'),
          },
        ],
      },
    },
  ],
});

beforeAll(async () => {
  await server.listen();
  await server.getWorker().applyD1Migrations('ARTICLE_INTERACTIONS');
  db = (await server.getWorker().getEnv()).ARTICLE_INTERACTIONS;
}, 30_000);
afterAll(async () => {
  await server.close();
}, 30_000);
beforeEach(async () => {
  await db.batch([
    db.prepare('DELETE FROM article_comments'),
    db.prepare('DELETE FROM article_likes'),
    db.prepare('DELETE FROM article_rate_limits'),
  ]);
});

function endpoint(route, selected = article, extra = {}) {
  return `${origin}/api/articles/${route}?${new URLSearchParams({ article: selected, ...extra })}`;
}
async function visitor() {
  const response = await server.fetch(endpoint('interactions'));
  expect(response.status).toBe(200);
  return response.headers.get('set-cookie').split(';')[0];
}
function send(route, cookie, body, selected = article, headers = {}) {
  return server.fetch(endpoint(route, selected), {
    method: route === 'like' ? 'PUT' : 'POST',
    headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}
const commentInput = (content = '这篇文章很有帮助。', extra = {}) => ({
  content,
  requestId: randomUUID(),
  ...extra,
});
async function post(cookie, input, selected = article) {
  const response = await send('comments', cookie, input, selected);
  expect(response.status).toBe(201);
  return response.json();
}
async function snapshot(cookie, selected = article, extra = {}) {
  const response = await server.fetch(endpoint('interactions', selected, extra), {
    headers: { Cookie: cookie },
  });
  expect(response.status).toBe(200);
  return response.json();
}

describe('article interactions in the actual Workers and D1 runtime', () => {
  it('creates an anonymous HttpOnly identity and returns uncached empty public data', async () => {
    const response = await server.fetch(endpoint('interactions'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    // The local Workers harness terminates HTTPS before dispatching to the Worker.
    expect(response.headers.get('set-cookie')).toContain('HttpOnly; SameSite=Lax');
    expect(response.headers.get('set-cookie')).toContain('Path=/api/articles');
    expect(await response.json()).toEqual({
      likes: 0,
      liked: false,
      commentCount: 0,
      comments: [],
      nextCursor: null,
    });
  });

  it('keeps concurrent visitor likes, deduplicates repeated likes, and permits cancellation per article', async () => {
    const visitors = await Promise.all(Array.from({ length: 12 }, () => visitor()));
    const results = await Promise.all(
      visitors.map((cookie) => send('like', cookie, { liked: true })),
    );
    expect(results.every((response) => response.status === 200)).toBe(true);
    expect(await snapshot(visitors[0])).toMatchObject({ likes: 12, liked: true });
    expect((await (await send('like', visitors[0], { liked: true })).json()).likes).toBe(12);
    expect((await send('like', visitors[0], { liked: false })).status).toBe(200);
    expect(await snapshot(visitors[0])).toMatchObject({ likes: 11, liked: false });
    expect(await snapshot(visitors[1])).toMatchObject({ likes: 11, liked: true });
    expect(await snapshot(visitors[0], otherArticle)).toMatchObject({ likes: 0, liked: false });
  });

  it('publishes without login, accepts a chosen username, and deduplicates retries', async () => {
    const cookie = await visitor();
    const input = commentInput('第一行\n<img src=x onerror=alert(1)>');
    const published = await post(cookie, input);
    expect(published.comment).toMatchObject({
      nickname: '匿名访客',
      content: input.content,
      parentId: null,
      replyCount: 0,
    });
    expect(Object.keys(published.comment)).toEqual(
      expect.not.arrayContaining(['visitor_id', 'request_id', 'ip']),
    );
    const retry = await send('comments', cookie, input);
    expect(retry.status).toBe(200);
    expect((await retry.json()).comment.id).toBe(published.comment.id);
    const other = await visitor();
    const named = await post(other, commentInput('新的留言', { nickname: '自定义用户名' }));
    const data = await snapshot(await visitor());
    expect(data.commentCount).toBe(2);
    expect(data.comments.map((item) => item.nickname)).toEqual(['匿名访客', '自定义用户名']);
    expect(named.comment.nickname).toBe('自定义用户名');
    expect((await snapshot(cookie, otherArticle)).comments).toEqual([]);
  });

  it('groups replies and replies to replies under the original comment with their chosen names', async () => {
    const root = await post(await visitor(), commentInput('根评论', { nickname: '读者甲' }));
    const reply = await post(
      await visitor(),
      commentInput('回复甲', { nickname: '读者乙', replyToId: root.comment.id }),
    );
    expect(reply).toMatchObject({
      commentCount: 2,
      parentReplyCount: 1,
      comment: { parentId: root.comment.id, replyTo: '读者甲', nickname: '读者乙' },
    });
    const nested = await post(
      await visitor(),
      commentInput('继续讨论', { nickname: '读者丙', replyToId: reply.comment.id }),
    );
    expect(nested.comment).toMatchObject({ parentId: root.comment.id, replyTo: '读者乙' });
    const data = await snapshot(await visitor());
    expect(data.comments).toHaveLength(1);
    expect(data.comments[0].replyCount).toBe(2);
    expect(data.commentCount).toBe(3);
    const replies = await server.fetch(
      endpoint('replies', article, { parent: String(root.comment.id) }),
    );
    expect(replies.status).toBe(200);
    expect((await replies.json()).replies.map((item) => item.nickname)).toEqual([
      '读者乙',
      '读者丙',
    ]);
    const invalid = await send(
      'comments',
      await visitor(),
      commentInput('跨文章回复', { replyToId: root.comment.id }),
      otherArticle,
    );
    expect(invalid.status).toBe(404);
  });

  it('rejects empty, oversized, malformed, spam and cross-site submissions before storing them', async () => {
    const cookie = await visitor();
    for (const input of [
      commentInput('  '),
      commentInput('a'.repeat(2001)),
      commentInput('test', { nickname: 'a'.repeat(33) }),
      commentInput('test', { website: 'spam.example' }),
      commentInput('test', { nickname: 'a\nb' }),
      { content: 'test' },
    ]) {
      expect((await send('comments', cookie, input)).status).toBe(400);
    }
    expect((await send('comments', cookie, commentInput('x'.repeat(17000)))).status).toBe(413);
    expect(
      (
        await send('comments', cookie, commentInput(), article, {
          Origin: 'https://elsewhere.example',
        })
      ).status,
    ).toBe(403);
    expect(
      (await send('like', cookie, { liked: true }, article, { 'Sec-Fetch-Site': 'cross-site' }))
        .status,
    ).toBe(403);
    expect(
      (
        await server.fetch(endpoint('comments'), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: 'test',
        })
      ).status,
    ).toBe(415);
    expect(
      (
        await server.fetch(endpoint('comments'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{invalid',
        })
      ).status,
    ).toBe(400);
    expect((await snapshot(cookie)).commentCount).toBe(0);
  });

  it('rejects nonexistent articles, invalid pagination and unknown reply targets', async () => {
    expect((await server.fetch(endpoint('interactions', '/2026/11/04/missing/'))).status).toBe(404);
    expect((await server.fetch(endpoint('interactions', '/2026/../bad/'))).status).toBe(400);
    expect((await server.fetch(endpoint('interactions', article, { after: '-1' }))).status).toBe(
      400,
    );
    expect((await server.fetch(endpoint('replies', article, { parent: '99999' }))).status).toBe(
      404,
    );
    expect(
      (await send('comments', await visitor(), commentInput('回复', { replyToId: 99999 }))).status,
    ).toBe(404);
  });

  it('supports decoded Chinese article paths and literal percent signs without decoding the query twice', async () => {
    const selected = '/2026/11/04/中文100%/';
    const cookie = await visitor();
    const result = await post(cookie, commentInput('中文文章的评论'), selected);
    const stored = await snapshot(await visitor(), selected);
    expect(stored.comments[0].id).toBe(result.comment.id);
    expect(stored.comments[0].content).toBe('中文文章的评论');
  });

  it('limits rapid anonymous comments while allowing a retry of a successful request', async () => {
    const cookie = await visitor();
    const input = commentInput();
    await post(cookie, input);
    const denied = await send('comments', cookie, commentInput('too soon'));
    expect(denied.status).toBe(429);
    expect(denied.headers.get('retry-after')).toBe('15');
    expect((await send('comments', cookie, input)).status).toBe(200);
    await db.prepare('UPDATE article_rate_limits SET expires_at = 0').run();
    expect((await send('comments', cookie, commentInput('later'))).status).toBe(201);
  });

  it('also limits one address using many anonymous cookies', async () => {
    for (let index = 0; index < 6; index += 1) {
      const response = await send(
        'comments',
        await visitor(),
        commentInput(`comment ${index}`),
        article,
        { 'CF-Connecting-IP': '192.0.2.99' },
      );
      expect(response.status).toBe(index < 5 ? 201 : 429);
    }
  });

  it('paginates roots and replies independently without losing rows when a new comment arrives', async () => {
    const root = await post(await visitor(), commentInput('root'));
    const time = new Date().toISOString();
    await db.batch(
      Array.from({ length: 25 }, (_, index) =>
        db
          .prepare(
            'INSERT INTO article_comments (article_path, visitor_id, request_id, nickname, content, created_at, parent_id, reply_to_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          )
          .bind(
            article,
            `seed-${index}`,
            randomUUID(),
            `name ${index}`,
            `reply ${index}`,
            time,
            root.comment.id,
            root.comment.id,
          ),
      ),
    );
    await db.batch(
      Array.from({ length: 24 }, (_, index) =>
        db
          .prepare(
            'INSERT INTO article_comments (article_path, visitor_id, request_id, nickname, content, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          )
          .bind(article, `seed-${index}`, randomUUID(), `root ${index}`, `comment ${index}`, time),
      ),
    );
    const cookie = await visitor();
    const first = await snapshot(cookie);
    expect(first.comments).toHaveLength(20);
    expect(first.commentCount).toBe(50);
    await post(await visitor(), commentInput('arrived while paginating'));
    const second = await snapshot(cookie, article, { after: String(first.nextCursor) });
    expect(second.comments).toHaveLength(6);
    expect(second.nextCursor).toBeNull();
    const ids = [...first.comments, ...second.comments].map((item) => item.id);
    expect(new Set(ids).size).toBe(26);
    expect(ids).toEqual([...ids].sort((left, right) => left - right));
    expect(second.comments.at(-1).content).toBe('arrived while paginating');
    const replies = await (
      await server.fetch(endpoint('replies', article, { parent: String(root.comment.id) }))
    ).json();
    expect(replies.replies).toHaveLength(20);
    const more = await (
      await server.fetch(
        endpoint('replies', article, {
          parent: String(root.comment.id),
          after: String(replies.nextCursor),
        }),
      )
    ).json();
    expect(more.replies).toHaveLength(5);
    expect(more.nextCursor).toBeNull();
    const replyIds = [...replies.replies, ...more.replies].map((item) => item.id);
    expect(replyIds).toEqual([...replyIds].sort((left, right) => left - right));
  });

  it('requires the existing admin token for moderation and preserves reply chains after deleting one reply', async () => {
    expect((await server.fetch(`${origin}/api/articles/admin`)).status).toBe(401);
    expect(
      (
        await server.fetch(`${origin}/api/articles/admin`, {
          headers: { Authorization: 'Bearer wrong-token' },
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await server.fetch(`${origin}/api/articles/admin`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      ).status,
    ).toBe(200);
    const root = await post(await visitor(), commentInput('root'));
    const reply = await post(
      await visitor(),
      commentInput('reply', { replyToId: root.comment.id }),
    );
    await post(await visitor(), commentInput('nested', { replyToId: reply.comment.id }));
    const url = endpoint(`comments/${reply.comment.id}`);
    expect((await server.fetch(url, { method: 'DELETE' })).status).toBe(401);
    const removed = await server.fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(removed.status).toBe(200);
    expect(await removed.json()).toMatchObject({
      commentCount: 2,
      parentId: root.comment.id,
      parentReplyCount: 1,
    });
    const replies = await (
      await server.fetch(endpoint('replies', article, { parent: String(root.comment.id) }))
    ).json();
    expect(replies.replies[0]).toMatchObject({ content: 'nested', replyTo: null, replyToId: null });
    expect(
      (
        await server.fetch(endpoint(`comments/${root.comment.id}`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      ).status,
    ).toBe(200);
    expect((await snapshot(await visitor())).commentCount).toBe(0);
  });
});

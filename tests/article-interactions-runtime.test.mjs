import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestHarness } from 'wrangler';
import { sendPendingCommentEmails } from '../cloudflare/comment-emails';

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
afterEach(() => vi.restoreAllMocks());
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
  email: 'reader@example.com',
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
    for (const field of ['visitor_id', 'request_id', 'ip', 'email']) {
      expect(published.comment).not.toHaveProperty(field);
    }
    const retry = await send('comments', cookie, input);
    expect(retry.status).toBe(200);
    expect((await retry.json()).comment.id).toBe(published.comment.id);
    const other = await visitor();
    const named = await post(other, commentInput('新的留言', { nickname: '自定义用户名' }));
    const data = await snapshot(await visitor());
    expect(data.commentCount).toBe(2);
    expect(data.comments.map((item) => item.nickname)).toEqual(['匿名访客', '自定义用户名']);
    expect(data.comments.every((item) => !('email' in item))).toBe(true);
    expect(named.comment.nickname).toBe('自定义用户名');
    expect((await snapshot(cookie, otherArticle)).comments).toEqual([]);
  });

  it('returns comment and reply emails only to verified administrators for the requested article', async () => {
    const root = await post(await visitor(), commentInput('根评论', { email: 'root@example.com' }));
    const reply = await post(
      await visitor(),
      commentInput('回复', { email: 'reply@example.com', replyToId: root.comment.id }),
    );
    const unrelated = await post(await visitor(), commentInput(), otherArticle);
    const legacy = await db
      .prepare(
        'INSERT INTO article_comments (article_path, visitor_id, request_id, nickname, content, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
      )
      .bind(article, 'legacy-visitor', randomUUID(), '旧访客', '旧评论', new Date().toISOString())
      .first();
    const url = new URL(endpoint('admin/comment-emails'));
    for (const id of [root.comment.id, reply.comment.id, legacy.id, unrelated.comment.id]) {
      url.searchParams.append('id', String(id));
    }
    for (const authorization of ['', 'Bearer incorrect-token']) {
      const denied = await server.fetch(url.href, { headers: { Authorization: authorization } });
      expect(denied.status).toBe(401);
      expect(await denied.json()).not.toHaveProperty('emails');
    }

    const authorized = await server.fetch(url.href, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(authorized.status).toBe(200);
    expect(authorized.headers.get('cache-control')).toBe('no-store');
    expect(await authorized.json()).toEqual({
      emails: {
        [root.comment.id]: 'root@example.com',
        [reply.comment.id]: 'reply@example.com',
        [legacy.id]: null,
      },
    });
    const publicReplies = await server.fetch(
      endpoint('replies', article, { parent: root.comment.id }),
    );
    expect((await publicReplies.json()).replies[0]).not.toHaveProperty('email');
  });

  it('notifies the owner and the directly replied-to address with independent retries', async () => {
    const rootVisitor = await visitor();
    const rootInput = commentInput('根评论 <img src=x onerror=alert(1)>\n还有一行', {
      email: 'root@example.com',
      nickname: '原作者',
    });
    const root = await post(rootVisitor, rootInput);
    expect((await send('comments', rootVisitor, rootInput)).status).toBe(200);
    const reply = await post(
      await visitor(),
      commentInput('第一条回复', {
        email: 'direct+tag@EXAMPLE.com',
        nickname: '回复者 <甲>',
        replyToId: root.comment.id,
      }),
    );
    await post(await visitor(), commentInput('回复一条回复', { replyToId: reply.comment.id }));
    const legacy = await db
      .prepare(
        'INSERT INTO article_comments (article_path, visitor_id, request_id, nickname, content, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
      )
      .bind(article, 'legacy-visitor', randomUUID(), '旧访客', '旧评论', new Date().toISOString())
      .first();
    await post(await visitor(), commentInput('回复没有邮箱的旧评论', { replyToId: legacy.id }));

    const delivered = [];
    const replyAttempts = [];
    const env = {
      ARTICLE_INTERACTIONS: db,
      ASSETS: {
        fetch: async (request) => {
          expect(request.url).toBe(`${origin}/article-titles.json`);
          return Response.json({ [article]: '第一篇 & 练习' });
        },
      },
      COMMENT_EMAIL_OWNER: 'owner@example.com',
      COMMENT_EMAIL_FROM: 'comments@notify.youngkx.cn',
      RESEND_API_KEY: 'test-key',
    };
    const realFetch = globalThis.fetch;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (url !== 'https://api.resend.com/emails') return realFetch(url, init);
      const message = JSON.parse(init.body);
      expect(init.headers.Authorization).toBe('Bearer test-key');
      expect(init.redirect).toBe('manual');
      if (message.to[0] === 'direct+tag@example.com') {
        replyAttempts.push(init.headers['Idempotency-Key']);
        if (replyAttempts.length === 1) return new Response(null, { status: 503 });
      }
      delivered.push(message);
      return new Response(null, { status: 200 });
    });
    await Promise.all([
      sendPendingCommentEmails(env),
      sendPendingCommentEmails(env, reply.comment.id),
    ]);
    expect(delivered.flatMap(({ to }) => to).sort()).toEqual([
      'owner@example.com',
      'owner@example.com',
      'owner@example.com',
      'owner@example.com',
      'root@example.com',
    ]);
    expect(delivered.every(({ text }) => text.includes(`${origin}${article}#comment-`))).toBe(true);
    const ownerRoot = delivered.find((mail) => mail.subject === '[Youngkx Blog] 收到一条新评论');
    expect(ownerRoot.text).toContain('root@example.com');
    expect(ownerRoot.html).toContain('第一篇 &amp; 练习');
    expect(ownerRoot.html).toContain('&lt;img src=x onerror=alert(1)&gt;<br>还有一行');
    expect(ownerRoot.html).not.toContain('<img src=x');
    expect(ownerRoot.html).not.toContain('回复给');
    const ownerReply = delivered.find(
      (mail) =>
        mail.to[0] === 'owner@example.com' && mail.text.includes(`#comment-${reply.comment.id}`),
    );
    expect(ownerReply.subject).toBe('[Youngkx Blog] 收到一条新回复');
    expect(ownerReply.text).toContain('direct+tag@example.com');
    expect(ownerReply.text).toContain('回复给 原作者');
    const readerMail = delivered.find((mail) => mail.to[0] === 'root@example.com');
    expect(readerMail.subject).toBe('[Youngkx Blog] 你的评论收到了来自 回复者 <甲> 的回复');
    expect(readerMail.html).toContain('原作者，你好！');
    expect(readerMail.html).toContain('回复者 &lt;甲&gt;');
    expect(readerMail.html).toContain(`href="${origin}${article}#comment-${reply.comment.id}"`);
    expect(readerMail.html).toContain(`${origin}/youngkx-logo.png`);
    for (const privateAddress of [
      'direct+tag@example.com',
      'root@example.com',
      'owner@example.com',
    ]) {
      expect(readerMail.html + readerMail.text).not.toContain(privateAddress);
    }
    expect(await db.prepare('SELECT attempts FROM article_comment_email_outbox').first()).toEqual({
      attempts: 1,
    });
    await db.prepare('UPDATE article_comment_email_outbox SET ready_at = 0').run();
    await sendPendingCommentEmails(env);
    expect(delivered.at(-1).to).toEqual(['direct+tag@example.com']);
    expect(replyAttempts).toHaveLength(2);
    expect(replyAttempts[0]).toBe(replyAttempts[1]);
    expect(await db.prepare('SELECT id FROM article_comment_email_outbox').first()).toBeNull();
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
      commentInput('test', { email: undefined }),
      commentInput('test', { email: 'reader@example' }),
      commentInput('test', { email: 'reader\n@example.com' }),
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

    const linkedComment = second.comments[0];
    const linkedReply = more.replies.at(-1);
    const focusedComment = await snapshot(cookie, article, { focus: linkedComment.id });
    expect(focusedComment.nextCursor).toBe(first.nextCursor);
    expect(focusedComment.focus).toEqual({ root: linkedComment, replies: null });
    const focusedReply = await snapshot(cookie, article, { focus: linkedReply.id });
    expect(focusedReply.focus.root.id).toBe(root.comment.id);
    expect(focusedReply.focus.replies).toEqual({
      replies: [...replies.replies, linkedReply],
      nextCursor: replies.nextCursor,
    });
    expect((await snapshot(cookie, otherArticle, { focus: linkedReply.id })).focus).toBeNull();
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

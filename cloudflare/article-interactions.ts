import {
  maximumCommentEmailLength,
  maximumCommentEmailLookupIds,
  maximumCommentLength,
  maximumNicknameLength,
  mergeCommentsInOrder,
  type ArticleComment,
  type ArticleCommentFocus,
} from '../lib/article-interactions';
import { author } from '../lib/author';
import { friendLinksPath } from '../lib/useful-links';
import { authorizeManagement, hasAdminSession } from './admin';
import { sendPendingCommentEmails } from './comment-emails';
import { jsonResponse, readLimitedJson, sameOrigin, type WorkerEnv } from './http';

const cookieName = 'youngkx_visitor';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailLocalPart = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i;
const emailDomain =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const commentPageSize = 20;
const commentColumns = `c.id, c.nickname, c.content, c.created_at AS createdAt, c.parent_id AS parentId, c.reply_to_id AS replyToId,
  CASE WHEN c.is_owner = 1 THEN 'owner' END AS authorRole,
  (SELECT nickname FROM article_comments WHERE id = c.reply_to_id) AS replyTo,
  (SELECT COUNT(*) FROM article_comments WHERE parent_id = c.id) AS replyCount`;

function articlePath(value: string | null) {
  if (!value || value.length > 1024 || !value.startsWith('/')) return null;
  if (value === '/links' || value === friendLinksPath) return friendLinksPath;
  try {
    const segments = value.replace(/^\/|\/$/g, '').split('/');
    if (!/^\d{4}$/.test(segments[0]) || segments.length < 2) return null;
    if (
      segments.some(
        (segment) =>
          !segment || segment === '.' || segment === '..' || /[/\\?#\p{Cc}]/u.test(segment),
      )
    )
      return null;
    return `/${segments.map((segment) => segment.normalize('NFC')).join('/')}/`;
  } catch {
    return null;
  }
}

function commentEmail(value: unknown) {
  if (typeof value !== 'string') return null;
  const email = value.trim();
  if (email.length > maximumCommentEmailLength || /[\s\p{Cc}]/u.test(email)) return null;
  const [local, domain, extra] = email.split('@');
  if (!domain || extra !== undefined || local.length > 64) return null;
  if (!emailLocalPart.test(local) || !emailDomain.test(domain)) return null;
  return `${local}@${domain.toLowerCase()}`;
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function visitorIdentity(request: Request) {
  const existing = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  const token = existing && uuidPattern.test(existing) ? existing : crypto.randomUUID();
  return {
    id: await digest(token),
    cookie:
      existing === token
        ? null
        : `${cookieName}=${token}; Path=/api/articles; Max-Age=31536000; HttpOnly; SameSite=Lax${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`,
  };
}

async function consumeRateLimit(db: D1Database, key: string, limit: number, seconds: number) {
  const now = Math.floor(Date.now() / 1000);
  const results = await db.batch([
    db
      .prepare(
        'DELETE FROM article_rate_limits WHERE key IN (SELECT key FROM article_rate_limits WHERE expires_at <= ? LIMIT 100)',
      )
      .bind(now),
    db
      .prepare(
        `INSERT INTO article_rate_limits (key, count, expires_at) VALUES (?, 1, ?)
         ON CONFLICT(key) DO UPDATE SET
           count = CASE WHEN expires_at <= ? THEN 1 ELSE count + 1 END,
           expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END
         WHERE expires_at <= ? OR count < ? RETURNING key`,
      )
      .bind(key, now + seconds, now, now, now, limit),
  ]);
  return results[1].results.length > 0;
}

function rateLimitResponse(seconds: number) {
  const response = jsonResponse({ error: `操作有些频繁，请 ${seconds} 秒后再试。` }, 429);
  response.headers.set('Retry-After', String(seconds));
  return response;
}

async function commentCount(db: D1Database, path: string) {
  return (
    (await db
      .prepare('SELECT COUNT(*) AS count FROM article_comments WHERE article_path = ?')
      .bind(path)
      .first<number>('count')) ?? 0
  );
}

async function replyPage(db: D1Database, path: string, parentId: number, cursor: number) {
  const { results } = await db
    .prepare(
      `SELECT ${commentColumns} FROM article_comments c WHERE c.article_path = ? AND c.parent_id = ? AND c.id > ? ORDER BY c.id ASC LIMIT ?`,
    )
    .bind(path, parentId, cursor, commentPageSize + 1)
    .all<ArticleComment>();
  const replies = results.slice(0, commentPageSize);
  return { replies, nextCursor: results.length > commentPageSize ? replies.at(-1)!.id : null };
}

async function commentFocus(
  db: D1Database,
  path: string,
  id: number,
): Promise<ArticleCommentFocus | null> {
  const { results } = await db
    .prepare(
      `SELECT ${commentColumns} FROM article_comments c
       WHERE c.article_path = ? AND (c.id = ? OR c.id = (SELECT parent_id FROM article_comments WHERE id = ?))`,
    )
    .bind(path, id, id)
    .all<ArticleComment>();
  const target = results.find((comment) => comment.id === id);
  if (!target) return null;
  if (target.parentId === null) return { root: target, replies: null };
  const root = results.find((comment) => comment.id === target.parentId);
  if (!root) return null;
  const page = await replyPage(db, path, root.id, 0);
  return { root, replies: { ...page, replies: mergeCommentsInOrder(page.replies, [target]) } };
}

async function handleRequest(
  request: Request,
  env: WorkerEnv,
  url: URL,
  visitorId: string,
  ctx: ExecutionContext,
) {
  const path = articlePath(url.searchParams.get('article'));
  if (!path) return jsonResponse({ error: '页面地址无效。' }, 400);
  const route = url.pathname;
  const emailLookup = route === '/api/articles/admin/comment-emails';
  const deletion = /^\/api\/articles\/comments\/([1-9]\d*)$/.exec(route);
  const allowed =
    (route === '/api/articles/interactions' && request.method === 'GET') ||
    (route === '/api/articles/replies' && request.method === 'GET') ||
    (route === '/api/articles/like' && request.method === 'PUT' && path !== friendLinksPath) ||
    (route === '/api/articles/comments' && request.method === 'POST') ||
    (emailLookup && request.method === 'GET') ||
    (deletion && request.method === 'DELETE');
  if (!allowed) return jsonResponse({ error: '不支持的请求方式或地址。' }, 405);
  if (request.method !== 'GET' && !sameOrigin(request, env)) {
    return jsonResponse({ error: '请在本站页面操作。' }, 403);
  }
  if (!env.ARTICLE_INTERACTIONS)
    return jsonResponse({ error: '互动服务暂时不可用，请稍后再试。' }, 503);
  const db = env.ARTICLE_INTERACTIONS;

  if (emailLookup) {
    const denied = await authorizeManagement(request, env);
    if (denied) return denied;
    const ids = url.searchParams.getAll('id').map(Number);
    if (
      ids.length === 0 ||
      ids.length > maximumCommentEmailLookupIds ||
      ids.some((id) => !Number.isSafeInteger(id) || id < 1)
    ) {
      return jsonResponse({ error: '评论地址无效。' }, 400);
    }
    const { results } = await db
      .prepare(
        `SELECT id, email FROM article_comments WHERE article_path = ? AND id IN (${ids.map(() => '?').join(', ')})`,
      )
      .bind(path, ...ids)
      .all<{ id: number; email: string | null }>();
    return jsonResponse({
      emails: Object.fromEntries(results.map(({ id, email }) => [id, email])),
    });
  }

  if (deletion) {
    const denied = await authorizeManagement(request, env);
    if (denied) return denied;
    const removed = await db
      .prepare(
        'DELETE FROM article_comments WHERE article_path = ? AND id = ? RETURNING parent_id AS parentId',
      )
      .bind(path, Number(deletion[1]))
      .first<{ parentId: number | null }>();
    return removed
      ? jsonResponse({
          deleted: true,
          commentCount: await commentCount(db, path),
          parentId: removed.parentId,
          parentReplyCount:
            removed.parentId === null
              ? null
              : await db
                  .prepare('SELECT COUNT(*) AS count FROM article_comments WHERE parent_id = ?')
                  .bind(removed.parentId)
                  .first<number>('count'),
        })
      : jsonResponse({ error: '这条评论不存在。' }, 404);
  }

  // Validate against deployed assets, including newly published Markdown posts.
  const assetPath = path.split('/').map(encodeURIComponent).join('/');
  const article = await env.ASSETS.fetch(
    new Request(new URL(assetPath, url.origin), { method: 'HEAD' }),
  );
  if (article.status !== 200 || !article.headers.get('content-type')?.includes('text/html')) {
    return jsonResponse({ error: '页面不存在。' }, 404);
  }

  if (request.method === 'GET') {
    const rawCursor = url.searchParams.get('after');
    const cursor = rawCursor === null ? 0 : Number(rawCursor);
    if (!Number.isSafeInteger(cursor) || cursor < 0) {
      return jsonResponse({ error: '评论分页参数无效。' }, 400);
    }
    if (route === '/api/articles/replies') {
      const parent = Number(url.searchParams.get('parent'));
      if (!Number.isSafeInteger(parent) || parent < 1)
        return jsonResponse({ error: '评论地址无效。' }, 400);
      const root = await db
        .prepare(
          'SELECT id FROM article_comments WHERE article_path = ? AND id = ? AND parent_id IS NULL',
        )
        .bind(path, parent)
        .first();
      if (!root) return jsonResponse({ error: '这条评论不存在。' }, 404);
      return jsonResponse(await replyPage(db, path, parent, cursor));
    }
    const rawFocus = url.searchParams.get('focus');
    const focusId = rawFocus === null ? null : Number(rawFocus);
    if (focusId !== null && (!Number.isSafeInteger(focusId) || focusId < 1)) {
      return jsonResponse({ error: '评论地址无效。' }, 400);
    }
    const [results, focus] = await Promise.all([
      db.batch<Record<string, unknown>>([
        db
          .prepare(
            'SELECT COUNT(*) AS likes, COALESCE(MAX(visitor_id = ?), 0) AS liked FROM article_likes WHERE article_path = ?',
          )
          .bind(visitorId, path),
        db
          .prepare('SELECT COUNT(*) AS count FROM article_comments WHERE article_path = ?')
          .bind(path),
        db
          .prepare(
            `SELECT ${commentColumns} FROM article_comments c WHERE c.article_path = ? AND c.parent_id IS NULL AND c.id > ? ORDER BY c.id ASC LIMIT ?`,
          )
          .bind(path, cursor, commentPageSize + 1),
      ]),
      focusId === null ? undefined : commentFocus(db, path, focusId),
    ]);
    const comments = results[2].results as ArticleComment[];
    const page = comments.slice(0, commentPageSize);
    return jsonResponse({
      likes: results[0].results[0].likes,
      liked: Boolean(results[0].results[0].liked),
      commentCount: results[1].results[0].count,
      comments: page,
      nextCursor: comments.length > commentPageSize ? page.at(-1)!.id : null,
      ...(focus !== undefined && { focus }),
    });
  }

  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return jsonResponse({ error: '请使用 JSON 提交。' }, 415);
  }
  const input = await readLimitedJson(request, 16 * 1024);
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return jsonResponse({ error: '提交内容无效。' }, 400);
  }
  const body = input as Record<string, unknown>;
  const address = request.headers.get('cf-connecting-ip') || visitorId;
  // Salt address fingerprints with the existing server secret; never store or return raw IPs.
  const fingerprint = await digest(`${env.LINKS_ADMIN_TOKEN ?? 'local-preview'}:${address}`);

  if (route === '/api/articles/like') {
    if (typeof body.liked !== 'boolean') return jsonResponse({ error: '点赞状态无效。' }, 400);
    if (!(await consumeRateLimit(db, `likes:${fingerprint}`, 60, 60))) return rateLimitResponse(60);
    const mutation = body.liked
      ? db
          .prepare('INSERT OR IGNORE INTO article_likes (article_path, visitor_id) VALUES (?, ?)')
          .bind(path, visitorId)
      : db
          .prepare('DELETE FROM article_likes WHERE article_path = ? AND visitor_id = ?')
          .bind(path, visitorId);
    const results = await db.batch<Record<string, unknown>>([
      mutation,
      db.prepare('SELECT COUNT(*) AS likes FROM article_likes WHERE article_path = ?').bind(path),
    ]);
    return jsonResponse({ likes: results[1].results[0].likes, liked: body.liked });
  }

  const isOwner = await hasAdminSession(request, env);
  if (body.asOwner === true && !isOwner) {
    return jsonResponse({ error: '管理凭证已失效，请重新解锁后再发布。' }, 401);
  }
  if (
    typeof body.content !== 'string' ||
    (!isOwner && body.nickname !== undefined && typeof body.nickname !== 'string')
  ) {
    return jsonResponse({ error: '请填写评论内容，昵称可留空。' }, 400);
  }
  const content = body.content.trim();
  const nickname = isOwner
    ? author.name
    : (typeof body.nickname === 'string' ? body.nickname.trim() : '') || '匿名访客';
  if (
    !content ||
    content.length > maximumCommentLength ||
    nickname.length > maximumNicknameLength ||
    /[\p{Cc}]/u.test(nickname)
  ) {
    return jsonResponse(
      { error: `评论需为 1–${maximumCommentLength} 字，昵称最多 ${maximumNicknameLength} 字。` },
      400,
    );
  }
  if (
    typeof body.requestId !== 'string' ||
    !uuidPattern.test(body.requestId) ||
    (body.website !== undefined && body.website !== '')
  ) {
    return jsonResponse({ error: '提交内容无效，请刷新页面后重试。' }, 400);
  }
  const existing = await db
    .prepare(
      `SELECT ${commentColumns} FROM article_comments c WHERE c.article_path = ? AND c.visitor_id = ? AND c.request_id = ?`,
    )
    .bind(path, visitorId, body.requestId)
    .first<ArticleComment>();
  const parentCount = async (parentId: number | null) =>
    parentId === null
      ? null
      : ((await db
          .prepare('SELECT COUNT(*) AS count FROM article_comments WHERE parent_id = ?')
          .bind(parentId)
          .first<number>('count')) ?? 0);
  if (existing)
    return jsonResponse({
      comment: existing,
      commentCount: await commentCount(db, path),
      parentReplyCount: await parentCount(existing.parentId),
    });
  const email = isOwner ? null : commentEmail(body.email);
  if (!isOwner && !email) return jsonResponse({ error: '请填写有效的邮箱地址。' }, 400);
  let parentId: number | null = null;
  let replyToId: number | null = null;
  let replyTo: string | null = null;
  if (body.replyToId !== undefined && body.replyToId !== null) {
    if (
      typeof body.replyToId !== 'number' ||
      !Number.isSafeInteger(body.replyToId) ||
      body.replyToId < 1
    )
      return jsonResponse({ error: '回复目标无效。' }, 400);
    const target = await db
      .prepare(
        'SELECT id, parent_id AS parentId, nickname FROM article_comments WHERE article_path = ? AND id = ?',
      )
      .bind(path, body.replyToId)
      .first<{ id: number; parentId: number | null; nickname: string }>();
    if (!target) return jsonResponse({ error: '要回复的评论不存在。' }, 404);
    parentId = target.parentId ?? target.id;
    replyToId = target.id;
    replyTo = target.nickname;
  }
  if (!(await consumeRateLimit(db, `comment-visitor:${visitorId}`, 1, 15)))
    return rateLimitResponse(15);
  if (!(await consumeRateLimit(db, `comments:${fingerprint}`, 5, 60))) return rateLimitResponse(60);

  const [insert, count] = await db.batch<Record<string, unknown>>([
    db
      .prepare(
        `INSERT INTO article_comments (article_path, visitor_id, request_id, nickname, email, content, created_at, parent_id, reply_to_id, is_owner)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, nickname, content, created_at AS createdAt, parent_id AS parentId`,
      )
      .bind(
        path,
        visitorId,
        body.requestId,
        nickname,
        email,
        content,
        new Date().toISOString(),
        parentId,
        replyToId,
        Number(isOwner),
      ),
    db.prepare('SELECT COUNT(*) AS count FROM article_comments WHERE article_path = ?').bind(path),
  ]);
  const published = insert.results[0];
  ctx.waitUntil(sendPendingCommentEmails(env, Number(published.id)));
  return jsonResponse(
    {
      comment: {
        ...published,
        authorRole: isOwner ? 'owner' : null,
        replyTo,
        replyToId,
        replyCount: 0,
      },
      commentCount: count.results[0].count,
      parentReplyCount: await parentCount(parentId),
    },
    201,
  );
}

export async function handleArticleInteractionsApi(
  request: Request,
  env: WorkerEnv,
  url: URL,
  ctx: ExecutionContext,
) {
  try {
    if (url.pathname === '/api/articles/admin') {
      if (request.method !== 'GET') return jsonResponse({ error: '不支持的请求方式。' }, 405);
      const denied = await authorizeManagement(request, env);
      if (!denied) return jsonResponse({ authorized: true });
      return jsonResponse(
        {
          error:
            denied.status === 401
              ? '管理口令不正确，请重新输入。'
              : '暂时无法验证管理口令，请稍后重试。',
        },
        denied.status,
      );
    }
    const visitor = await visitorIdentity(request);
    const response = await handleRequest(request, env, url, visitor.id, ctx);
    if (visitor.cookie) response.headers.set('Set-Cookie', visitor.cookie);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'BODY_TOO_LARGE') {
      return jsonResponse({ error: '提交内容过大。' }, 413);
    }
    if (
      error instanceof SyntaxError ||
      (error instanceof Error && error.message === 'EMPTY_BODY')
    ) {
      return jsonResponse({ error: '提交内容无效。' }, 400);
    }
    console.error(
      JSON.stringify({ message: 'article interactions API failed', method: request.method }),
    );
    return jsonResponse({ error: '互动服务暂时不可用，请稍后再试。' }, 503);
  }
}

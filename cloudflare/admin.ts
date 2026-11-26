import {
  authorizeManagementToken,
  jsonResponse,
  readLimitedJson,
  sameOrigin,
  usesLocalTokenVerification,
  type WorkerEnv,
} from './http';

const day = 24 * 60 * 60;
const cookieName = 'youngkx_admin';
const sessionLifetime = 90 * day;
const refreshInterval = 7 * day;
const tokenPattern = /^[0-9a-f]{64}$/;

function adminCookie(request: Request) {
  return request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
}

function setAdminCookie(response: Response, request: Request, token: string, maxAge?: number) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  const lifetime = maxAge === undefined ? '' : `; Max-Age=${maxAge}`;
  response.headers.append(
    'Set-Cookie',
    `${cookieName}=${token}; Path=/api${lifetime}; HttpOnly; SameSite=Strict${secure}`,
  );
  return response;
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sessionKey(request: Request, env: WorkerEnv, token?: string) {
  if (!token || !tokenPattern.test(token)) return null;
  const secret =
    env.LINKS_ADMIN_TOKEN || (usesLocalTokenVerification(request, env) ? 'loopback' : null);
  if (!secret) return null;
  // The cookie is random. Binding the lookup key to the management token revokes sessions on rotation.
  const input = new TextEncoder().encode(`site-admin:${token}:${secret}`);
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', input)));
}

async function readSession(env: WorkerEnv, hash: string | null, now: number) {
  if (!hash || !env.ARTICLE_INTERACTIONS) return null;
  return env.ARTICLE_INTERACTIONS.prepare(
    'SELECT expires_at AS expiresAt, persistent FROM admin_sessions WHERE token_hash = ? AND expires_at > ?',
  )
    .bind(hash, now)
    .first<{ expiresAt: number; persistent: number }>();
}

export async function hasAdminSession(request: Request, env: WorkerEnv) {
  const hash = await sessionKey(request, env, adminCookie(request));
  return (await readSession(env, hash, Math.floor(Date.now() / 1000))) !== null;
}

export async function authorizeManagement(request: Request, env: WorkerEnv) {
  if (env.LINKS_LOCAL_PREVIEW === 'true') return null;
  if (!request.headers.has('Authorization') && (await hasAdminSession(request, env))) {
    if (request.method !== 'GET' && !sameOrigin(request, env)) {
      return jsonResponse({ error: 'Please manage this site from its own pages.' }, 403);
    }
    return null;
  }
  return authorizeManagementToken(request, env);
}

function adminError(status: number) {
  return jsonResponse(
    {
      error: status === 401 ? '管理口令不正确，请重新输入。' : '暂时无法验证管理口令，请稍后重试。',
    },
    status,
  );
}

export async function handleAdmin(request: Request, env: WorkerEnv) {
  const token = adminCookie(request);
  const hash = await sessionKey(request, env, token);
  const now = Math.floor(Date.now() / 1000);
  const db = env.ARTICLE_INTERACTIONS;

  if (request.method === 'GET') {
    const session = await readSession(env, hash, now);
    if (
      token &&
      hash &&
      session?.persistent &&
      session.expiresAt - now <= sessionLifetime - refreshInterval
    ) {
      const refreshed = await db
        .prepare(
          'UPDATE admin_sessions SET expires_at = MAX(expires_at, ?) WHERE token_hash = ? AND expires_at > ? RETURNING expires_at',
        )
        .bind(now + sessionLifetime, hash, now)
        .first<number>('expires_at');
      if (refreshed === null) return jsonResponse({ authorized: false });
      return setAdminCookie(jsonResponse({ authorized: true }), request, token, refreshed - now);
    }
    return jsonResponse({
      authorized: session !== null,
      preview: env.LINKS_LOCAL_PREVIEW === 'true',
    });
  }
  if (!sameOrigin(request, env)) {
    return jsonResponse({ error: '请在本站操作。' }, 403);
  }

  if (request.method === 'DELETE') {
    if (hash && db) {
      await db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(hash).run();
    }
    return setAdminCookie(jsonResponse({ authorized: false }), request, '', 0);
  }

  if (request.method !== 'POST') return jsonResponse({ error: '不支持的请求方式。' }, 405);
  if (!db || (!env.LINKS_ADMIN_TOKEN && !usesLocalTokenVerification(request, env)))
    return adminError(503);
  const denied = await authorizeManagementToken(request, env);
  if (denied) return adminError(denied.status);
  const input = await readLimitedJson(request, 1024).catch(() => null);
  if (
    typeof input !== 'object' ||
    input === null ||
    !('remember' in input) ||
    typeof input.remember !== 'boolean'
  ) {
    return jsonResponse({ error: '登录选项无效，请刷新后重试。' }, 400);
  }
  const { remember } = input;
  const freshToken = hex(crypto.getRandomValues(new Uint8Array(32)));
  const freshHash = await sessionKey(request, env, freshToken);
  await db.batch([
    db
      .prepare('DELETE FROM admin_sessions WHERE expires_at <= ? OR token_hash = ?')
      .bind(now, hash),
    db
      .prepare('INSERT INTO admin_sessions (token_hash, expires_at, persistent) VALUES (?, ?, ?)')
      .bind(freshHash, now + (remember ? sessionLifetime : day), Number(remember)),
  ]);
  return setAdminCookie(
    jsonResponse({ authorized: true }),
    request,
    freshToken,
    remember ? sessionLifetime : undefined,
  );
}

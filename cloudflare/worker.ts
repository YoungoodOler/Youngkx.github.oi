import {
  createDefaultFriendLinksPayload,
  friendLinksRevision,
  validateUsefulLinksPayload,
  type UsefulLinksPayload,
} from '../lib/useful-links';

import { handleFilesApi } from './files';
import { handleArticleInteractionsApi } from './article-interactions';
import { sendPendingCommentEmails } from './comment-emails';
import { authorizeManagement, handleAdmin } from './admin';
import { jsonResponse, readLimitedJson, type WorkerEnv } from './http';

const linksKey = 'friend-links:v1';
const linksSnapshot = createDefaultFriendLinksPayload();

async function readLinks(env: Env): Promise<UsefulLinksPayload> {
  const stored = await env.LINKS.get<unknown>(linksKey, 'json');
  if (stored === null) return linksSnapshot;
  const validation = validateUsefulLinksPayload(stored);
  if (!validation.ok) {
    console.error(JSON.stringify({ message: 'invalid links data in KV', error: validation.error }));
    return linksSnapshot;
  }
  return friendLinksRevision(validation.data.updatedAt) >=
    friendLinksRevision(linksSnapshot.updatedAt)
    ? validation.data
    : linksSnapshot;
}

async function dispatchLinksPublish(token: string, updatedAt: string) {
  try {
    const response = await fetch(
      'https://api.github.com/repos/YoungoodOler/Youngkx.github.oi/actions/workflows/publish-friend-links.yml/dispatches',
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'youngkx-friend-links',
          'X-GitHub-Api-Version': '2026-03-10',
        },
        redirect: 'error',
        body: JSON.stringify({ ref: 'main', inputs: { updated_at: updatedAt } }),
        signal: AbortSignal.timeout(8_000),
      },
    );
    await response.body?.cancel();
    if (!response.ok) {
      console.error(
        JSON.stringify({ message: 'friend links dispatch failed', status: response.status }),
      );
    }
  } catch {
    console.error(JSON.stringify({ message: 'friend links dispatch request failed' }));
  }
}

async function handleLinksApi(request: Request, env: WorkerEnv, url: URL, ctx: ExecutionContext) {
  if (url.pathname === '/api/links/admin') {
    if (request.method !== 'GET') return jsonResponse({ error: 'Method not allowed.' }, 405);
    return (await authorizeManagement(request, env)) ?? jsonResponse({ authorized: true });
  }

  if (request.method === 'GET') {
    const response = jsonResponse(await readLinks(env));
    if (linksSnapshot.updatedAt)
      response.headers.set('X-Friend-Links-Snapshot', linksSnapshot.updatedAt);
    return response;
  }
  if (request.method !== 'PUT') return jsonResponse({ error: 'Method not allowed.' }, 405);
  const authorizationError = await authorizeManagement(request, env);
  if (authorizationError) return authorizationError;
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return jsonResponse({ error: 'Content-Type must be application/json.' }, 415);
  }

  try {
    const input = await readLimitedJson(request);
    const validation = validateUsefulLinksPayload(input);
    if (!validation.ok) return jsonResponse({ error: validation.error }, 400);

    const updatedAt = new Date().toISOString();
    const payload: UsefulLinksPayload = {
      ...validation.data,
      updatedAt,
    };
    await env.LINKS.put(linksKey, JSON.stringify(payload));
    if (
      env.LINKS_PUBLISH_TOKEN &&
      env.LINKS_LOCAL_PREVIEW !== 'true' &&
      url.hostname === 'www.youngkx.cn'
    ) {
      ctx.waitUntil(dispatchLinksPublish(env.LINKS_PUBLISH_TOKEN, updatedAt));
    }
    return jsonResponse(payload);
  } catch (error) {
    if (error instanceof Error && error.message === 'BODY_TOO_LARGE') {
      return jsonResponse({ error: 'The links document is too large.' }, 413);
    }
    if (
      error instanceof SyntaxError ||
      (error instanceof Error && error.message === 'EMPTY_BODY')
    ) {
      return jsonResponse({ error: 'The request body must contain valid JSON.' }, 400);
    }
    throw error;
  }
}

const worker = {
  async scheduled(_controller: ScheduledController, env: Env) {
    await sendPendingCommentEmails(env);
  },

  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === 'youngkx.cn') {
      url.hostname = 'www.youngkx.cn';
      return Response.redirect(url.toString(), 308);
    }

    if (url.pathname === '/api/admin') {
      try {
        return await handleAdmin(request, env);
      } catch {
        console.error(
          JSON.stringify({ message: 'admin session request failed', method: request.method }),
        );
        return jsonResponse({ error: '暂时无法访问站长登录，请稍后重试。' }, 503);
      }
    }

    if (url.pathname.startsWith('/api/articles/')) {
      return handleArticleInteractionsApi(request, env, url, ctx);
    }

    if (url.pathname === '/api/files' || url.pathname.startsWith('/api/files/')) {
      try {
        return await handleFilesApi(request, env, url);
      } catch (error) {
        console.error(
          JSON.stringify({
            message: 'files API failed',
            error: error instanceof Error ? error.message : String(error),
            method: request.method,
          }),
        );
        return jsonResponse(
          { error: 'Unable to access file storage right now. Please retry.' },
          500,
        );
      }
    }

    if (url.pathname === '/api/links' || url.pathname === '/api/links/admin') {
      try {
        return await handleLinksApi(request, env, url, ctx);
      } catch (error) {
        console.error(
          JSON.stringify({
            message: 'links API failed',
            error: error instanceof Error ? error.message : String(error),
            method: request.method,
            path: url.pathname,
          }),
        );
        return jsonResponse({ error: 'Unable to update links right now.' }, 500);
      }
    }

    const response = await env.ASSETS.fetch(request);
    if (!url.hostname.endsWith('.workers.dev')) return response;

    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noindex');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
} satisfies ExportedHandler<WorkerEnv>;

export default worker;

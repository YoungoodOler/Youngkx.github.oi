import {
  createEmptyUsefulLinksPayload,
  validateUsefulLinksPayload,
  type UsefulLinksPayload,
} from '../lib/useful-links';

import { handleFilesApi } from './files';
import { authorizeManagement, jsonResponse, readLimitedJson, type WorkerEnv } from './http';

const linksKey = 'directory:v1';

async function readLinks(env: Env): Promise<UsefulLinksPayload> {
  const stored = await env.LINKS.get<unknown>(linksKey, 'json');
  if (stored === null) return createEmptyUsefulLinksPayload();
  const validation = validateUsefulLinksPayload(stored);
  if (!validation.ok) {
    console.error(JSON.stringify({ message: 'invalid links data in KV', error: validation.error }));
    return createEmptyUsefulLinksPayload();
  }
  return validation.data;
}

async function handleLinksApi(request: Request, env: WorkerEnv, url: URL) {
  if (url.pathname === '/api/links/admin') {
    if (request.method !== 'GET') return jsonResponse({ error: 'Method not allowed.' }, 405);
    return (await authorizeManagement(request, env)) ?? jsonResponse({ authorized: true });
  }

  if (request.method === 'GET') return jsonResponse(await readLinks(env));
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

    const payload: UsefulLinksPayload = {
      ...validation.data,
      updatedAt: new Date().toISOString(),
    };
    await env.LINKS.put(linksKey, JSON.stringify(payload));
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
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === 'youngkx.cn') {
      url.hostname = 'www.youngkx.cn';
      return Response.redirect(url.toString(), 308);
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
        return await handleLinksApi(request, env, url);
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

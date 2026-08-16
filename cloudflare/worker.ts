import {
  createEmptyUsefulLinksPayload,
  validateUsefulLinksPayload,
  type UsefulLinksPayload,
} from '../lib/useful-links';

const linksKey = 'directory:v1';
const maximumBodyBytes = 256 * 1024;
type WorkerEnv = Env & { LINKS_LOCAL_PREVIEW?: string };

function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
    },
  });
}

async function readLimitedJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maximumBodyBytes) {
    throw new Error('BODY_TOO_LARGE');
  }
  if (!request.body) throw new Error('EMPTY_BODY');

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    totalBytes += chunk.value.byteLength;
    if (totalBytes > maximumBodyBytes) {
      await reader.cancel();
      throw new Error('BODY_TOO_LARGE');
    }
    chunks.push(chunk.value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(body)) as unknown;
}

async function verifyToken(request: Request, expectedToken: string) {
  const authorization = request.headers.get('authorization') ?? '';
  const providedToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(providedToken)),
    crypto.subtle.digest('SHA-256', encoder.encode(expectedToken)),
  ]);
  if (typeof crypto.subtle.timingSafeEqual === 'function') {
    return crypto.subtle.timingSafeEqual(providedHash, expectedHash);
  }

  // Node's Web Crypto implementation used by unit tests does not expose the
  // Workers-only helper. Both SHA-256 buffers have a fixed length, so this
  // fixed-work fallback preserves constant-time comparison semantics.
  const providedBytes = new Uint8Array(providedHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < providedBytes.length; index += 1) {
    difference |= providedBytes[index] ^ expectedBytes[index];
  }
  return difference === 0;
}

async function isAuthorized(request: Request, env: WorkerEnv) {
  if (env.LINKS_LOCAL_PREVIEW === 'true') return true;
  if (typeof env.LINKS_ADMIN_TOKEN !== 'string' || !env.LINKS_ADMIN_TOKEN) return false;
  return verifyToken(request, env.LINKS_ADMIN_TOKEN);
}

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
    return (await isAuthorized(request, env))
      ? jsonResponse({ authorized: true })
      : jsonResponse({ error: 'Unauthorized.' }, 401);
  }

  if (request.method === 'GET') return jsonResponse(await readLinks(env));
  if (request.method !== 'PUT') return jsonResponse({ error: 'Method not allowed.' }, 405);
  if (!(await isAuthorized(request, env))) {
    return jsonResponse({ error: 'Unauthorized.' }, 401);
  }
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

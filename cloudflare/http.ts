export type WorkerEnv = Env & {
  LINKS_LOCAL_PREVIEW?: string;
  LINKS_LOCAL_AUTH_ORIGIN?: string;
};

export function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
    },
  });
}

export class UploadBodyError extends Error {}

export async function streamFixedLength<T>(
  body: ReadableStream,
  length: number,
  consume: (stream: ReadableStream) => Promise<T>,
): Promise<T> {
  const stream = new FixedLengthStream(length);
  const controller = new AbortController();
  const storageAbort = new Error('FILE_STORAGE_ABORTED');
  const results = await Promise.allSettled([
    body.pipeTo(stream.writable, { signal: controller.signal }),
    consume(stream.readable).catch(async (error: unknown) => {
      controller.abort(storageAbort);
      await stream.readable.cancel(storageAbort).catch(() => {});
      throw error;
    }),
  ]);
  if (results[0].status === 'rejected') {
    if (results[0].reason === storageAbort && results[1].status === 'rejected')
      throw results[1].reason;
    throw new UploadBodyError(
      'The upload was interrupted or its length did not match. Please retry.',
    );
  }
  if (results[1].status === 'rejected') throw results[1].reason;
  return results[1].value;
}

export async function readLimitedJson(
  request: Request,
  maximumBytes = 256 * 1024,
): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
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
    if (totalBytes > maximumBytes) {
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

export async function authorizeManagement(
  request: Request,
  env: WorkerEnv,
): Promise<Response | null> {
  if (env.LINKS_LOCAL_PREVIEW === 'true') return null;
  const authorization = request.headers.get('authorization') ?? '';
  const providedToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (typeof env.LINKS_ADMIN_TOKEN !== 'string' || !env.LINKS_ADMIN_TOKEN) {
    const hostname = new URL(request.url).hostname;
    const loopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
    // Only an explicit loopback preview may reuse the existing production token.
    // The origin is deliberately fixed rather than accepting an arbitrary URL.
    if (loopback && env.LINKS_LOCAL_AUTH_ORIGIN === 'https://www.youngkx.cn') {
      if (!providedToken) return jsonResponse({ error: 'Invalid manage token.' }, 401);
      try {
        const response = await fetch('https://www.youngkx.cn/api/links/admin', {
          method: 'GET',
          headers: { Authorization: `Bearer ${providedToken}` },
          redirect: 'error',
          cache: 'no-store',
          signal: AbortSignal.timeout(5_000),
        });
        await response.body?.cancel();
        if (response.status === 200) return null;
        if (response.status === 401) return jsonResponse({ error: 'Invalid manage token.' }, 401);
      } catch {
        // Do not log a failed verification request or include remote response bodies.
      }
      return jsonResponse(
        {
          error:
            'Unable to verify the manage token. Please retry when the connection is available.',
          code: 'LOCAL_TOKEN_VERIFICATION_UNAVAILABLE',
        },
        502,
      );
    }
    return jsonResponse(
      {
        error: 'The manage token is not configured on this server.',
        code: 'MANAGE_TOKEN_NOT_CONFIGURED',
      },
      503,
    );
  }
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(providedToken)),
    crypto.subtle.digest('SHA-256', encoder.encode(env.LINKS_ADMIN_TOKEN)),
  ]);
  if (typeof crypto.subtle.timingSafeEqual === 'function') {
    return crypto.subtle.timingSafeEqual(providedHash, expectedHash)
      ? null
      : jsonResponse({ error: 'Invalid manage token.' }, 401);
  }
  // Node's Web Crypto lacks the Workers helper; compare fixed-length hashes in tests.
  const providedBytes = new Uint8Array(providedHash);
  const expectedBytes = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < providedBytes.length; index += 1) {
    difference |= providedBytes[index] ^ expectedBytes[index];
  }
  return difference === 0 ? null : jsonResponse({ error: 'Invalid manage token.' }, 401);
}

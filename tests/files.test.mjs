import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../cloudflare/worker.ts';
import { defaultRepositorySettings } from '../lib/file-repository.ts';

const origin = 'https://www.youngkx.cn';
const token = 'test-manage-token';

// Model the Workers-only stream's byte-count enforcement in Node unit tests.
class TestFixedLengthStream extends TransformStream {
  constructor(expectedLength) {
    let bytes = 0;
    super({
      transform(chunk, controller) {
        bytes += chunk.byteLength;
        if (bytes > expectedLength) throw new Error('Length mismatch');
        controller.enqueue(chunk);
      },
      flush() {
        if (bytes !== expectedLength) throw new Error('Length mismatch');
      },
    });
  }
}

function createBucket() {
  const objects = new Map();
  const uploads = new Map();
  const resumeMultipartUpload = vi.fn((key, uploadId) => {
    const existing = uploads.get(uploadId);
    if (existing) return existing.upload;
    return {
      key,
      uploadId,
      abort: vi.fn(async () => {}),
      uploadPart: vi.fn(async () => {
        throw new Error('No upload');
      }),
      complete: vi.fn(async () => {
        throw new Error('No upload');
      }),
    };
  });
  return {
    objects,
    uploads,
    resumeMultipartUpload,
    createMultipartUpload: vi.fn(async (key) => {
      const uploadId = `upload-${crypto.randomUUID()}`;
      const parts = new Map();
      const upload = {
        key,
        uploadId,
        uploadPart: vi.fn(async (partNumber, body) => {
          const reader = body.getReader();
          let size = 0;
          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            size += chunk.value.byteLength;
          }
          const part = { partNumber, etag: crypto.randomUUID(), size };
          parts.set(partNumber, part);
          return { partNumber, etag: part.etag };
        }),
        abort: vi.fn(async () => {
          uploads.delete(uploadId);
        }),
        complete: vi.fn(async (provided) => {
          for (const part of provided)
            if (parts.get(part.partNumber)?.etag !== part.etag) throw new Error('Invalid part');
          const object = {
            key,
            size: provided.reduce((sum, part) => sum + parts.get(part.partNumber).size, 0),
            uploaded: new Date(),
            etag: crypto.randomUUID(),
            httpEtag: '"multipart-etag"',
            bytes: new Uint8Array(0),
          };
          objects.set(key, object);
          uploads.delete(uploadId);
          return object;
        }),
      };
      uploads.set(uploadId, { upload, parts });
      return upload;
    }),
    put: vi.fn(async (key, body, options = {}) => {
      if (options.onlyIf?.etagDoesNotMatch === '*' && objects.has(key)) return null;
      if (options.onlyIf?.etagMatches && objects.get(key)?.etag !== options.onlyIf.etagMatches)
        return null;
      const bytes = new Uint8Array(await new Response(body).arrayBuffer());
      const object = {
        key,
        size: bytes.length,
        uploaded: new Date(),
        httpEtag: '"test-etag"',
        etag: crypto.randomUUID(),
        customMetadata: options.customMetadata,
      };
      objects.set(key, { ...object, bytes });
      return object;
    }),
    head: vi.fn(async (key) => {
      const value = objects.get(key);
      return value ? { ...value } : null;
    }),
    get: vi.fn(async (key, options = {}) => {
      const value = objects.get(key);
      if (!value) return null;
      const bytes = options.range
        ? value.bytes.slice(options.range.offset, options.range.offset + options.range.length)
        : value.bytes;
      return {
        ...value,
        body: new Response(bytes).body,
        json: async () => JSON.parse(new TextDecoder().decode(value.bytes)),
      };
    }),
    delete: vi.fn(async (key) => {
      for (const item of Array.isArray(key) ? key : [key]) objects.delete(item);
    }),
    list: vi.fn(async (options) => ({
      objects: [...objects.values()]
        .filter((object) => object.key.startsWith(options.prefix))
        .sort((a, b) => a.key.localeCompare(b.key)),
      truncated: false,
    })),
  };
}

function createEnv() {
  return { FILES: createBucket(), LINKS_ADMIN_TOKEN: token };
}

function call(env, path = '/api/files', options = {}, authenticated = false) {
  return worker.fetch(
    new Request(`${origin}${path}`, {
      ...options,
      headers: {
        ...(authenticated ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    }),
    env,
  );
}

async function upload(
  env,
  name = '资料.html',
  body = '<script>alert(1)</script>',
  description = '',
  folderId = '',
) {
  if (!folderId) folderId = await fixtureFolder(env);
  const response = await call(
    env,
    `/api/files?name=${encodeURIComponent(name)}&description=${encodeURIComponent(description)}&folderId=${encodeURIComponent(folderId)}`,
    {
      method: 'POST',
      headers: { 'Content-Length': String(new TextEncoder().encode(body).length) },
      body,
    },
    true,
  );
  expect(response.status).toBe(201);
  return (await response.json()).file;
}

async function saveSettings(env, settings) {
  return call(
    env,
    '/api/files/settings',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    },
    true,
  );
}

async function createFolder(env, name) {
  const response = await call(
    env,
    '/api/files/folders',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    },
    true,
  );
  expect(response.status).toBe(201);
  return (await response.json()).folder;
}

async function fixtureFolder(env) {
  const existing = [...env.FILES.objects.values()].find((item) => item.key.startsWith('folders/'));
  return existing
    ? existing.key.slice('folders/'.length)
    : (await createFolder(env, 'Test uploads')).id;
}

async function patchFile(env, id, patch) {
  return call(
    env,
    `/api/files/${id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    },
    true,
  );
}

beforeEach(() => vi.stubGlobal('FixedLengthStream', TestFixedLengthStream));
afterEach(() => vi.unstubAllGlobals());

function jsonCall(env, path, value, authenticated = true) {
  return call(
    env,
    path,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    },
    authenticated,
  );
}

async function startMultipart(env, size = 8, patch = {}) {
  const folderId = 'folderId' in patch ? patch.folderId : await fixtureFolder(env);
  const response = await jsonCall(env, '/api/files/uploads', {
    name: 'large.bin',
    size,
    folderId,
    ...patch,
  });
  expect(response.status).toBe(201);
  return response.json();
}

function uploadPath(session) {
  return `/api/files/uploads/${session.id}/${encodeURIComponent(session.uploadId)}`;
}

async function sendPart(env, session, number = 1, size = 8) {
  let remaining = size;
  const body = new ReadableStream({
    pull(controller) {
      if (remaining === 0) {
        controller.close();
        return;
      }
      const chunk = new Uint8Array(Math.min(64 * 1024, remaining));
      remaining -= chunk.length;
      controller.enqueue(chunk);
    },
  });
  const response = await call(
    env,
    `${uploadPath(session)}/parts/${number}`,
    {
      method: 'PUT',
      headers: { 'Content-Length': String(size) },
      body,
      duplex: 'half',
    },
    true,
  );
  expect(response.status).toBe(200);
  return response.json();
}

function expectUploadClean(env, session) {
  expect(env.FILES.uploads.size).toBe(0);
  expect(
    [...env.FILES.objects.keys()].filter((key) => key.startsWith(`uploads/${session.id}/`)),
  ).toEqual([]);
  expect(env.FILES.objects.has(`files/${session.id}`)).toBe(false);
  expect(env.FILES.objects.has(`file-records/${session.id}`)).toBe(false);
}

describe('multipart uploads', () => {
  it('requires an existing destination folder at init and rejects old root sessions at completion', async () => {
    const env = createEnv();
    for (const folderId of [undefined, null, '', 'invalid', `folder-${crypto.randomUUID()}`]) {
      const response = await jsonCall(env, '/api/files/uploads', {
        name: 'new.bin',
        size: 8,
        folderId,
      });
      expect(response.status).toBe(400);
    }
    expect(env.FILES.createMultipartUpload).not.toHaveBeenCalled();
    expect(env.FILES.objects.size).toBe(0);
    const oldSession = await startMultipart(env);
    const part = await sendPart(env, oldSession);
    const record = env.FILES.objects.get(`uploads/${oldSession.id}/session.json`);
    const value = JSON.parse(new TextDecoder().decode(record.bytes));
    record.bytes = new TextEncoder().encode(JSON.stringify({ ...value, folderId: null }));
    expect(
      (await jsonCall(env, `${uploadPath(oldSession)}/complete`, { parts: [part] })).status,
    ).toBe(409);
    expectUploadClean(env, oldSession);
  });
  it('keeps legacy limits, permits 5 GiB settings, and rejects invalid session inputs', async () => {
    const env = createEnv();
    expect(defaultRepositorySettings().maxUploadMiB).toBe(1024);
    await saveSettings(env, { ...defaultRepositorySettings(), maxUploadMiB: 50 });
    expect((await (await call(env)).json()).settings.maxUploadMiB).toBe(50);
    await saveSettings(env, { ...defaultRepositorySettings(), maxUploadMiB: 5120 });
    const maximum = await startMultipart(env, 5120 * 1024 * 1024);
    await call(env, uploadPath(maximum), { method: 'DELETE' }, true);
    for (const patch of [
      { size: 0 },
      { size: -1 },
      { size: 1.5 },
      { size: '8' },
      { name: '../x' },
      { description: 'x'.repeat(401) },
      { folderId: 'missing' },
    ]) {
      expect(
        (await jsonCall(env, '/api/files/uploads', { name: 'x.bin', size: 8, ...patch })).status,
      ).toBe(400);
    }
    expect(
      (
        await jsonCall(env, '/api/files/uploads', {
          name: 'large.bin',
          size: 5120 * 1024 * 1024 + 1,
        })
      ).status,
    ).toBe(413);
    expect(env.FILES.uploads.size).toBe(0);
  });

  it('requires authorization for init, every part, completion, and cancellation', async () => {
    const env = createEnv();
    const session = await startMultipart(env);
    for (const [path, method] of [
      ['/api/files/uploads', 'POST'],
      [`${uploadPath(session)}/parts/1`, 'PUT'],
      [`${uploadPath(session)}/complete`, 'POST'],
      [uploadPath(session), 'DELETE'],
    ]) {
      expect((await call(env, path, { method })).status).toBe(401);
    }
    expect(
      (await call(env, `/api/files/uploads/${session.id}/wrong/parts/1`, { method: 'PUT' }, true))
        .status,
    ).toBe(404);
    expect(env.FILES.uploads.size).toBe(1);
  });

  it('publishes only after completion and makes completion idempotent and cancellation safe', async () => {
    const env = createEnv();
    const session = await startMultipart(env);
    const multipart = env.FILES.uploads.get(session.uploadId).upload;
    expect((await (await call(env)).json()).files).toEqual([]);
    const part = await sendPart(env, session);
    expect((await call(env, `/api/files/${session.id}`)).status).toBe(404);
    const completed = await jsonCall(env, `${uploadPath(session)}/complete`, { parts: [part] });
    expect(completed.status).toBe(200);
    const file = (await completed.json()).file;
    expect(file.id).toBe(session.id);
    expect(file.size).toBe(8);
    expect((await (await call(env)).json()).files).toEqual([file]);
    expect(
      (await (await jsonCall(env, `${uploadPath(session)}/complete`, { parts: [part] })).json())
        .file,
    ).toEqual(file);
    expect(multipart.complete).toHaveBeenCalledTimes(1);
    expect((await call(env, uploadPath(session), { method: 'DELETE' }, true)).status).toBe(409);
    expect(env.FILES.objects.has(`file-records/${session.id}`)).toBe(true);
    await call(env, `/api/files/${session.id}`, { method: 'DELETE' }, true);
    expectUploadClean(env, session);
  });

  it('streams a full 32 MiB part plus a short final part and allows replacing a part', async () => {
    const env = createEnv();
    const size = 32 * 1024 * 1024 + 3;
    const session = await startMultipart(env, size);
    const part1 = await sendPart(env, session, 1, 32 * 1024 * 1024);
    const old = await sendPart(env, session, 2, 3);
    const part2 = await sendPart(env, session, 2, 3);
    expect(part2.etag).not.toBe(old.etag);
    const response = await jsonCall(env, `${uploadPath(session)}/complete`, {
      parts: [part1, part2],
    });
    expect(response.status).toBe(200);
    expect((await response.json()).file.size).toBe(size);
  });

  it('rejects missing, duplicate, out-of-order and forged completion receipts and cleans all parts', async () => {
    for (const makeParts of [
      () => [],
      (part) => [part, part],
      (part) => [{ ...part, partNumber: 2 }],
      (part) => [{ ...part, etag: 'forged' }],
    ]) {
      const env = createEnv();
      const session = await startMultipart(env);
      const part = await sendPart(env, session);
      const response = await jsonCall(env, `${uploadPath(session)}/complete`, {
        parts: makeParts(part),
      });
      expect(response.status).toBe(400);
      expectUploadClean(env, session);
    }
  });

  it('enforces actual and declared part lengths and rejects missing lengths or part numbers', async () => {
    for (const [number, declared, body, status] of [
      [1, '7', '1234567', 400],
      [1, '8', 'short', 400],
      [1, null, '12345678', 411],
      [2, '8', '12345678', 400],
    ]) {
      const env = createEnv();
      const session = await startMultipart(env);
      const response = await call(
        env,
        `${uploadPath(session)}/parts/${number}`,
        { method: 'PUT', headers: declared ? { 'Content-Length': declared } : {}, body },
        true,
      );
      expect(response.status).toBe(status);
      expectUploadClean(env, session);
    }
  });

  it('cancels staged data without publishing it and tolerates repeated cancellation', async () => {
    const env = createEnv();
    const session = await startMultipart(env);
    await sendPart(env, session);
    const cancelled = await call(env, uploadPath(session), { method: 'DELETE' }, true);
    expect(cancelled.status).toBe(200);
    expect(await cancelled.json()).toEqual({ aborted: true });
    expectUploadClean(env, session);
    expect((await call(env, uploadPath(session), { method: 'DELETE' }, true)).status).toBe(200);
    expect((await jsonCall(env, `${uploadPath(session)}/complete`, { parts: [] })).status).toBe(
      404,
    );
  });

  it('protects completion from a concurrent cancel or new part', async () => {
    const env = createEnv();
    const session = await startMultipart(env);
    await env.FILES.put(`uploads/${session.id}/claim.json`, '{}', {
      customMetadata: { operation: 'complete' },
    });
    expect((await call(env, uploadPath(session), { method: 'DELETE' }, true)).status).toBe(409);
    expect(
      (await call(env, `${uploadPath(session)}/parts/1`, { method: 'PUT' }, true)).status,
    ).toBe(409);
    expect(env.FILES.uploads.size).toBe(1);
  });

  it('cleans interrupted parts, malformed completion bodies, and expired sessions', async () => {
    const env = createEnv();
    const expired = await startMultipart(env);
    const record = env.FILES.objects.get(`uploads/${expired.id}/session.json`);
    const value = JSON.parse(new TextDecoder().decode(record.bytes));
    record.bytes = new TextEncoder().encode(
      JSON.stringify({ ...value, expiresAt: Date.now() - 1 }),
    );
    expect(
      (await call(env, `${uploadPath(expired)}/parts/1`, { method: 'PUT' }, true)).status,
    ).toBe(410);
    expectUploadClean(env, expired);
    const malformed = await startMultipart(env);
    const response = await call(
      env,
      `${uploadPath(malformed)}/complete`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' },
      true,
    );
    expect(response.status).toBe(400);
    expectUploadClean(env, malformed);
    const failed = await startMultipart(env);
    env.FILES.uploads
      .get(failed.uploadId)
      .upload.uploadPart.mockRejectedValueOnce(new Error('Storage unavailable'));
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(
        (
          await call(
            env,
            `${uploadPath(failed)}/parts/1`,
            { method: 'PUT', headers: { 'Content-Length': '8' }, body: '12345678' },
            true,
          )
        ).status,
      ).toBe(500);
      expectUploadClean(env, failed);
    } finally {
      logger.mockRestore();
    }
  });

  it('allows cancellation to be retried after an abort storage failure', async () => {
    const env = createEnv();
    const session = await startMultipart(env);
    env.FILES.uploads
      .get(session.uploadId)
      .upload.abort.mockRejectedValueOnce(new Error('Temporary storage failure'));
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect((await call(env, uploadPath(session), { method: 'DELETE' }, true)).status).toBe(500);
      expect(env.FILES.objects.has(`uploads/${session.id}/claim.json`)).toBe(false);
      expect((await call(env, uploadPath(session), { method: 'DELETE' }, true)).status).toBe(200);
      expectUploadClean(env, session);
    } finally {
      logger.mockRestore();
    }
  });

  it('rechecks the current size setting and destination folder before publishing', async () => {
    const env = createEnv();
    const session = await startMultipart(env, 2 * 1024 * 1024);
    await saveSettings(env, { ...defaultRepositorySettings(), maxUploadMiB: 1 });
    expect((await jsonCall(env, `${uploadPath(session)}/complete`, { parts: [] })).status).toBe(
      413,
    );
    expectUploadClean(env, session);
    const folder = await createFolder(env, 'Temporary');
    const second = await startMultipart(env, 8, { folderId: folder.id });
    const part = await sendPart(env, second);
    await call(env, `/api/files/folders/${folder.id}`, { method: 'DELETE' }, true);
    expect((await jsonCall(env, `${uploadPath(second)}/complete`, { parts: [part] })).status).toBe(
      409,
    );
    expectUploadClean(env, second);
  });

  it('rolls back completed binaries with a wrong total or failed metadata publication', async () => {
    const env = createEnv();
    const session = await startMultipart(env);
    const part = await sendPart(env, session);
    const multipart = env.FILES.uploads.get(session.uploadId).upload;
    const complete = multipart.complete.getMockImplementation();
    multipart.complete.mockImplementationOnce(async (parts) => ({
      ...(await complete(parts)),
      size: 9,
    }));
    expect((await jsonCall(env, `${uploadPath(session)}/complete`, { parts: [part] })).status).toBe(
      400,
    );
    expectUploadClean(env, session);
    const second = await startMultipart(env);
    const secondPart = await sendPart(env, second);
    const put = env.FILES.put.getMockImplementation();
    env.FILES.put.mockImplementation(async (key, body, options) => {
      if (key.startsWith('file-records/')) throw new Error('Publication failed');
      return put(key, body, options);
    });
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(
        (await jsonCall(env, `${uploadPath(second)}/complete`, { parts: [secondPart] })).status,
      ).toBe(500);
      expectUploadClean(env, second);
    } finally {
      logger.mockRestore();
    }
  });
});

describe('file repository API', () => {
  it('rejects new direct uploads to the root without creating folders or file data', async () => {
    const env = createEnv();
    for (const query of [
      '',
      '&folderId=',
      '&folderId=null',
      `&folderId=folder-${crypto.randomUUID()}`,
    ]) {
      const response = await call(
        env,
        `/api/files?name=new.txt${query}`,
        { method: 'POST', headers: { 'Content-Length': '1' }, body: 'x' },
        true,
      );
      expect(response.status).toBe(400);
    }
    expect(env.FILES.put).not.toHaveBeenCalled();
    expect((await (await call(env)).json()).folders).toEqual([]);
    expect((await (await call(env)).json()).files).toEqual([]);
  });

  it('does not publish a new root file if its destination is deleted while streaming', async () => {
    const env = createEnv();
    const folder = await createFolder(env, 'Temporary');
    const put = env.FILES.put.getMockImplementation();
    env.FILES.put.mockImplementation(async (key, body, options) => {
      const result = await put(key, body, options);
      if (key.startsWith('files/')) env.FILES.objects.delete(`folders/${folder.id}`);
      return result;
    });
    const response = await call(
      env,
      `/api/files?name=new.txt&folderId=${folder.id}`,
      { method: 'POST', headers: { 'Content-Length': '1' }, body: 'x' },
      true,
    );
    expect(response.status).toBe(409);
    expect(env.FILES.objects.size).toBe(0);
  });
  it('allows anonymous listing and reports an empty repository', async () => {
    const response = await call(createEnv());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      settings: defaultRepositorySettings(),
      folders: [],
      files: [],
      cursor: null,
    });
  });

  it('requires a valid token for every management operation', async () => {
    const env = createEnv();
    const file = await upload(env);
    const folder = await createFolder(env, 'Private folder');
    for (const [path, method] of [
      ['/api/files/admin', 'GET'],
      ['/api/files', 'POST'],
      ['/api/files/settings', 'PUT'],
      [`/api/files/${file.id}`, 'DELETE'],
      [`/api/files/${file.id}`, 'PATCH'],
      ['/api/files/folders', 'POST'],
      [`/api/files/folders/${folder.id}`, 'PATCH'],
      [`/api/files/folders/${folder.id}`, 'DELETE'],
    ]) {
      for (const authorization of ['', 'Bearer incorrect']) {
        const response = await call(env, path, {
          method,
          headers: { Authorization: authorization },
        });
        expect(response.status).toBe(401);
      }
    }
    expect(env.FILES.delete).not.toHaveBeenCalled();
    expect(env.FILES.put).toHaveBeenCalledTimes(4);
    env.LINKS_ADMIN_TOKEN = '';
    expect((await call(env, '/api/files/admin', {}, true)).status).toBe(503);
  });

  it('streams uploads, lists original Unicode names, and downloads identical bytes as attachments', async () => {
    const env = createEnv();
    const file = await upload(env);
    expect(file.name).toBe('资料.html');
    const listing = await (await call(env)).json();
    expect(listing.files).toEqual([file]);
    const downloaded = await call(env, `/api/files/${file.id}`);
    expect(downloaded.status).toBe(200);
    expect(downloaded.headers.get('content-type')).toBe('application/octet-stream');
    expect(downloaded.headers.get('content-disposition')).toContain(
      "filename*=UTF-8''%E8%B5%84%E6%96%99.html",
    );
    expect(downloaded.headers.get('x-content-type-options')).toBe('nosniff');
    expect(await downloaded.text()).toBe('<script>alert(1)</script>');
  });

  it('handles empty files and duplicate names without overwriting', async () => {
    const env = createEnv();
    const first = await upload(env, 'empty.txt', '');
    const second = await upload(env, 'empty.txt', '');
    expect(first.id).not.toBe(second.id);
    expect(first.size).toBe(0);
    expect(env.FILES.objects.size).toBe(5);
  });

  it('creates, lists, renames, and deletes user folders without presets', async () => {
    const env = createEnv();
    expect((await (await call(env)).json()).folders).toEqual([]);
    const folder = await createFolder(env, '  我的资料  ');
    expect(folder.name).toBe('我的资料');
    expect((await (await call(env)).json()).folders).toEqual([folder]);
    const renamed = await call(
      env,
      `/api/files/folders/${folder.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '教学资料' }),
      },
      true,
    );
    expect(renamed.status).toBe(200);
    expect((await renamed.json()).folder).toEqual({ ...folder, name: '教学资料' });
    expect(
      (await call(env, `/api/files/folders/${folder.id}`, { method: 'DELETE' }, true)).status,
    ).toBe(200);
    expect((await (await call(env)).json()).folders).toEqual([]);
    expect(
      (await call(env, `/api/files/folders/${folder.id}`, { method: 'DELETE' }, true)).status,
    ).toBe(404);
  });

  it('validates folder names and rejects normalized duplicates', async () => {
    const env = createEnv();
    await createFolder(env, 'Notes');
    for (const name of [' notes ', 'NOTES']) {
      expect(
        (
          await call(
            env,
            '/api/files/folders',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name }),
            },
            true,
          )
        ).status,
      ).toBe(409);
    }
    for (const name of ['', ' ', '../notes', 'a/b', 'a\\b', 'bad\nname', 'x'.repeat(81), null]) {
      expect(
        (
          await call(
            env,
            '/api/files/folders',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name }),
            },
            true,
          )
        ).status,
      ).toBe(400);
    }
    const second = await createFolder(env, 'Other notes');
    expect(
      (
        await call(
          env,
          `/api/files/folders/${second.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Notes' }),
          },
          true,
        )
      ).status,
    ).toBe(409);
    expect((await call(env, '/api/files/folders/invalid', { method: 'DELETE' }, true)).status).toBe(
      404,
    );
  });

  it('uploads into folders and moves files without changing their ID or binary', async () => {
    const env = createEnv();
    const first = await createFolder(env, 'First');
    const second = await createFolder(env, 'Second');
    const file = await upload(env, 'notes.txt', 'file bytes', 'Description', first.id);
    expect(file.folderId).toBe(first.id);
    expect((await (await call(env)).json()).files).toEqual([file]);
    expect(
      (await call(env, `/api/files/folders/${first.id}`, { method: 'DELETE' }, true)).status,
    ).toBe(409);
    const movedResponse = await patchFile(env, file.id, { folderId: second.id });
    expect(movedResponse.status).toBe(200);
    expect((await movedResponse.json()).file).toEqual({ ...file, folderId: second.id });
    expect(
      (await call(env, `/api/files/folders/${first.id}`, { method: 'DELETE' }, true)).status,
    ).toBe(200);
    const root = await patchFile(env, file.id, { folderId: null });
    expect(root.status).toBe(400);
    expect(await (await call(env, `/api/files/${file.id}`)).text()).toBe('file bytes');
    await call(env, `/api/files/${file.id}`, { method: 'DELETE' }, true);
    expect(
      (await call(env, `/api/files/folders/${second.id}`, { method: 'DELETE' }, true)).status,
    ).toBe(200);
  });

  it('rejects uploads and moves into missing or malformed folders', async () => {
    const env = createEnv();
    const file = await upload(env);
    const missingId = `folder-${crypto.randomUUID()}`;
    for (const folderId of [null, 'invalid', missingId, 123, '']) {
      expect((await patchFile(env, file.id, { folderId })).status).toBe(400);
    }
    const response = await call(
      env,
      `/api/files?name=x.txt&folderId=${missingId}`,
      { method: 'POST', headers: { 'Content-Length': '1' }, body: 'x' },
      true,
    );
    expect(response.status).toBe(400);
    expect((await (await call(env)).json()).files).toEqual([file]);
  });

  it('keeps legacy files and references to removed folders accessible at the repository root', async () => {
    const env = createEnv();
    const file = await upload(env);
    const record = env.FILES.objects.get(`file-records/${file.id}`);
    delete record.customMetadata.folderId;
    expect((await (await call(env)).json()).files[0].folderId).toBeNull();
    const details = await patchFile(env, file.id, {
      description: 'Legacy file kept for organization',
    });
    expect(details.status).toBe(200);
    expect((await details.json()).file.folderId).toBeNull();
    expect((await patchFile(env, file.id, { folderId: null })).status).toBe(400);
    const destination = await createFolder(env, 'Organized files');
    const moved = await patchFile(env, file.id, { folderId: destination.id });
    expect(moved.status).toBe(200);
    expect((await moved.json()).file.folderId).toBe(destination.id);
    const storedRecord = env.FILES.objects.get(`file-records/${file.id}`);
    storedRecord.customMetadata.folderId = `folder-${crypto.randomUUID()}`;
    expect((await (await call(env)).json()).files[0].folderId).toBeNull();
    expect((await call(env, `/api/files/${file.id}`)).status).toBe(200);
  });

  it('checks every metadata page before deleting a folder', async () => {
    const env = createEnv();
    const folder = await createFolder(env, 'A folder');
    const file = await upload(env, 'notes.txt', 'notes', '', folder.id);
    const record = env.FILES.objects.get(`file-records/${file.id}`);
    env.FILES.list.mockResolvedValueOnce({
      objects: [],
      truncated: true,
      cursor: 'second-metadata-page',
    });
    env.FILES.list.mockResolvedValueOnce({ objects: [record], truncated: false });
    const response = await call(env, `/api/files/folders/${folder.id}`, { method: 'DELETE' }, true);
    expect(response.status).toBe(409);
    expect(env.FILES.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: 'second-metadata-page' }),
    );
    expect(env.FILES.delete).not.toHaveBeenCalled();
  });

  it('hides folder names in public listings while public downloads are paused', async () => {
    const env = createEnv();
    const folder = await createFolder(env, 'My folder');
    await saveSettings(env, { ...defaultRepositorySettings(), publicEnabled: false });
    expect((await (await call(env)).json()).folders).toEqual([]);
    expect((await (await call(env, '/api/files/admin', {}, true)).json()).folders).toEqual([
      folder,
    ]);
  });

  it('edits a file name and description without rewriting the binary or changing the link', async () => {
    const env = createEnv();
    const file = await upload(env, 'old.txt', 'original bytes', 'Original description');
    expect(file.description).toBe('Original description');
    const response = await call(
      env,
      `/api/files/${file.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '新资料.txt', description: 'Updated description' }),
      },
      true,
    );
    expect(response.status).toBe(200);
    const updated = (await response.json()).file;
    expect(updated).toEqual({ ...file, name: '新资料.txt', description: 'Updated description' });
    expect(env.FILES.put).toHaveBeenLastCalledWith(
      `file-records/${file.id}`,
      expect.any(String),
      expect.objectContaining({ onlyIf: expect.any(Object) }),
    );
    expect((await (await call(env)).json()).files).toEqual([updated]);
    const download = await call(env, `/api/files/${file.id}`);
    expect(download.headers.get('content-disposition')).toContain(encodeURIComponent('新资料.txt'));
    expect(await download.text()).toBe('original bytes');
    env.FILES.objects.get(`file-records/${file.id}`).customMetadata.description = undefined;
    expect((await (await call(env)).json()).files[0].description).toBe('');
  });

  it('validates file metadata edits and reports concurrent deletion without recreating a file', async () => {
    const env = createEnv();
    const file = await upload(env);
    for (const value of [
      {},
      { name: '../x' },
      { name: '' },
      { description: 'x'.repeat(401) },
      { description: null },
    ]) {
      const response = await call(
        env,
        `/api/files/${file.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value),
        },
        true,
      );
      expect(response.status).toBe(400);
    }
    env.FILES.put.mockResolvedValueOnce(null);
    const conflict = await call(
      env,
      `/api/files/${file.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Changed' }),
      },
      true,
    );
    expect(conflict.status).toBe(409);
    expect((await (await call(env)).json()).files).toEqual([file]);
    await call(env, `/api/files/${file.id}`, { method: 'DELETE' }, true);
    const gone = await call(
      env,
      `/api/files/${file.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'renamed' }),
      },
      true,
    );
    expect(gone.status).toBe(404);
  });

  it('supports HEAD and byte-range download requests', async () => {
    const env = createEnv();
    const file = await upload(env, 'numbers.txt', '0123456789');
    const path = `/api/files/${file.id}`;
    const head = await call(env, path, { method: 'HEAD' });
    expect(head.headers.get('content-length')).toBe('10');
    expect(await head.text()).toBe('');
    const part = await call(env, path, { headers: { Range: 'bytes=3-6' } });
    expect(part.status).toBe(206);
    expect(part.headers.get('content-range')).toBe('bytes 3-6/10');
    expect(part.headers.get('content-length')).toBe('4');
    expect(await part.text()).toBe('3456');
    const suffix = await call(env, path, { headers: { Range: 'bytes=-3' } });
    expect(await suffix.text()).toBe('789');
    const invalid = await call(env, path, { headers: { Range: 'bytes=15-' } });
    expect(invalid.status).toBe(416);
    const changed = await call(env, path, {
      headers: { Range: 'bytes=3-', 'If-Range': '"old-etag"' },
    });
    expect(changed.status).toBe(200);
    expect(await changed.text()).toBe('0123456789');
  });

  it('pauses both public listings and direct links while managers retain access', async () => {
    const env = createEnv();
    const file = await upload(env);
    const settings = {
      ...defaultRepositorySettings(),
      publicEnabled: false,
      title: 'Shared Notes',
    };
    expect((await saveSettings(env, settings)).status).toBe(200);
    expect((await (await call(env)).json()).files).toEqual([]);
    expect((await call(env, `/api/files/${file.id}`)).status).toBe(403);
    expect((await call(env, `/api/files/${file.id}`, {}, true)).status).toBe(200);
    const admin = await (await call(env, '/api/files/admin', {}, true)).json();
    expect(admin.files).toHaveLength(1);
    expect(admin.settings).toEqual(settings);
    await saveSettings(env, { ...settings, publicEnabled: true });
    expect((await call(env, `/api/files/${file.id}`)).status).toBe(200);
  });

  it('validates settings and never lists or downloads the settings object', async () => {
    const env = createEnv();
    for (const patch of [
      { maxUploadMiB: 5121 },
      { maxUploadMiB: 0 },
      { publicEnabled: 'yes' },
      { title: '' },
    ]) {
      expect((await saveSettings(env, { ...defaultRepositorySettings(), ...patch })).status).toBe(
        400,
      );
    }
    await saveSettings(env, defaultRepositorySettings());
    expect((await (await call(env)).json()).files).toEqual([]);
    expect((await call(env, '/api/files/repository%2Fsettings.json')).status).toBe(404);
    expect((await call(env, '/api/files/settings', { method: 'GET' })).status).toBe(405);
  });

  it('rejects unsafe names, oversized files, and missing lengths before storing', async () => {
    const env = createEnv();
    const folderId = await fixtureFolder(env);
    env.FILES.put.mockClear();
    for (const name of ['../private', 'bad\nname', '', 'x'.repeat(181)]) {
      const response = await call(
        env,
        `/api/files?name=${encodeURIComponent(name)}&folderId=${folderId}`,
        { method: 'POST', headers: { 'Content-Length': '1' }, body: 'x' },
        true,
      );
      expect(response.status).toBe(400);
    }
    expect(
      (
        await call(
          env,
          `/api/files?name=big.zip&folderId=${folderId}`,
          { method: 'POST', headers: { 'Content-Length': String(96 * 1024 * 1024) }, body: 'x' },
          true,
        )
      ).status,
    ).toBe(413);
    expect(
      (
        await call(
          env,
          `/api/files?name=x.txt&folderId=${folderId}`,
          { method: 'POST', body: 'x' },
          true,
        )
      ).status,
    ).toBe(411);
    expect(env.FILES.put).not.toHaveBeenCalled();
  });

  it('enforces actual upload size and removes interrupted writes', async () => {
    const env = createEnv();
    const folderId = await fixtureFolder(env);
    const response = await call(
      env,
      `/api/files?name=x.txt&folderId=${folderId}`,
      { method: 'POST', headers: { 'Content-Length': '1' }, body: 'too long' },
      true,
    );
    expect(response.status).toBe(400);
    expect(env.FILES.objects.size).toBe(1);
    expect(env.FILES.delete).toHaveBeenCalled();
  });

  it('cleans up unpublished files if their metadata cannot be saved', async () => {
    const env = createEnv();
    const folderId = await fixtureFolder(env);
    const put = env.FILES.put.getMockImplementation();
    env.FILES.put.mockImplementation(async (key, body, options) => {
      if (key.startsWith('file-records/')) throw new Error('Storage unavailable');
      return put(key, body, options);
    });
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await call(
        env,
        `/api/files?name=x.txt&folderId=${folderId}`,
        { method: 'POST', headers: { 'Content-Length': '1' }, body: 'x' },
        true,
      );
      expect(response.status).toBe(500);
      expect(env.FILES.objects.size).toBe(1);
    } finally {
      logger.mockRestore();
    }
  });

  it('aborts the upload stream on early storage failure instead of hanging', async () => {
    const env = createEnv();
    const folderId = await fixtureFolder(env);
    env.FILES.put.mockRejectedValueOnce(new Error('Storage unavailable'));
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await call(
        env,
        `/api/files?name=x.txt&folderId=${folderId}`,
        { method: 'POST', headers: { 'Content-Length': '1' }, body: 'x' },
        true,
      );
      expect(response.status).toBe(500);
    } finally {
      logger.mockRestore();
    }
  });

  it('removes deleted files from the public list and download route', async () => {
    const env = createEnv();
    const file = await upload(env);
    expect((await call(env, `/api/files/${file.id}`, { method: 'DELETE' }, true)).status).toBe(200);
    expect((await (await call(env)).json()).files).toEqual([]);
    expect((await call(env, `/api/files/${file.id}`)).status).toBe(404);
  });

  it('passes pagination cursors through and does not fall back to static assets', async () => {
    const env = createEnv();
    env.FILES.list.mockImplementationOnce(async () => ({ objects: [], truncated: false }));
    env.FILES.list.mockResolvedValueOnce({ objects: [], truncated: true, cursor: 'next-page' });
    expect((await (await call(env)).json()).cursor).toBe('next-page');
    await call(env, '/api/files?cursor=next-page');
    expect(env.FILES.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: 'next-page', include: ['customMetadata'] }),
    );
    expect((await call(env, '/api/files/missing')).status).toBe(404);
    expect((await call(env, '/api/files', { method: 'PATCH' })).status).toBe(405);
    expect((await call({}, '/api/files')).status).toBe(503);
  });
});

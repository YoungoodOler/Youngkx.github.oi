import path from 'node:path';
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestHarness } from 'wrangler';
import { defaultRepositorySettings } from '../lib/file-repository.ts';

const testToken = 'local-runtime-test-token';
const authorization = { Authorization: `Bearer ${testToken}` };
let serverUrl;
let testFolder;
const server = createTestHarness({
  workers: [
    {
      config: {
        name: 'file-repository-test',
        main: path.resolve('cloudflare/worker.ts'),
        compatibility_date: '2026-08-03',
        compatibility_flags: ['nodejs_compat'],
        vars: { LINKS_ADMIN_TOKEN: testToken },
        r2_buckets: [{ binding: 'FILES', bucket_name: 'file-repository-test' }],
      },
    },
  ],
});

beforeAll(async () => {
  serverUrl = (await server.listen()).url;
  const response = await server.fetch('/api/files/folders', {
    method: 'POST',
    headers: { ...authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test uploads' }),
  });
  if (response.status !== 201) throw new Error('Unable to create isolated upload fixture.');
  testFolder = (await response.json()).folder;
}, 30_000);
afterAll(async () => {
  await server.close();
}, 30_000);

async function upload(name, bytes, description = '', folderId = '') {
  if (!folderId) folderId = testFolder.id;
  const response = await fetch(
    new URL(
      `/api/files?name=${encodeURIComponent(name)}&description=${encodeURIComponent(description)}&folderId=${encodeURIComponent(folderId)}`,
      serverUrl,
    ),
    {
      method: 'POST',
      headers: { ...authorization, 'Content-Type': 'application/octet-stream' },
      body: bytes,
    },
  );
  expect(response.status).toBe(201);
  return (await response.json()).file;
}

async function saveSettings(settings) {
  const response = await server.fetch('/api/files/settings', {
    method: 'PUT',
    headers: { ...authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  expect(response.status).toBe(200);
}

describe('file repository in the actual Workers runtime', () => {
  it('authenticates with the Workers timing-safe token check', async () => {
    const denied = await server.fetch('/api/files/admin', {
      headers: { Authorization: 'Bearer wrong-token' },
    });
    expect(denied.status).toBe(401);
    const allowed = await server.fetch('/api/files/admin', { headers: authorization });
    expect(allowed.status).toBe(200);
    expect((await allowed.json()).files).toEqual([]);
  });

  it('stores Unicode names and binary streams, supports ranges, and removes deleted files', async () => {
    const bytes = new Uint8Array(128 * 1024).map((_, index) => index % 256);
    const file = await upload('物理复习资料.zip', bytes, '物理复习资料和配套答案');
    expect(file.description).toBe('物理复习资料和配套答案');
    const response = await server.fetch(`/api/files/${file.id}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-length')).toBe(String(bytes.length));
    expect(response.headers.get('content-disposition')).toContain(
      "filename*=UTF-8''%E7%89%A9%E7%90%86",
    );
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
    const part = await server.fetch(`/api/files/${file.id}`, { headers: { Range: 'bytes=2-5' } });
    expect(part.status).toBe(206);
    expect(part.headers.get('content-range')).toBe(`bytes 2-5/${bytes.length}`);
    expect(new Uint8Array(await part.arrayBuffer())).toEqual(bytes.slice(2, 6));
    const listing = await (await server.fetch('/api/files')).json();
    expect(listing.files).toContainEqual(file);
    const patch = await server.fetch(`/api/files/${file.id}`, {
      method: 'PATCH',
      headers: { ...authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '已修订的资料.zip', description: '更新后的说明' }),
    });
    expect(patch.status).toBe(200);
    expect((await patch.json()).file).toEqual({
      ...file,
      name: '已修订的资料.zip',
      description: '更新后的说明',
    });
    const renamed = await server.fetch(`/api/files/${file.id}`);
    expect(renamed.headers.get('content-disposition')).toContain(
      encodeURIComponent('已修订的资料.zip'),
    );
    expect(new Uint8Array(await renamed.arrayBuffer())).toEqual(bytes);
    expect(
      (await server.fetch(`/api/files/${file.id}`, { method: 'DELETE', headers: authorization }))
        .status,
    ).toBe(200);
    expect((await server.fetch(`/api/files/${file.id}`)).status).toBe(404);
  });

  it('accepts a zero-byte file and blocks public direct links when paused', async () => {
    const file = await upload('empty.txt', new Uint8Array(0));
    expect(file.size).toBe(0);
    await saveSettings({ ...defaultRepositorySettings(), publicEnabled: false });
    expect((await server.fetch(`/api/files/${file.id}`)).status).toBe(403);
    expect((await (await server.fetch('/api/files')).json()).files).toEqual([]);
    const adminDownload = await server.fetch(`/api/files/${file.id}`, { headers: authorization });
    expect(adminDownload.status).toBe(200);
    expect((await adminDownload.arrayBuffer()).byteLength).toBe(0);
    expect(
      (await (await server.fetch('/api/files/admin', { headers: authorization })).json()).files,
    ).toHaveLength(1);
    await saveSettings(defaultRepositorySettings());
    expect(
      (await server.fetch(`/api/files/${file.id}`, { method: 'HEAD' })).headers.get(
        'content-length',
      ),
    ).toBe('0');
    await server.fetch(`/api/files/${file.id}`, { method: 'DELETE', headers: authorization });
  });

  it('enforces the configured upload limit before writing the body', async () => {
    await saveSettings({ ...defaultRepositorySettings(), maxUploadMiB: 1 });
    const response = await fetch(
      new URL(`/api/files?name=large.bin&folderId=${testFolder.id}`, serverUrl),
      {
        method: 'POST',
        headers: authorization,
        body: new Uint8Array(1024 * 1024 + 1),
      },
    );
    expect(response.status).toBe(413);
    expect((await (await server.fetch('/api/files')).json()).files).toEqual([]);
  });

  it('creates folders and moves files through real R2 metadata without breaking downloads', async () => {
    const created = await server.fetch('/api/files/folders', {
      method: 'POST',
      headers: { ...authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '我的文件夹' }),
    });
    expect(created.status).toBe(201);
    const folder = (await created.json()).folder;
    const file = await upload(
      'notes.txt',
      new TextEncoder().encode('notes in a folder'),
      '',
      folder.id,
    );
    expect(file.folderId).toBe(folder.id);
    const listing = await (await server.fetch('/api/files')).json();
    expect(listing.folders).toContainEqual(folder);
    expect(listing.files).toContainEqual(file);
    expect(
      (
        await server.fetch(`/api/files/folders/${folder.id}`, {
          method: 'DELETE',
          headers: authorization,
        })
      ).status,
    ).toBe(409);
    const moved = await server.fetch(`/api/files/${file.id}`, {
      method: 'PATCH',
      headers: { ...authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId: testFolder.id }),
    });
    expect(moved.status).toBe(200);
    expect((await moved.json()).file.folderId).toBe(testFolder.id);
    const renamed = await server.fetch(`/api/files/folders/${folder.id}`, {
      method: 'PATCH',
      headers: { ...authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '新文件夹名称' }),
    });
    expect(renamed.status).toBe(200);
    expect((await renamed.json()).folder).toEqual({ ...folder, name: '新文件夹名称' });
    expect(
      (
        await server.fetch(`/api/files/folders/${folder.id}`, {
          method: 'DELETE',
          headers: authorization,
        })
      ).status,
    ).toBe(200);
    expect(await (await server.fetch(`/api/files/${file.id}`)).text()).toBe('notes in a folder');
    await server.fetch(`/api/files/${file.id}`, { method: 'DELETE', headers: authorization });
  });

  it('streams real multipart parts into R2 and verifies the completed download hash', async () => {
    await saveSettings(defaultRepositorySettings());
    const first = new Uint8Array(32 * 1024 * 1024).fill(173);
    const last = new Uint8Array(17).fill(29);
    const size = first.length + last.length;
    const initialized = await server.fetch('/api/files/uploads', {
      method: 'POST',
      headers: { ...authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '真实分片.zip', size, folderId: testFolder.id }),
    });
    expect(initialized.status).toBe(201);
    const session = await initialized.json();
    expect(session.partSizeMiB).toBe(32);
    const base = `/api/files/uploads/${session.id}/${encodeURIComponent(session.uploadId)}`;
    const parts = [];
    for (const [index, bytes] of [first, last].entries()) {
      const response = await fetch(new URL(`${base}/parts/${index + 1}`, serverUrl), {
        method: 'PUT',
        headers: authorization,
        body: bytes,
      });
      expect(response.status).toBe(200);
      parts.push(await response.json());
    }
    expect((await (await server.fetch('/api/files')).json()).files).toEqual([]);
    expect((await server.fetch(`/api/files/${session.id}`)).status).toBe(404);
    const complete = () =>
      server.fetch(`${base}/complete`, {
        method: 'POST',
        headers: { ...authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts }),
      });
    const completed = await complete();
    expect(completed.status).toBe(200);
    const file = (await completed.json()).file;
    expect(file.size).toBe(size);
    expect((await (await complete()).json()).file).toEqual(file);
    const response = await server.fetch(`/api/files/${session.id}`);
    expect(response.headers.get('content-length')).toBe(String(size));
    const actual = createHash('sha256');
    for await (const chunk of response.body) actual.update(chunk);
    const expected = createHash('sha256').update(first).update(last).digest('hex');
    expect(actual.digest('hex')).toBe(expected);
    expect((await server.fetch(base, { method: 'DELETE', headers: authorization })).status).toBe(
      409,
    );
    await server.fetch(`/api/files/${session.id}`, { method: 'DELETE', headers: authorization });
    const environment = await server.getWorker().getEnv();
    expect((await environment.FILES.list({ prefix: `uploads/${session.id}/` })).objects).toEqual(
      [],
    );
  }, 30_000);

  it('aborts actual R2 uploads on cancellation or corrupted completion receipts', async () => {
    for (const corrupt of [false, true]) {
      const response = await server.fetch('/api/files/uploads', {
        method: 'POST',
        headers: { ...authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'staged.bin', size: 8, folderId: testFolder.id }),
      });
      const session = await response.json();
      const base = `/api/files/uploads/${session.id}/${encodeURIComponent(session.uploadId)}`;
      const part = await (
        await fetch(new URL(`${base}/parts/1`, serverUrl), {
          method: 'PUT',
          headers: authorization,
          body: new Uint8Array(8),
        })
      ).json();
      const result = corrupt
        ? await server.fetch(`${base}/complete`, {
            method: 'POST',
            headers: { ...authorization, 'Content-Type': 'application/json' },
            body: JSON.stringify({ parts: [{ ...part, etag: 'wrong-etag' }] }),
          })
        : await server.fetch(base, { method: 'DELETE', headers: authorization });
      expect(result.status).toBe(corrupt ? 400 : 200);
      const environment = await server.getWorker().getEnv();
      expect((await environment.FILES.list({ prefix: `uploads/${session.id}/` })).objects).toEqual(
        [],
      );
      expect(await environment.FILES.head(`files/${session.id}`)).toBeNull();
      expect((await (await server.fetch('/api/files')).json()).files).toEqual([]);
    }
  });

  it('rejects direct and multipart root uploads in the actual runtime', async () => {
    for (const folderId of [undefined, null, '']) {
      const query =
        folderId === undefined ? '' : `&folderId=${encodeURIComponent(folderId ?? 'null')}`;
      const direct = await fetch(new URL(`/api/files?name=new.txt${query}`, serverUrl), {
        method: 'POST',
        headers: authorization,
        body: 'x',
      });
      expect(direct.status).toBe(400);
      const multipart = await server.fetch('/api/files/uploads', {
        method: 'POST',
        headers: { ...authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'new.txt', size: 1, folderId }),
      });
      expect(multipart.status).toBe(400);
    }
    expect((await (await server.fetch('/api/files')).json()).files).toEqual([]);
  });

  it('keeps legacy root files readable and editable until moved into a user folder', async () => {
    const environment = await server.getWorker().getEnv();
    const id = `${String(9_999_999_999_999 - Date.now()).padStart(13, '0')}-${crypto.randomUUID()}`;
    const bytes = 'legacy file bytes';
    const uploadedAt = new Date().toISOString();
    await environment.FILES.put(`files/${id}`, bytes);
    await environment.FILES.put(
      `file-records/${id}`,
      JSON.stringify({ id, name: 'legacy.txt', size: bytes.length, uploadedAt }),
      {
        customMetadata: { name: 'legacy.txt', size: String(bytes.length), uploadedAt },
      },
    );
    const patch = (value) =>
      server.fetch(`/api/files/${id}`, {
        method: 'PATCH',
        headers: { ...authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      });
    expect((await (await server.fetch('/api/files')).json()).files[0].folderId).toBeNull();
    expect((await patch({ folderId: null })).status).toBe(400);
    const edited = await patch({ description: 'Preserved legacy file' });
    expect(edited.status).toBe(200);
    expect((await edited.json()).file.folderId).toBeNull();
    const moved = await patch({ folderId: testFolder.id });
    expect(moved.status).toBe(200);
    expect((await moved.json()).file.folderId).toBe(testFolder.id);
    expect(await (await server.fetch(`/api/files/${id}`)).text()).toBe(bytes);
    await server.fetch(`/api/files/${id}`, { method: 'DELETE', headers: authorization });
  });
});

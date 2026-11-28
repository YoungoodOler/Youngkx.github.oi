import { describe, expect, it, vi } from 'vitest';
import worker from '../cloudflare/worker.ts';
import friendLinksSnapshot from '../content/friend-links.json';

function createAssets() {
  return {
    fetch: vi.fn(async () => new Response('asset response', { status: 200 })),
  };
}

function createKv(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  return {
    get: vi.fn(async (key) => values.get(key) ?? null),
    put: vi.fn(async (key, nextValue) => {
      values.set(key, JSON.parse(nextValue));
    }),
  };
}

function createEnv(options = {}) {
  return {
    ASSETS: options.assets ?? createAssets(),
    LINKS: options.links ?? createKv(),
    LINKS_ADMIN_TOKEN: options.token ?? 'test-admin-token',
    LINKS_LOCAL_PREVIEW: options.localPreview,
    LINKS_PUBLISH_TOKEN: options.publishToken,
  };
}

const validDirectory = {
  version: 1,
  updatedAt: null,
  groups: [
    {
      id: 'daily-tools',
      title: 'Daily Tools',
      description: 'Services used every day.',
      links: [
        {
          id: 'cloudflare',
          title: 'Cloudflare Dashboard',
          href: 'https://dash.cloudflare.com/',
          description: 'Manage domains and Workers.',
        },
      ],
    },
  ],
};

describe('Cloudflare Worker', () => {
  it('redirects the apex domain while preserving path and query', async () => {
    const assets = createAssets();
    const request = new Request('https://youngkx.cn/articles/?from=test');
    const response = await worker.fetch(request, createEnv({ assets }));

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://www.youngkx.cn/articles/?from=test');
    expect(assets.fetch).not.toHaveBeenCalled();
  });

  it('passes www requests directly to the static assets binding', async () => {
    const assets = createAssets();
    const request = new Request('https://www.youngkx.cn/categories/');
    const response = await worker.fetch(request, createEnv({ assets }));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('asset response');
    expect(assets.fetch).toHaveBeenCalledOnce();
    expect(assets.fetch).toHaveBeenCalledWith(request);
  });

  it('prevents the workers.dev mirror from being indexed', async () => {
    const assets = createAssets();
    const request = new Request('https://youngkxblog.example.workers.dev/articles/');
    const response = await worker.fetch(request, createEnv({ assets }));

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(await response.text()).toBe('asset response');
  });

  it('serves the bundled snapshot when only legacy useful links exist', async () => {
    const env = createEnv({ links: createKv({ 'directory:v1': validDirectory }) });
    const response = await worker.fetch(new Request('https://www.youngkx.cn/api/links'), env);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Friend-Links-Snapshot')).toBe(friendLinksSnapshot.updatedAt);
    expect(await response.json()).toEqual(friendLinksSnapshot);
  });

  it('keeps the bundled revision when KV serves an older copy', async () => {
    const env = createEnv({ links: createKv({ 'friend-links:v1': validDirectory }) });
    const response = await worker.fetch(new Request('https://www.youngkx.cn/api/links'), env);

    expect(await response.json()).toEqual(friendLinksSnapshot);
  });

  it('requires the production admin token before saving', async () => {
    const env = createEnv();
    const response = await worker.fetch(
      new Request('https://www.youngkx.cn/api/links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validDirectory),
      }),
      env,
    );

    expect(response.status).toBe(401);
    expect(env.LINKS.put).not.toHaveBeenCalled();
  });

  it('stores a validated directory with a matching production token', async () => {
    const env = createEnv();
    const response = await worker.fetch(
      new Request('https://www.youngkx.cn/api/links', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer test-admin-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validDirectory),
      }),
      env,
    );
    const saved = await response.json();

    expect(response.status).toBe(200);
    expect(saved.groups).toEqual(validDirectory.groups);
    expect(saved.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(env.LINKS.put).toHaveBeenCalledOnce();
    expect(env.LINKS.put).toHaveBeenCalledWith('friend-links:v1', JSON.stringify(saved));
  });

  it('rejects unsafe link protocols before writing to KV', async () => {
    const env = createEnv({ localPreview: 'true' });
    const unsafeDirectory = structuredClone(validDirectory);
    unsafeDirectory.groups[0].links[0].href = 'javascript:alert(1)';
    const response = await worker.fetch(
      new Request('http://127.0.0.1/api/links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unsafeDirectory),
      }),
      env,
    );

    expect(response.status).toBe(400);
    expect(env.LINKS.put).not.toHaveBeenCalled();
  });

  it('dispatches the saved revision to GitHub after writing it to KV', async () => {
    const env = createEnv({ publishToken: 'workflow-test-token' });
    const context = { waitUntil: vi.fn() };
    const originalFetch = globalThis.fetch;
    const dispatch = vi.fn(async () => {
      expect(env.LINKS.put).toHaveBeenCalledOnce();
      return new Response(null, { status: 204 });
    });
    globalThis.fetch = dispatch;
    try {
      const response = await worker.fetch(
        new Request('https://www.youngkx.cn/api/links', {
          method: 'PUT',
          headers: {
            Authorization: 'Bearer test-admin-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(validDirectory),
        }),
        env,
        context,
      );
      const saved = await response.json();

      expect(response.status).toBe(200);
      expect(context.waitUntil).toHaveBeenCalledOnce();
      await context.waitUntil.mock.calls[0][0];
      expect(dispatch).toHaveBeenCalledWith(
        expect.stringContaining('/workflows/publish-friend-links.yml/dispatches'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ref: 'main', inputs: { updated_at: saved.updatedAt } }),
        }),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('unlocks the manager only when the local preview flag is present', async () => {
    const local = await worker.fetch(
      new Request('https://www.youngkx.cn/api/links/admin'),
      createEnv({ token: '', localPreview: 'true' }),
    );
    const production = await worker.fetch(
      new Request('https://www.youngkx.cn/api/links/admin'),
      createEnv({ token: '' }),
    );

    expect(local.status).toBe(200);
    expect(production.status).toBe(503);
  });
});

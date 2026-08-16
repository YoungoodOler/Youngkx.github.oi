import { describe, expect, it, vi } from 'vitest';
import worker from '../cloudflare/worker.ts';

function createAssets() {
  return {
    fetch: vi.fn(async () => new Response('asset response', { status: 200 })),
  };
}

function createKv(initialValue = null) {
  let value = initialValue;
  return {
    get: vi.fn(async () => value),
    put: vi.fn(async (_key, nextValue) => {
      value = JSON.parse(nextValue);
    }),
  };
}

function createEnv(options = {}) {
  return {
    ASSETS: options.assets ?? createAssets(),
    LINKS: options.links ?? createKv(),
    LINKS_ADMIN_TOKEN: options.token ?? 'test-admin-token',
    LINKS_LOCAL_PREVIEW: options.localPreview,
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
          label: 'Service',
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

  it('returns an empty public directory when KV has not been initialized', async () => {
    const env = createEnv();
    const response = await worker.fetch(new Request('https://www.youngkx.cn/api/links'), env);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ version: 1, updatedAt: null, groups: [] });
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
    expect(production.status).toBe(401);
  });
});

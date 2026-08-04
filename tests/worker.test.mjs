import { describe, expect, it, vi } from 'vitest';
import worker from '../worker.ts';

function createAssets() {
  return {
    fetch: vi.fn(async () => new Response('asset response', { status: 200 })),
  };
}

describe('Cloudflare Worker', () => {
  it('redirects the apex domain while preserving path and query', async () => {
    const assets = createAssets();
    const request = new Request('https://youngkx.cn/articles/?from=test');
    const response = await worker.fetch(request, { ASSETS: assets });

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://www.youngkx.cn/articles/?from=test');
    expect(assets.fetch).not.toHaveBeenCalled();
  });

  it('passes www requests directly to the static assets binding', async () => {
    const assets = createAssets();
    const request = new Request('https://www.youngkx.cn/categories/');
    const response = await worker.fetch(request, { ASSETS: assets });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('asset response');
    expect(assets.fetch).toHaveBeenCalledOnce();
    expect(assets.fetch).toHaveBeenCalledWith(request);
  });

  it('prevents the workers.dev mirror from being indexed', async () => {
    const assets = createAssets();
    const request = new Request('https://youngkxblog.example.workers.dev/articles/');
    const response = await worker.fetch(request, { ASSETS: assets });

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(await response.text()).toBe('asset response');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../cloudflare/worker.ts';
import { authorizeManagement } from '../cloudflare/http.ts';

const bridgeOrigin = 'https://www.youngkx.cn';
const testToken = 'test-only-user-token';
const env = { LINKS_LOCAL_AUTH_ORIGIN: bridgeOrigin };

function request(host = 'localhost', token = testToken) {
  return new Request(`http://${host}/api/files/admin`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('local manage token verification', () => {
  it('reports missing configuration distinctly from an incorrect token', async () => {
    const missing = await worker.fetch(request(), {});
    expect(missing.status).toBe(503);
    expect((await missing.json()).code).toBe('MANAGE_TOKEN_NOT_CONFIGURED');
    const incorrect = await authorizeManagement(request(), {
      LINKS_ADMIN_TOKEN: 'different-test-token',
    });
    expect(incorrect.status).toBe(401);
  });

  it('uses only the fixed read-only verifier on explicitly enabled loopback hosts', async () => {
    const remote = vi.fn(async () => Response.json({ authorized: true }));
    vi.stubGlobal('fetch', remote);
    for (const host of ['localhost', '127.0.0.1', '[::1]']) {
      expect(await authorizeManagement(request(host), env)).toBeNull();
    }
    expect(remote).toHaveBeenCalledTimes(3);
    expect(remote).toHaveBeenLastCalledWith(
      `${bridgeOrigin}/api/links/admin`,
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: `Bearer ${testToken}` },
        redirect: 'error',
        cache: 'no-store',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('never forwards tokens from production, lookalike hosts, or arbitrary configured origins', async () => {
    const remote = vi.fn();
    vi.stubGlobal('fetch', remote);
    for (const host of [
      'www.youngkx.cn',
      'preview.example.workers.dev',
      'localhost.evil.example',
      '192.168.1.1',
      '127.0.0.2',
    ]) {
      expect((await authorizeManagement(request(host), env)).status).toBe(503);
    }
    for (const origin of [
      'https://evil.example',
      'http://www.youngkx.cn',
      'https://www.youngkx.cn.evil.example',
      'https://www.youngkx.cn/',
    ]) {
      expect(
        (await authorizeManagement(request(), { LINKS_LOCAL_AUTH_ORIGIN: origin })).status,
      ).toBe(503);
    }
    expect((await authorizeManagement(request(), {})).status).toBe(503);
    expect(remote).not.toHaveBeenCalled();
  });

  it('requires a bearer token and gives local secrets priority over remote verification', async () => {
    const remote = vi.fn();
    vi.stubGlobal('fetch', remote);
    expect((await authorizeManagement(request('localhost', ''), env)).status).toBe(401);
    expect(
      await authorizeManagement(request(), { ...env, LINKS_ADMIN_TOKEN: testToken }),
    ).toBeNull();
    expect(
      (await authorizeManagement(request(), { ...env, LINKS_ADMIN_TOKEN: 'other-test-token' }))
        .status,
    ).toBe(401);
    expect(remote).not.toHaveBeenCalled();
  });

  it('preserves invalid-token failures and hides unexpected remote responses and network errors', async () => {
    const remote = vi.fn(async () => new Response('private upstream error', { status: 401 }));
    vi.stubGlobal('fetch', remote);
    expect((await authorizeManagement(request(), env)).status).toBe(401);
    for (const status of [301, 302, 403, 404, 500]) {
      remote.mockResolvedValueOnce(new Response('private upstream error', { status }));
      const response = await authorizeManagement(request(), env);
      expect(response.status).toBe(502);
      expect(await response.text()).not.toContain('private upstream error');
    }
    remote.mockRejectedValueOnce(new Error('network error containing private details'));
    const unavailable = await authorizeManagement(request(), env);
    expect(unavailable.status).toBe(502);
    expect((await unavailable.json()).code).toBe('LOCAL_TOKEN_VERIFICATION_UNAVAILABLE');
  });
});

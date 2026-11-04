import { describe, expect, it } from 'vitest';
import { readLimitedJson } from '../cloudflare/http.ts';

function streamedRequest(chunks, cancel = () => {}) {
  const encoder = new TextEncoder();
  let index = 0;
  const body = new ReadableStream({
    pull(controller) {
      if (index < chunks.length) controller.enqueue(encoder.encode(chunks[index++]));
      else controller.close();
    },
    cancel,
  });
  return new Request('https://example.test/', { method: 'POST', body, duplex: 'half' });
}

describe('bounded JSON request streams', () => {
  it('accepts an exact byte limit across chunk boundaries and releases the reader', async () => {
    const request = streamedRequest(['{"', 'a":', '1}']);
    expect(await readLimitedJson(request, 7)).toEqual({ a: 1 });
    expect(request.body.locked).toBe(false);
  });

  it('keeps the size error when canceling the upload also fails', async () => {
    const request = streamedRequest(['{"a":1}', 'more'], () =>
      Promise.reject(new Error('cancel failed')),
    );
    await expect(readLimitedJson(request, 3)).rejects.toThrow('BODY_TOO_LARGE');
    expect(request.body.locked).toBe(false);
  });

  it('releases the reader after invalid JSON or a stream failure', async () => {
    const invalid = streamedRequest(['{']);
    await expect(readLimitedJson(invalid)).rejects.toBeInstanceOf(SyntaxError);
    expect(invalid.body.locked).toBe(false);
    const body = new ReadableStream({
      start(controller) {
        controller.error(new Error('interrupted'));
      },
    });
    const interrupted = new Request('https://example.test/', {
      method: 'POST',
      body,
      duplex: 'half',
    });
    await expect(readLimitedJson(interrupted)).rejects.toThrow('interrupted');
    expect(body.locked).toBe(false);
  });

  it('rejects an oversized declared length without reading its body', async () => {
    const request = new Request('https://example.test/', {
      method: 'POST',
      body: '{}',
      headers: { 'Content-Length': '99' },
    });
    await expect(readLimitedJson(request, 2)).rejects.toThrow('BODY_TOO_LARGE');
    expect(request.bodyUsed).toBe(false);
  });
});

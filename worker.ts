const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === 'youngkx.cn') {
      url.hostname = 'www.youngkx.cn';
      return Response.redirect(url.toString(), 308);
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
} satisfies ExportedHandler<Env>;

export default worker;

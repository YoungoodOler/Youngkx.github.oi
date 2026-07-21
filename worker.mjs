export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === 'youngkx.cn') {
      url.hostname = 'www.youngkx.cn';
      return Response.redirect(url.toString(), 308);
    }

    return env.ASSETS.fetch(request);
  },
};

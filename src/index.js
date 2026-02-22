export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 🔐 LINEログイン開始
    if (url.pathname === "/login") {
      const redirectUri = `${url.origin}/callback`;

      const lineLoginUrl =
        "https://access.line.me/oauth2/v2.1/authorize" +
        `?response_type=code` +
        `&client_id=${env.LINE_CHANNEL_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=profile%20openid`;

      return Response.redirect(lineLoginUrl, 302);
    }

    // それ以外は静的配信
    return env.ASSETS.fetch(request);
  },
};

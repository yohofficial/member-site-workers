export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ① LINEログイン開始
    if (url.pathname === "/login") {
      const state = crypto.randomUUID();

      const redirectUri = `${url.origin}/callback`;

      const lineLoginUrl =
        "https://access.line.me/oauth2/v2.1/authorize" +
        `?response_type=code` +
        `&client_id=${env.LINE_CHANNEL_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${state}` +
        `&scope=profile%20openid`;

      return Response.redirect(lineLoginUrl, 302);
    }

    return new Response("Member Site 🌸");
  },
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 🔐 LINEログイン開始
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

    // 🔐 コールバック処理
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");

      if (!code) {
        return new Response("No code provided", { status: 400 });
      }

      const redirectUri = `${url.origin}/callback`;

      // ① トークン取得
      const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: redirectUri,
          client_id: env.LINE_CHANNEL_ID,
          client_secret: env.LINE_CHANNEL_SECRET,
        }),
      });

      const tokenData = await tokenRes.json();

      const accessToken = tokenData.access_token;

      // ② ユーザー情報取得
      const profileRes = await fetch("https://api.line.me/v2/profile", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const profile = await profileRes.json();

      const lineUserId = profile.userId;
      const displayName = profile.displayName;

      // ③ DB保存（未登録ならINSERT）
      await env.DB.prepare(`
        INSERT INTO users (line_user_id, display_name)
        VALUES (?, ?)
        ON CONFLICT(line_user_id)
        DO UPDATE SET display_name = excluded.display_name
      `)
        .bind(lineUserId, displayName)
        .run();

      // ④ セッションCookie発行
      return new Response("ログイン成功 🌸", {
        headers: {
          "Set-Cookie": `session=${lineUserId}; HttpOnly; Secure; Path=/; SameSite=Lax`,
          "Content-Type": "text/html; charset=UTF-8",
        },
      });
    }

    // デフォルト：login.html
    return env.ASSETS.fetch(request);
  },
};

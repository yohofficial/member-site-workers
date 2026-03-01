export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ───────────────
    // / ルート：ログイン画面表示
    // ───────────────
    if (url.pathname === "/") {
      // セッションチェック
      const session = getSession(request);
      if (session) {
        return Response.redirect("/mypage", 302);
      }

      // ログイン画面を返す
      return env.ASSETS.fetch(new Request(new URL("/views/login.html", request.url)));
    }

    // ───────────────
    // /login：LINEログイン開始
    // ───────────────
    if (url.pathname === "/login") {
      const redirectUri = `${url.origin}/callback`;
      // CSRF対策用のstate生成
      const state = btoa(Math.random().toString()).substring(0, 16);
      const lineLoginUrl =
        "https://access.line.me/oauth2/v2.1/authorize" +
        `?response_type=code` +
        `&client_id=${env.LINE_CHANNEL_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=profile%20openid` +
        `&state=${state}`;
      
      return new Response(null, {
        status: 302,
        headers: {
          Location: lineLoginUrl,
          "Set-Cookie": `oauth_state=${state}; HttpOnly; Path=/; Max-Age=300`
        }
      });
    }

    // ───────────────
    // /callback：LINE認証後処理
    // ───────────────
    //if (url.pathname === "/callback") {
      // ここで code をトークンに変換
      // ユーザーID取得 → セッション発行 → /mypage にリダイレクト
      // 実装詳細は後で追加
      //return new Response("Callback処理（未実装）", { status: 200 });
    //}
        // ───────────────
    // /callback
    // ───────────────
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");

      if (!code || !returnedState) {
        return new Response("Invalid callback", { status: 400 });
      }

      const cookies = parseCookies(request);
      if (cookies.oauth_state !== returnedState) {
        return new Response("Invalid state", { status: 400 });
      }

      // LINEトークン取得
      const tokenResp = await fetch("https://api.line.me/oauth2/v2.1/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: `${url.origin}/callback`,
          client_id: env.LINE_CHANNEL_ID,
          client_secret: env.LINE_CHANNEL_SECRET,
        }),
      });

      if (!tokenResp.ok) {
        return new Response("Token error", { status: 500 });
      }

      const tokenData = await tokenResp.json();

      // 仮：ユーザー識別子
      const sessionId = crypto.randomUUID();

      return new Response(null, {
        status: 302,
        headers: {
          Location: "/mypage",
          "Set-Cookie": [
            `session=${sessionId}; HttpOnly; Path=/; Max-Age=3600`,
            `oauth_state=; Path=/; Max-Age=0`
          ].join(", ")
        }
      });
    }

    // ───────────────
    // /mypage：マイページ表示
    // ───────────────
    if (url.pathname === "/mypage") {
      const session = getSession(request);
      if (!session) {
        return Response.redirect("/", 302);
      }
      return env.ASSETS.fetch(new Request(new URL("/views/mypage.html", request.url)));
    }

    return env.ASSETS.fetch(request);
  },
};

// ───────────────
// Cookie util
// ───────────────
function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";
  return Object.fromEntries(
    header.split(";").map(v => v.trim().split("="))
  );
}

function getSession(request) {
  const cookies = parseCookies(request);
  return cookies.session || null;
}

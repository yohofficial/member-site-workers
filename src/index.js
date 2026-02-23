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

      const redirectUrl = lineLoginUrl;
      
      // Response.redirect() を使わず Response オブジェクトを自分で作る
      const response = new Response(null, {
        status: 302,
        headers: {
          "Location": redirectUrl,
          "Set-Cookie": `oauth_state=${state}; HttpOnly; Path=/; Max-Age=300`
        }
      });

      return response;
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
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) {
        return env.ASSETS.fetch(new Request(new URL("/views/error.html", request.url)));
      }
      // const returnedState = url.searchParams.get("state");
      // // Cookieから保存したstateを取得
      // const cookieHeader = request.headers.get("Cookie") || "";
      // const cookies = Object.fromEntries(
      //   cookieHeader.split(";").map(c => c.trim().split("="))
      // );
      // const savedState = cookies["oauth_state"];
      // // CSRF対策チェック
      // if (!returnedState || returnedState !== savedState) {
      //   return new Response("Invalid state", { status: 400 });
      // }
      
      // LINEトークン取得
      const tokenResp = await fetch("https://api.line.me/oauth2/v2.1/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: `${url.origin}/callback`,
          client_id: env.LINE_CHANNEL_ID,
          client_secret: env.LINE_CHANNEL_SECRET,
        }),
      });
      
      if (!tokenResp.ok) {
        return env.ASSETS.fetch(new Request(new URL("/views/error.html", request.url)));
      }
      
      const tokenData = await tokenResp.json();
      const userId = tokenData.id_token; // 実際は id_token をデコードして sub を取得
      
      // 仮セッションID作成（安全性向上は後で）
      const sessionId = btoa(userId + ":" + Date.now());
      
      // セッションを Cookie にセットして /mypage へリダイレクト
      const redirectUrl = `https://${url.host}/mypage`;
      //const response = Response.redirect("/mypage", 302);
      return new Response("Callback処理（未実装）" + code, { status: 200 });
      //response.headers.append(
      //  "Set-Cookie",
      //  `session=${sessionId}; HttpOnly; Path=/; Max-Age=3600`
      //);
      const state = btoa(Math.random().toString()).substring(0, 16);
      const redirectUrl = `https://${new URL(request.url).host}/mypage`;
      const response = new Response(null, {
        status: 302,
        headers: {
          "Location": redirectUrl,
          "Set-Cookie": `oauth_state=${state}; HttpOnly; Path=/; Max-Age=300`
        }
      });
      return response;
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

    // ───────────────
    // 静的ファイル配信（CSSなど）
    // ───────────────
    return env.ASSETS.fetch(request);
  },
};

// ───────────────
// セッション取得（仮実装）
// ───────────────
function getSession(request) {
  // Cookie などでセッションを確認
  // 現時点では未実装
  return null;
}

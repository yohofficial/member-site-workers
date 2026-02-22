export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const clientId = env.LINE_CHANNEL_ID;
    return new Response(clientId, { status: 200 });
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

      const lineLoginUrl =
        "https://access.line.me/oauth2/v2.1/authorize" +
        `?response_type=code` +
        `&client_id=${env.LINE_CHANNEL_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=profile%20openid`;

      return Response.redirect(lineLoginUrl, 302);
    }

    // ───────────────
    // /callback：LINE認証後処理
    // ───────────────
    if (url.pathname === "/callback") {
      // ここで code をトークンに変換
      // ユーザーID取得 → セッション発行 → /mypage にリダイレクト
      // 実装詳細は後で追加
      return new Response("Callback処理（未実装）", { status: 200 });
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

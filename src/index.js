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
        //return new Response("Callback処理（未実装）" + session, { status: 200 });
        return env.ASSETS.fetch(new Request(new URL("/views/mypage.html", request.url)));
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

      // ② プロフィール取得
      const profileRes = await fetch("https://api.line.me/v2/profile", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      });

      const profile = await profileRes.json();
    
      // ③ ユーザー存在確認
      let user = await env.DB.prepare(
        "SELECT * FROM users WHERE line_user_id = ?"
      ).bind(profile.userId).first();

      // ④ なければ登録
      if (!user) {
        await env.DB.prepare(
          "INSERT INTO users (line_user_id, display_name, picture_url) VALUES (?, ?, ?)"
        ).bind(
          profile.userId,
          profile.displayName,
          profile.pictureUrl
        ).run();
    
        user = await env.DB.prepare(
          "SELECT * FROM users WHERE line_user_id = ?"
        ).bind(profile.userId).first();
      }
          
      // 仮：ユーザー識別子
      const sessionId = crypto.randomUUID();
      
      await env.DB.prepare(
        "INSERT INTO sessions (id, user_id) VALUES (?, ?)"
      ).bind(sessionId, user.id).run();
    
      // ⑥ Cookie保存してmypageへ
      return new Response(null, {
      status: 302,
      headers: {
        Location: "/mypage",
        "Set-Cookie": `session_id=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`
        }
      });
      const response = new Response(null, {
        status: 302,
        headers: {
          Location: "/mypage"
        }
      });
      response.headers.append(
        "Set-Cookie",
        `session_id=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`
      );
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
      // ① sessionテーブル確認
      const sessionRow = await env.DB.prepare(
        "SELECT * FROM sessions WHERE id = ?"
      ).bind(session).first();
    
      if (!sessionRow) {
        return Response.redirect("/", 302);
      }

      // ② users取得
      const user = await env.DB.prepare(
        "SELECT * FROM users WHERE id = ?"
      ).bind(sessionRow.user_id).first();
    
      if (!user) {
        return Response.redirect("/", 302);
      }
      return env.ASSETS.fetch(new Request(new URL("/views/mypage.html", request.url)));
    }
    if (url.pathname === "/api/me") {
      const session = getSession(request);
      if (!session) {
        return new Response(
          JSON.stringify({ error: "Not logged in" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
    
      // ① session確認
      const sessionRow = await env.DB.prepare(
        "SELECT * FROM sessions WHERE id = ?"
      ).bind(session).first();
    
      if (!sessionRow) {
        return new Response(
          JSON.stringify({ error: "Invalid session" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
    
      // ② user取得
      const user = await env.DB.prepare(
        "SELECT id, display_name, picture_url, points FROM users WHERE id = ?"
      ).bind(sessionRow.user_id).first();
    
      if (!user) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
    
      return new Response(
        JSON.stringify(user),
        { headers: { "Content-Type": "application/json" } }
      );
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
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split("=");

    if (key === "session_id") {
      return value;
    }
  }

  return null;
}

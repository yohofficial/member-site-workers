export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/login") {
      return new Response("LOGIN BRANCH HIT");
    }

    return new Response("ROOT BRANCH");
  },
};

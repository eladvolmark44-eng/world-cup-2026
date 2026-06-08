const SOFA_BASE = "https://api.sofascore.com/api/v1";

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url = new URL(request.url);
    const path = url.searchParams.get("path");
    if (!path) {
      return new Response(JSON.stringify({ error: "missing path" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const sofaUrl = `${SOFA_BASE}${path.startsWith("/") ? "" : "/"}${path}`;

    const sofaRes = await fetch(sofaUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.sofascore.com/",
        "Origin": "https://www.sofascore.com",
      },
    });

    const body = await sofaRes.text();
    return new Response(body, {
      status: sofaRes.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=30",
      },
    });
  },
};

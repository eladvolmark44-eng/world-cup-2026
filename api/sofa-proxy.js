// Vercel Serverless Function — SofaScore proxy
// SofaScore blocks Vercel/AWS IPs directly.
// When SOFA_WORKER_URL is set (pointing to a Cloudflare Worker), requests are
// relayed through Cloudflare's edge — a different IP range that SofaScore allows.
// See cloudflare-sofa-worker.js for the Worker code to deploy.
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { path } = req.query;
  if (!path) return res.status(400).json({ error: "missing path" });

  try {
    const normalizedPath = `${path.startsWith("/") ? "" : "/"}${path}`;
    let targetUrl;

    if (process.env.SOFA_WORKER_URL) {
      // Route through Cloudflare Worker (bypasses IP block)
      targetUrl = `${process.env.SOFA_WORKER_URL.replace(/\/$/, "")}?path=${encodeURIComponent(normalizedPath)}`;
    } else {
      // Direct fallback — may be blocked depending on Vercel region
      targetUrl = `https://api.sofascore.com/api/v1${normalizedPath}`;
    }

    const r = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.sofascore.com/",
        "Origin": "https://www.sofascore.com",
      },
    });

    const data = await r.json();
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate");
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Vercel Serverless Function — SofaScore proxy
// SofaScore blocks browser requests via CORS but allows server-to-server.
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { path } = req.query;
  if (!path) return res.status(400).json({ error: "missing path" });

  try {
    const url = `https://api.sofascore.com/api/v1${path.startsWith("/") ? "" : "/"}${path}`;
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "application/json",
      }
    });
    const data = await r.json();
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate");
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

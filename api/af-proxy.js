// Vercel Serverless Function — API-Football proxy
// The browser can't call v3.football.api-sports.io directly (CORS-blocked), so the
// client routes through here. The key is passed by the client (it's already a public
// VITE_ build var) and forwarded server-side, where no CORS restriction applies.
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { date, key } = req.query;
  // Prefer the server-side env key (API_FOOTBALL_KEY) so the client never ships a key;
  // fall back to a client-passed key or the alt AF_KEY name.
  const apiKey = process.env.API_FOOTBALL_KEY || process.env.AF_KEY || key || "";
  if (!apiKey) return res.status(400).json({ error: "missing key" });
  if (!date) return res.status(400).json({ error: "missing date" });

  try {
    const r = await fetch(`https://v3.football.api-sports.io/fixtures?date=${encodeURIComponent(date)}`, {
      headers: { "x-apisports-key": apiKey },
    });
    const data = await r.json();
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate");
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}

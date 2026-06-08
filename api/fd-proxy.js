// Vercel Serverless Function — football-data.org proxy
// Browser can't call football-data.org directly (CORS only allows localhost).
// This function runs server-side, so no CORS restriction applies.
const FD_TOKEN = "f00beef6d831482d97c454c546aacbab";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { path } = req.query;
  if (!path) return res.status(400).json({ error: "missing path" });

  try {
    const url = `https://api.football-data.org${path.startsWith("/") ? "" : "/"}${path}`;
    const r = await fetch(url, { headers: { "X-Auth-Token": FD_TOKEN } });
    const data = await r.json();
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate");
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

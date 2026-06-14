// Vercel Serverless Function — The Odds API proxy
// Why: the browser used to call api.the-odds-api.com directly from every user's
// device with a shared key. The free tier is 500 req/month, so N browsers each
// polling burned the quota in days (a 401 "Out of usage credits" then hid all odds).
// Routing through this function means Vercel's CDN serves one cached response to
// every client — only ~1 upstream call per cache window regardless of user count.
const ODDS_SPORT       = "soccer_fifa_world_cup";
const ODDS_REGIONS     = "eu";
const ODDS_MARKETS     = "h2h";
const ODDS_FORMAT      = "decimal";
const CDN_TTL_SECONDS  = 3600; // 1h shared CDN cache — collapses all users into one upstream call/hour

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ODDS_API_KEY env var not set" });

  try {
    const url = `https://api.the-odds-api.com/v4/sports/${ODDS_SPORT}/odds/`
      + `?apiKey=${apiKey}&regions=${ODDS_REGIONS}&markets=${ODDS_MARKETS}&oddsFormat=${ODDS_FORMAT}`;
    const upstream = await fetch(url);
    const data = await upstream.json();
    // Only let the CDN cache successful responses, so a transient quota/error
    // doesn't get pinned for an hour.
    if (upstream.ok) res.setHeader("Cache-Control", `s-maxage=${CDN_TTL_SECONDS}, stale-while-revalidate`);
    res.status(upstream.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Vercel Serverless Function — ESPN play-by-play proxy for red card data
// SofaScore is blocked from Vercel IPs; ESPN is free, public, no auth needed.
const TEAM_NAME_MAP = {
  "Mexico": "מקסיקו", "South Korea": "קוריאה", "South Africa": "דרום אפריקה",
  "Czech Republic": "צ'כיה", "Czechia": "צ'כיה",
  "Canada": "קנדה", "Switzerland": "שוויץ", "Qatar": "קטאר",
  "Bosnia and Herzegovina": "בוסניה והרצגובינה", "Bosnia-Herzegovina": "בוסניה והרצגובינה", "Bosnia": "בוסניה והרצגובינה",
  "Brazil": "ברזיל", "Morocco": "מרוקו", "Scotland": "סקוטלנד", "Haiti": "האיטי",
  "USA": 'ארה"ב', "United States": 'ארה"ב', "Australia": "אוסטרליה",
  "Paraguay": "פרגוואי", "Turkey": "טורקיה", "Türkiye": "טורקיה",
  "Germany": "גרמניה", "Ecuador": "אקוודור", "Ivory Coast": "חוף השנהב",
  "Cote d'Ivoire": "חוף השנהב", "Côte d'Ivoire": "חוף השנהב",
  "Curacao": "קוראסאו", "Curaçao": "קוראסאו",
  "Netherlands": "הולנד", "Japan": "יפן", "Tunisia": "תוניסיה",
  "Sweden": "שוודיה",
  "Spain": "ספרד", "Saudi Arabia": "ערב הסעודית", "Uruguay": "אורוגוואי",
  "Cape Verde": "כף ורדה",
  "Belgium": "בלגיה", "Iran": "איראן", "Egypt": "מצרים", "New Zealand": "ניו זילנד",
  "France": "צרפת", "Senegal": "סנגל", "Norway": "נורווגיה",
  "Iraq": "עיראק",
  "Argentina": "ארגנטינה", "Algeria": "אלג'יריה", "Austria": "אוסטריה", "Jordan": "ירדן",
  "Portugal": "פורטוגל", "Uzbekistan": "אוזבקיסטן", "Colombia": "קולומביה",
  "DR Congo": "קונגו דמוקרטית", "Congo DR": "קונגו דמוקרטית", "Democratic Republic of the Congo": "קונגו דמוקרטית",
  "England": "אנגליה", "Croatia": "קרואטיה", "Ghana": "גאנה", "Panama": "פנמה",
  "Chile": "צ'ילה",
  "Armenia": "ארמניה", "Kazakhstan": "קזחסטן", "Wales": "וויילס", "Romania": "רומניה",
  "Bolivia": "בוליביה",
  "Gibraltar": "גיברלטר", "Cayman Islands": "קיימן", "Cayman": "קיימן",
  "Albania": "אלבניה", "Luxembourg": "לוקסמבורג",
  "Central Español": "סנטרל אספניול", "Racing Montevideo": "ראסינג מונטבידאו", "Racing Club de Montevideo": "ראסינג מונטבידאו",
  "Comoros": "קומורו", "Comores": "קומורו",
  "Rwanda": "רואנדה",
  "El Salvador": "אל סלבדור",
  "Jamaica": "ג'מייקה",
  "Venezuela": "ונצואלה",
  "Honduras": "הונדורס",
  "Aruba": "ארובה",
};

function toHebrew(name) {
  return TEAM_NAME_MAP[name] || name;
}

function isRedCard(text) {
  const t = (text || "").toLowerCase();
  return t.includes("red card") || t.includes("second yellow") || t.includes("double yellow");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const date = req.query.date || new Date().toISOString().split("T")[0];
    const ymd = date.replace(/-/g, ""); // YYYYMMDD for ESPN
    const result = {};

    for (const slug of ["fifa.friendly", "intl.friendlies", "fifa.world"]) {
      let events;
      try {
        const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${ymd}`);
        const d = await r.json();
        events = d.events || [];
      } catch (e) { continue; }

      for (const ev of events) {
        const comp = ev.competitions?.[0];
        const state = comp?.status?.type?.state;
        if (state !== "post" && state !== "in") continue;

        const hC = comp.competitors?.find(c => c.homeAway === "home");
        const aC = comp.competitors?.find(c => c.homeAway === "away");
        if (!hC || !aC) continue;

        const hn = toHebrew(hC.team?.displayName);
        const an = toHebrew(aC.team?.displayName);

        // Try statistics from scoreboard first (works for some leagues)
        let hrc = (hC.statistics || []).find(s => s.name === "redCards")?.value ?? 0;
        let arc = (aC.statistics || []).find(s => s.name === "redCards")?.value ?? 0;

        // Fall back to play-by-play event parsing
        if (!hrc && !arc) {
          try {
            const pr = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/playbyplay?event=${ev.id}`);
            const pd = await pr.json();
            const plays = pd.plays || pd.gamePackageJSON?.plays || [];
            for (const play of plays) {
              if (!isRedCard(play.type?.text)) continue;
              const tid = play.team?.id;
              if (tid === hC.team?.id) hrc++;
              else if (tid === aC.team?.id) arc++;
            }
          } catch (e) {}
        }

        if (hrc > 0 || arc > 0) {
          result[`${hn}_${an}`] = { homeRedCards: hrc, awayRedCards: arc };
          result[`${an}_${hn}`] = { homeRedCards: arc, awayRedCards: hrc };
        }
      }
    }

    res.setHeader("Cache-Control", "public, max-age=30");
    return res.status(200).json(result);
  } catch (e) {
    return res.status(200).json({});
  }
}

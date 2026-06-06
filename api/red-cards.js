// Vercel Serverless Function — CORS-free SofaScore proxy for red card data
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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const date = req.query.date || new Date().toISOString().split("T")[0];
    const response = await fetch(
      `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${date}`,
      { headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.sofascore.com/" } }
    );

    if (!response.ok) return res.status(200).json({});

    const data = await response.json();
    const result = {};

    for (const ev of (data.events || [])) {
      const t = ev.status?.type;
      if (t !== "finished" && t !== "inprogress") continue;
      const hn = toHebrew(ev.homeTeam?.name);
      const an = toHebrew(ev.awayTeam?.name);
      const hrc = ev.homeRedCards ?? 0;
      const arc = ev.awayRedCards ?? 0;
      if (hrc > 0 || arc > 0) {
        result[`${hn}_${an}`] = { homeRedCards: hrc, awayRedCards: arc };
        result[`${an}_${hn}`] = { homeRedCards: arc, awayRedCards: hrc };
      }
    }

    res.setHeader("Cache-Control", "public, max-age=30");
    return res.status(200).json(result);
  } catch (e) {
    return res.status(200).json({});
  }
}

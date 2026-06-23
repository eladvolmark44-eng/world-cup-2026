// Vercel Serverless Function — syncs World Cup 2026 scores to Firebase
// Called by Vercel Cron every 3 minutes during tournament
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { fillMissingBets } from "./auto-bets.js";

// Match ID mapping: our internal IDs → API-Football fixture IDs
// We fetch from API and match by teams + date
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
  "Curaçao": "קוראסאו",
  "Kenya": "קניה", "Lesotho": "לסוטו",
  "Denmark": "דנמרק", "Ukraine": "אוקראינה",
  "Slovenia": "סלובניה", "Greece": "יוון", "Italy": "איטליה",
  "Guatemala": "גואטמלה",
  "Liechtenstein": "ליכטנשטיין", "Cyprus": "קפריסין",
  "Kosovo": "קוסובו", "Andorra": "אנדורה",
  "Afghanistan": "אפגניסטן", "Pakistan": "פקיסטן",
  "Oman": "עומאן", "Mozambique": "מוזמביק",
  "Maldives": "מלדיביים", "Bangladesh": "בנגלדש",
};

function toHebrew(name) {
  return TEAM_NAME_MAP[name] || name;
}

function initFirebase() {
  if (getApps().length > 0) return getFirestore();
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({ credential: cert(serviceAccount) });
  return getFirestore();
}

export default async function handler(req, res) {
  // Allow GET (cron) or POST (manual trigger)
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = initFirebase();
    const API_KEY = process.env.API_FOOTBALL_KEY;

    // Fetch all World Cup 2026 fixtures
    const response = await fetch(
      "https://v3.football.api-sports.io/fixtures?league=1&season=2026",
      {
        headers: {
          "x-apisports-key": API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const fixtures = data.response || [];

    if (fixtures.length === 0) {
      return res.status(200).json({ message: "No fixtures returned", remaining: data.parameters });
    }

    // Build results object
    const matches = {};
    const groups = {};
    let totalGoals = 0;
    let finishedCount = 0;

    for (const fixture of fixtures) {
      const { fixture: f, teams, goals, league } = fixture;
      const status = f.status.short; // FT, NS, 1H, 2H, HT, etc.
      const homeName = toHebrew(teams.home.name);
      const awayName = toHebrew(teams.away.name);

      // Only store results for finished or in-progress matches
      const isFinished = ["FT", "AET", "PEN"].includes(status);
      const isLive = ["1H", "2H", "HT", "ET", "BT", "P", "SUSP", "INT", "LIVE"].includes(status);

      if ((isFinished || isLive) && goals.home !== null && goals.away !== null) {
        // Store both orderings so we match regardless of how the API assigns home/away
        const minute = isLive ? (f.status.elapsed ?? null) : null;
        const isRC = e => (e.type==="Card") && (e.detail==="Red Card" || e.detail==="Yellow Red Card");
        const hrc = (fixture.events||[]).filter(e=>isRC(e)&&e.team?.id===teams.home.id).length;
        const arc = (fixture.events||[]).filter(e=>isRC(e)&&e.team?.id===teams.away.id).length;
        matches[`${homeName}_${awayName}`] = {
          home: goals.home,
          away: goals.away,
          status,
          live: isLive,
          minute,
          homeRedCards: hrc,
          awayRedCards: arc,
          fixtureId: f.id,
        };
        matches[`${awayName}_${homeName}`] = {
          home: goals.away,
          away: goals.home,
          status,
          live: isLive,
          minute,
          homeRedCards: arc,
          awayRedCards: hrc,
          fixtureId: f.id,
        };

        if (isFinished) {
          totalGoals += (goals.home + goals.away);
          finishedCount++;
        }
      }
    }

    // Also fetch friendly/test match results by date (±3h window)
    const TEST_DATES = ["2026-06-06", "2026-06-07"];
    for (const date of TEST_DATES) {
      const dayStart = new Date(date + "T00:00:00+03:00").getTime();
      const dayEnd   = new Date(date + "T23:59:00+03:00").getTime();
      if (Date.now() >= dayStart - 3*60*60*1000 && Date.now() <= dayEnd + 3*60*60*1000) {
        const rf = await fetch(
          `https://v3.football.api-sports.io/fixtures?date=${date}`,
          { headers: { "x-apisports-key": API_KEY } }
        );
        if (rf.ok) {
          const df = await rf.json();
          for (const fixture of (df.response || [])) {
            const { fixture: f, teams, goals } = fixture;
            const status = f.status.short;
            const homeName = toHebrew(teams.home.name);
            const awayName = toHebrew(teams.away.name);
            const isFinished = ["FT","AET","PEN"].includes(status);
            const isLive = ["1H","2H","HT","ET","BT","P","SUSP","INT","LIVE"].includes(status);
            if ((isFinished || isLive) && goals.home !== null && goals.away !== null) {
              // Store both orderings so we match regardless of how API assigns home/away
              const minute = isLive ? (f.status.elapsed ?? null) : null;
              const isRC = e => (e.type==="Card") && (e.detail==="Red Card" || e.detail==="Yellow Red Card");
              const hrc = (fixture.events||[]).filter(e=>isRC(e)&&e.team?.id===teams.home.id).length;
              const arc = (fixture.events||[]).filter(e=>isRC(e)&&e.team?.id===teams.away.id).length;
              matches[`${homeName}_${awayName}`] = { home: goals.home, away: goals.away, status, live: isLive, minute, homeRedCards: hrc, awayRedCards: arc, fixtureId: f.id };
              matches[`${awayName}_${homeName}`] = { home: goals.away, away: goals.home, status, live: isLive, minute, homeRedCards: arc, awayRedCards: hrc, fixtureId: f.id };
            }
          }
        }
      }
    }

    // Load current game data to get our match ID mapping
    const gameSnap = await db.doc("mundial2026/game").get();
    const gameData = gameSnap.exists ? gameSnap.data() : {};
    const currentResults = gameData.results || {};

    // Map API results to our match IDs using team names
    const GROUP_MATCHES = [
      {id:"T0",home:"בלגיה",away:"תוניסיה"},
      {id:"T4",home:"ארמניה",away:"קזחסטן"},
      {id:"T12",home:"קומורו",away:"רואנדה"},
      {id:"T10",home:"גיברלטר",away:"קיימן"},
      {id:"T5",home:"וויילס",away:"רומניה"},
      {id:"T1",home:"פורטוגל",away:"צ'ילה"},
      {id:"T11",home:"אלבניה",away:"לוקסמבורג"},
      {id:"T2",home:'ארה"ב',away:"גרמניה"},
      {id:"T7",home:"שוויץ",away:"אוסטרליה"},
      {id:"T13",home:"פנמה",away:"בוסניה והרצגובינה"},
      {id:"T3",home:"אנגליה",away:"ניו זילנד"},
      {id:"T8",home:"בוליביה",away:"סקוטלנד"},
      {id:"T14",home:"קטאר",away:"אל סלבדור"},
      {id:"T15",home:"ג'מייקה",away:"דרום אפריקה"},
      {id:"T9",home:"ברזיל",away:"מצרים"},
      {id:"T16",home:"ונצואלה",away:"טורקיה"},
      {id:"T17",home:"ארגנטינה",away:"הונדורס"},
      {id:"T18",home:"קוראסאו",away:"ארובה"},
      {id:"T19",home:"קניה",away:"לסוטו"},
      {id:"T20",home:"דנמרק",away:"אוקראינה"},
      {id:"T21",home:"קרואטיה",away:"סלובניה"},
      {id:"T22",home:"מרוקו",away:"נורווגיה"},
      {id:"T23",home:"יוון",away:"איטליה"},
      {id:"T24",home:"אקוודור",away:"גואטמלה"},
      {id:"T25",home:"ליכטנשטיין",away:"קפריסין"},
      {id:"T26",home:"קוסובו",away:"אנדורה"},
      {id:"T27",home:"אפגניסטן",away:"פקיסטן"},
      {id:"T28",home:"עומאן",away:"מוזמביק"},
      {id:"T29",home:"מלדיביים",away:"בנגלדש"},
      {id:"A1",home:"מקסיקו",away:"דרום אפריקה"},
      {id:"A2",home:"קוריאה",away:"צ'כיה"},
      {id:"B1",home:"קנדה",away:"בוסניה והרצגובינה"},
      {id:"D1",home:'ארה"ב',away:"פרגוואי"},
      {id:"B2",home:"קטאר",away:"שוויץ"},
      {id:"C1",home:"ברזיל",away:"מרוקו"},
      {id:"C2",home:"האיטי",away:"סקוטלנד"},
      {id:"D2",home:"אוסטרליה",away:"טורקיה"},
      {id:"E1",home:"גרמניה",away:"קוראסאו"},
      {id:"F1",home:"הולנד",away:"יפן"},
      {id:"E2",home:"חוף השנהב",away:"אקוודור"},
      {id:"F2",home:"שוודיה",away:"תוניסיה"},
      {id:"H1",home:"ספרד",away:"כף ורדה"},
      {id:"G1",home:"בלגיה",away:"מצרים"},
      {id:"H2",home:"ערב הסעודית",away:"אורוגוואי"},
      {id:"G2",home:"איראן",away:"ניו זילנד"},
      {id:"I1",home:"צרפת",away:"סנגל"},
      {id:"I2",home:"עיראק",away:"נורווגיה"},
      {id:"J1",home:"ארגנטינה",away:"אלג'יריה"},
      {id:"J2",home:"אוסטריה",away:"ירדן"},
      {id:"K1",home:"פורטוגל",away:"קונגו דמוקרטית"},
      {id:"L1",home:"אנגליה",away:"קרואטיה"},
      {id:"L2",home:"גאנה",away:"פנמה"},
      {id:"K2",home:"אוזבקיסטן",away:"קולומביה"},
      {id:"A3",home:"צ'כיה",away:"דרום אפריקה"},
      {id:"B3",home:"שוויץ",away:"בוסניה והרצגובינה"},
      {id:"B4",home:"קנדה",away:"קטאר"},
      {id:"A4",home:"מקסיקו",away:"קוריאה"},
      {id:"D3",home:'ארה"ב',away:"אוסטרליה"},
      {id:"C3",home:"סקוטלנד",away:"מרוקו"},
      {id:"C4",home:"ברזיל",away:"האיטי"},
      {id:"D4",home:"טורקיה",away:"פרגוואי"},
      {id:"F3",home:"הולנד",away:"שוודיה"},
      {id:"E3",home:"גרמניה",away:"חוף השנהב"},
      {id:"E4",home:"אקוודור",away:"קוראסאו"},
      {id:"F4",home:"תוניסיה",away:"יפן"},
      {id:"H3",home:"ספרד",away:"ערב הסעודית"},
      {id:"G3",home:"בלגיה",away:"איראן"},
      {id:"H4",home:"אורוגוואי",away:"כף ורדה"},
      {id:"G4",home:"ניו זילנד",away:"מצרים"},
      {id:"J3",home:"ארגנטינה",away:"אוסטריה"},
      {id:"I3",home:"צרפת",away:"עיראק"},
      {id:"I4",home:"נורווגיה",away:"סנגל"},
      {id:"J4",home:"ירדן",away:"אלג'יריה"},
      {id:"K3",home:"פורטוגל",away:"אוזבקיסטן"},
      {id:"L3",home:"אנגליה",away:"גאנה"},
      {id:"L4",home:"פנמה",away:"קרואטיה"},
      {id:"K4",home:"קולומביה",away:"קונגו דמוקרטית"},
      {id:"B5",home:"שוויץ",away:"קנדה"},
      {id:"B6",home:"בוסניה והרצגובינה",away:"קטאר"},
      {id:"C5",home:"סקוטלנד",away:"ברזיל"},
      {id:"C6",home:"מרוקו",away:"האיטי"},
      {id:"A5",home:"צ'כיה",away:"מקסיקו"},
      {id:"A6",home:"דרום אפריקה",away:"קוריאה"},
      {id:"E5",home:"קוראסאו",away:"חוף השנהב"},
      {id:"E6",home:"אקוודור",away:"גרמניה"},
      {id:"F5",home:"יפן",away:"שוודיה"},
      {id:"F6",home:"תוניסיה",away:"הולנד"},
      {id:"D5",home:"טורקיה",away:'ארה"ב'},
      {id:"D6",home:"פרגוואי",away:"אוסטרליה"},
      {id:"I5",home:"נורווגיה",away:"צרפת"},
      {id:"I6",home:"סנגל",away:"עיראק"},
      {id:"H5",home:"כף ורדה",away:"ערב הסעודית"},
      {id:"H6",home:"אורוגוואי",away:"ספרד"},
      {id:"G5",home:"מצרים",away:"איראן"},
      {id:"G6",home:"ניו זילנד",away:"בלגיה"},
      {id:"L5",home:"פנמה",away:"אנגליה"},
      {id:"L6",home:"קרואטיה",away:"גאנה"},
      {id:"K5",home:"קולומביה",away:"פורטוגל"},
      {id:"K6",home:"קונגו דמוקרטית",away:"אוזבקיסטן"},
      {id:"J5",home:"אלג'יריה",away:"אוסטריה"},
      {id:"J6",home:"ירדן",away:"ארגנטינה"},
    ];

    const updatedMatches = { ...currentResults.matches };
    let updatedCount = 0;

    for (const m of GROUP_MATCHES) {
      const key = `${m.home}_${m.away}`;
      if (matches[key]) {
        const prev = currentResults.matches?.[m.id];
        // A real match's goal tally never decreases — guard against a flaky/stale API read
        // overwriting a score we already confirmed (seen with a regression to 0-0 mid-match).
        if (prev?.home != null && prev?.away != null && (matches[key].home + matches[key].away) < (prev.home + prev.away)) {
          continue;
        }
        // API-Football's `elapsed` is often null even mid-match; don't let that wipe out
        // a minute the faster ESPN-based client poll (syncMatchData) already wrote.
        const prevMinute = prev?.minute ?? null;
        updatedMatches[m.id] = {
          home: matches[key].home,
          away: matches[key].away,
          status: matches[key].status,
          live: matches[key].live || false,
          minute: matches[key].minute ?? prevMinute,
          homeRedCards: matches[key].homeRedCards ?? 0,
          awayRedCards: matches[key].awayRedCards ?? 0,
        };
        updatedCount++;
      }
    }

    // Save to Firebase
    const newResults = { ...currentResults, matches: updatedMatches };
    await db.doc("mundial2026/game").set({ results: newResults }, { merge: true });

    // Also store sync metadata
    await db.doc("mundial2026/sync").set({
      lastSync: new Date().toISOString(),
      updatedMatches: updatedCount,
      totalFinished: finishedCount,
      totalGoals,
      apiCallsRemaining: data.errors?.length === 0 ? "ok" : data.errors,
    });

    // Piggyback on this endpoint's existing trigger to fill any bets for matches
    // that just locked — avoids needing a separate cron job for /api/auto-bets.
    const { filledParticipants, filledBets } = await fillMissingBets(db, newResults);

    return res.status(200).json({
      success: true,
      updatedMatches: updatedCount,
      totalFinished: finishedCount,
      totalGoals,
      filledParticipants,
      filledBets,
    });

  } catch (error) {
    console.error("Sync error:", error);
    return res.status(500).json({ error: error.message });
  }
}

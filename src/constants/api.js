// ── Betting Odds (The Odds API, via /api/odds-proxy) ────────────────────────
// The browser hits our serverless proxy, not the-odds-api directly: the proxy
// holds the key server-side and lets Vercel's CDN serve one cached response to
// every user, so the shared free-tier quota (500/month) isn't burned by N browsers.
export const ODDS_PROXY_URL  = "/api/odds-proxy";
export const ODDS_TTL_NORMAL = 24 * 60 * 60 * 1000;  // 24h — no match soon: keep cached odds, don't refetch
export const ODDS_TTL_CLOSE  = 15 * 60 * 1000;        // 15min — match within 2h
export const ODDS_TTL_SOON   =  5 * 60 * 1000;        //  5min — match within 30min / live

export const ODDS_TEAM_MAP = {
  "Mexico":"מקסיקו","South Korea":"קוריאה","South Africa":"דרום אפריקה",
  "Czech Republic":"צ'כיה","Czechia":"צ'כיה",
  "Canada":"קנדה","Switzerland":"שוויץ","Qatar":"קטאר",
  "Bosnia and Herzegovina":"בוסניה והרצגובינה","Bosnia & Herzegovina":"בוסניה והרצגובינה",
  "Bosnia-Herzegovina":"בוסניה והרצגובינה","Bosnia":"בוסניה והרצגובינה",
  "Brazil":"ברזיל","Morocco":"מרוקו","Scotland":"סקוטלנד","Haiti":"האיטי",
  "United States":"ארה\"ב","USA":"ארה\"ב","Australia":"אוסטרליה",
  "Paraguay":"פרגוואי","Turkey":"טורקיה","Türkiye":"טורקיה",
  "Germany":"גרמניה","Ecuador":"אקוודור","Ivory Coast":"חוף השנהב",
  "Cote d'Ivoire":"חוף השנהב","Côte d'Ivoire":"חוף השנהב",
  "Curacao":"קוראסאו","Curaçao":"קוראסאו",
  "Netherlands":"הולנד","Japan":"יפן","Tunisia":"תוניסיה","Sweden":"שוודיה",
  "Spain":"ספרד","Saudi Arabia":"ערב הסעודית","Uruguay":"אורוגוואי","Cape Verde":"כף ורדה",
  "Belgium":"בלגיה","Iran":"איראן","Egypt":"מצרים","New Zealand":"ניו זילנד",
  "France":"צרפת","Senegal":"סנגל","Norway":"נורווגיה","Iraq":"עיראק",
  "Argentina":"ארגנטינה","Algeria":"אלג'יריה","Austria":"אוסטריה","Jordan":"ירדן",
  "Portugal":"פורטוגל","Uzbekistan":"אוזבקיסטן","Colombia":"קולומביה",
  "DR Congo":"קונגו דמוקרטית","Congo DR":"קונגו דמוקרטית",
  "Chile":"צ'ילה",
  "England":"אנגליה","Croatia":"קרואטיה","Ghana":"גאנה","Panama":"פנמה",
  "Mauritania":"מאוריטניה","Niger":"ניז'ר",
  "Northern Ireland":"צפון אירלנד","N. Ireland":"צפון אירלנד",
  "Peru":"פרו","Botswana":"בוצוואנה","Angola":"אנגולה",
  "Central African Republic":"רפובליקה מרכז-אפריקאית","Central African Rep.":"רפובליקה מרכז-אפריקאית",
  "Ethiopia":"אתיופיה","Malawi":"מלאווי","Tanzania":"טנזניה",
  "Vanuatu":"ונואטו","Fiji":"פיג'י",
  "Philippines":"הפיליפינים","Myanmar":"מיאנמר","Burma":"מיאנמר",
  "China":"סין","China PR":"סין","China Republic":"סין",
  "Thailand":"תאילנד","Cambodia":"קמבודיה","Hong Kong":"הונג קונג",
  "Indonesia":"אינדונזיה","Bahrain":"בחריין","Syria":"סוריה",
  "Kyrgyzstan":"קירגיזסטן","Palestine":"פלסטין","Palestinian Territory":"פלסטין",
  "Moldova":"מולדובה","Tajikistan":"טג'יקיסטן","India":"הודו",
  "Equatorial Guinea":"גינאה המשוונית","Liberia":"ליבריה",
  "Sierra Leone":"סיירה לאונה","Russia":"רוסיה",
  "Trinidad and Tobago":"טרינידד וטובגו","Trinidad & Tobago":"טרינידד וטובגו",
  "Belarus":"בלארוס","Burkina Faso":"בורקינה פאסו",
  "Hungary":"הונגריה","Azerbaijan":"אזרבייג'ן","San Marino":"סן מרינו",
  "Iceland":"איסלנד","Nigeria":"ניגריה","Costa Rica":"קוסטה ריקה",
};

export const SOFA_TEAM_MAP = {
  "Mexico":"מקסיקו","South Korea":"קוריאה","South Africa":"דרום אפריקה","Czech Republic":"צ'כיה","Czechia":"צ'כיה",
  "Canada":"קנדה","Switzerland":"שוויץ","Qatar":"קטאר","Bosnia and Herzegovina":"בוסניה והרצגובינה","Bosnia-Herzegovina":"בוסניה והרצגובינה","Bosnia":"בוסניה והרצגובינה",
  "Brazil":"ברזיל","Morocco":"מרוקו","Scotland":"סקוטלנד","Haiti":"האיטי",
  "USA":"ארה\"ב","United States":"ארה\"ב","Australia":"אוסטרליה","Paraguay":"פרגוואי","Turkey":"טורקיה","Türkiye":"טורקיה",
  "Germany":"גרמניה","Ecuador":"אקוודור","Ivory Coast":"חוף השנהב","Cote d'Ivoire":"חוף השנהב","Curacao":"קוראסאו","Curaçao":"קוראסאו",
  "Netherlands":"הולנד","Japan":"יפן","Tunisia":"תוניסיה","Sweden":"שוודיה","Iraq":"עיראק","DR Congo":"קונגו דמוקרטית","Congo DR":"קונגו דמוקרטית","Democratic Republic of the Congo":"קונגו דמוקרטית",
  "Spain":"ספרד","Saudi Arabia":"ערב הסעודית","Uruguay":"אורוגוואי","Cape Verde":"כף ורדה",
  "Belgium":"בלגיה","Iran":"איראן","Egypt":"מצרים","New Zealand":"ניו זילנד",
  "France":"צרפת","Senegal":"סנגל","Norway":"נורווגיה",
  "Argentina":"ארגנטינה","Algeria":"אלג'יריה","Austria":"אוסטריה","Jordan":"ירדן",
  "Portugal":"פורטוגל","Uzbekistan":"אוזבקיסטן","Colombia":"קולומביה",
  "England":"אנגליה","Croatia":"קרואטיה","Ghana":"גאנה","Panama":"פנמה",
  "Chile":"צ'ילה",
  "Armenia":"ארמניה","Kazakhstan":"קזחסטן","Wales":"וויילס","Romania":"רומניה",
  "Bolivia":"בוליביה","Gibraltar":"גיברלטר","Cayman Islands":"קיימן","Cayman":"קיימן",
  "Albania":"אלבניה","Luxembourg":"לוקסמבורג",
  "Central Español":"סנטרל אספניול","Racing Montevideo":"ראסינג מונטבידאו","Racing Club de Montevideo":"ראסינג מונטבידאו",
  "Comoros":"קומורו","Comores":"קומורו",
  "Rwanda":"רואנדה","El Salvador":"אל סלבדור","Jamaica":"ג'מייקה","Venezuela":"ונצואלה","Honduras":"הונדורס","Aruba":"ארובה",
  "Kenya":"קניה","Lesotho":"לסוטו","Denmark":"דנמרק","Ukraine":"אוקראינה",
  "Slovenia":"סלובניה","Greece":"יוון","Italy":"איטליה","Guatemala":"גואטמלה",
  "Liechtenstein":"ליכטנשטיין","Cyprus":"קפריסין","Kosovo":"קוסובו","Andorra":"אנדורה",
  "Afghanistan":"אפגניסטן","Pakistan":"פקיסטן","Oman":"עומאן","Mozambique":"מוזמביק",
  "Maldives":"מלדיביים","Bangladesh":"בנגלדש","Mauritania":"מאוריטניה","Niger":"ניז'ר",
  "Northern Ireland":"צפון אירלנד","N. Ireland":"צפון אירלנד",
  "Peru":"פרו","Botswana":"בוצוואנה","Angola":"אנגולה",
  "Central African Republic":"רפובליקה מרכז-אפריקאית","Central African Rep.":"רפובליקה מרכז-אפריקאית",
  "Ethiopia":"אתיופיה","Malawi":"מלאווי","Tanzania":"טנזניה",
  "Vanuatu":"ונואטו","Fiji":"פיג'י","Philippines":"הפיליפינים","Myanmar":"מיאנמר","Burma":"מיאנמר",
  "China":"סין","China PR":"סין","China Republic":"סין","Thailand":"תאילנד","Cambodia":"קמבודיה","Hong Kong":"הונג קונג",
  "Indonesia":"אינדונזיה","Bahrain":"בחריין","Syria":"סוריה",
  "Kyrgyzstan":"קירגיזסטן","Palestine":"פלסטין","Palestinian Territory":"פלסטין",
  "Moldova":"מולדובה","Tajikistan":"טג'יקיסטן","India":"הודו",
  "Equatorial Guinea":"גינאה המשוונית","Liberia":"ליבריה","Sierra Leone":"סיירה לאונה","Russia":"רוסיה",
  "Trinidad and Tobago":"טרינידד וטובגו","Trinidad & Tobago":"טרינידד וטובגו",
  "Belarus":"בלארוס","Burkina Faso":"בורקינה פאסו",
  "Hungary":"הונגריה","Azerbaijan":"אזרבייג'ן","San Marino":"סן מרינו",
  "Iceland":"איסלנד","Nigeria":"ניגריה","Costa Rica":"קוסטה ריקה",
  "Korea Republic":"קוריאה","IR Iran":"איראן","Côte d'Ivoire":"חוף השנהב",
  "North Macedonia":"מקדוניה הצפונית","Republic of Ireland":"אירלנד",
};

const fdProxy = path => `/api/fd-proxy?path=${encodeURIComponent(path)}`;

// ── API health checks (admin panel) ─────────────────────────────────────────
// One descriptor per external data source. `url`/`headers` are lazy (functions)
// so module-level constants like AF_KEY are read at probe time, not init time.
// `count` extracts how many records came back; an empty-but-OK response is
// flagged yellow (could just mean "no matches right now"), a 401/403/quota is red.
export const PROBE_TIMEOUT_MS = 10000;
export const todayISOForProbe = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
export const API_SOURCES = [
  {
    id:"odds", label:"The Odds API · יחסים", needsToken:true,
    url:()=>ODDS_PROXY_URL,
    count:d=>Array.isArray(d)?d.length:0,
  },
  {
    id:"espn", label:"ESPN · תוצאות + נוקאאוט", needsToken:false,
    url:()=>"https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard",
    count:d=>d?.events?.length||0,
  },
  {
    id:"sofa", label:"SofaScore · תוצאות חיות", needsToken:true,
    url:()=>`/api/sofa-proxy?path=${encodeURIComponent("/sport/football/events/live")}`,
    count:d=>d?.events?.length||0,
  },
  {
    id:"sportsdb", label:"TheSportsDB · תוצאות", needsToken:true,
    url:()=>`https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${todayISOForProbe()}&s=Soccer`,
    count:d=>d?.events?.length||0,
  },
  {
    id:"apifootball", label:"API-Football · אדומים + גיבוי", needsToken:true,
    url:()=>`/api/af-proxy?date=${todayISOForProbe()}`,
    count:d=>Array.isArray(d?.response)?d.response.length:0,
  },
  {
    id:"footballdata", label:"football-data.org · גיבוי WC", needsToken:true,
    url:()=>fdProxy("/v4/competitions/WC"),
    count:d=>d?.code?1:0,
  },
];

// Generates odds-weighted bets for "הקוף של אמיר" bot
// Strong teams mostly win, weaker teams lose, with some randomness

const GROUPS_2026 = {
  A: ["מקסיקו","קוריאה","דרום אפריקה","צ'כיה"],
  B: ["קנדה","בוסניה והרצגובינה","קטאר","שוויץ"],
  C: ["ברזיל","מרוקו","סקוטלנד","האיטי"],
  D: ['ארה"ב',"אוסטרליה","פרגוואי","טורקיה"],
  E: ["גרמניה","אקוודור","חוף השנהב","קוראסאו"],
  F: ["הולנד","יפן","שוודיה","תוניסיה"],
  G: ["בלגיה","איראן","מצרים","ניו זילנד"],
  H: ["ספרד","ערב הסעודית","אורוגוואי","כף ורדה"],
  I: ["צרפת","סנגל","נורווגיה","עיראק"],
  J: ["ארגנטינה","אלג'יריה","אוסטריה","ירדן"],
  K: ["פורטוגל","אוזבקיסטן","קולומביה","קונגו דמוקרטית"],
  L: ["אנגליה","קרואטיה","גאנה","פנמה"],
};

const GROUP_MATCHES = [
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

const STRIKERS = [
  "קיליאן אמבפה","הארי קיין","ליונל מסי","ארלינג האלנד","למין יאמאל",
  "כריסטיאנו רונאלדו","ניק וולטמאדה","עוסמאן דמבלה","לאוטרו מרטינז",
  "ויניסיוס ג'וניור","בוקאיו סאקה","ראפיניה","מיקל אויארסבאל",
];

// Team strength ratings (1-10)
const STRENGTH = {
  // Tier 1 - World class
  "ברזיל":10,"ארגנטינה":10,"צרפת":10,"גרמניה":9,
  // Tier 2 - Top nations
  "ספרד":9,"פורטוגל":9,"אנגליה":8,"הולנד":8,"בלגיה":8,
  // Tier 3 - Strong
  "אורוגוואי":7,"מרוקו":7,"קרואטיה":7,"שוויץ":7,"מקסיקו":6,
  "נורווגיה":7,"סנגל":6,"ארה\"ב":6,"טורקיה":6,"אקוודור":6,
  "קולומביה":6,"יפן":6,"קוריאה":6,"אוסטריה":6,"שוודיה":6,
  // Tier 4 - Mid-level
  "קנדה":5,"ניו זילנד":5,"אוסטרליה":5,"צ'כיה":5,
  "חוף השנהב":5,"מצרים":5,"גאנה":5,"ערב הסעודית":5,
  "פרגוואי":5,"אלג'יריה":5,"איראן":5,"עיראק":4,
  "סקוטלנד":5,"בוסניה והרצגובינה":4,"תוניסיה":4,
  "אוזבקיסטן":4,"קטאר":4,"ירדן":4,"פנמה":4,
  // Tier 5 - Weak
  "דרום אפריקה":3,"האיטי":2,"קוראסאו":2,"כף ורדה":3,
  "קונגו דמוקרטית":3,
};

function getStr(team) { return STRENGTH[team] || 4; }

// Simple LCG seeded PRNG
let seed = 2026;
function rand() {
  seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF;
  return (seed >>> 0) / 4294967296;
}

function winnerGoals() {
  const r = rand();
  if (r < 0.30) return 1;
  if (r < 0.60) return 2;
  if (r < 0.82) return 3;
  return 4;
}
function loserGoals(winG) {
  const max = winG - 1;
  const r = rand();
  if (max <= 0) return 0;
  if (max === 1) return r < 0.55 ? 0 : 1;
  if (max === 2) { if (r < 0.40) return 0; if (r < 0.75) return 1; return 2; }
  return Math.floor(r * (max + 1));
}
function drawGoals() {
  const r = rand();
  if (r < 0.35) return 0;
  if (r < 0.68) return 1;
  if (r < 0.89) return 2;
  return 3;
}

function generateMatch(homeStr, awayStr) {
  const diff = homeStr - awayStr; // positive = home stronger
  // Sigmoid-based win probabilities (home advantage +0.5)
  const homeAdv = 0.5;
  const effDiff = diff + homeAdv;
  const homeWinP = Math.min(0.92, Math.max(0.08, 0.5 + effDiff * 0.07));
  const drawP = Math.max(0.05, 0.25 - Math.abs(diff) * 0.025);
  const awayWinP = 1 - homeWinP - drawP;

  const r = rand();
  let outcome;
  if (r < homeWinP) outcome = 'home';
  else if (r < homeWinP + drawP) outcome = 'draw';
  else outcome = 'away';

  if (outcome === 'draw') {
    const g = drawGoals();
    return { home: g, away: g };
  }
  const wg = winnerGoals();
  const lg = loserGoals(wg);
  return outcome === 'home'
    ? { home: wg, away: lg }
    : { home: lg, away: wg };
}

// Generate match bets
const matches = {};
for (const m of GROUP_MATCHES) {
  matches[m.id] = generateMatch(getStr(m.home), getStr(m.away));
}

// Generate group picks (bias towards stronger teams per group)
const groups = {};
for (const [g, teams] of Object.entries(GROUPS_2026)) {
  // Sort by strength descending, then add noise
  const withNoise = teams.map(t => ({ t, score: getStr(t) + rand() * 2 - 1 }));
  withNoise.sort((a, b) => b.score - a.score);
  groups[g] = [withNoise[0].t, withNoise[1].t];
}

// Champion — heavily biased to top teams
const topChampions = ["ברזיל","ארגנטינה","צרפת","גרמניה","ספרד","פורטוגל","אנגליה"];
const champion = topChampions[Math.floor(rand() * topChampions.length)];

// Golden boot — biased to top strikers
const topStrikers = ["קיליאן אמבפה","ליונל מסי","ארלינג האלנד","למין יאמאל","ויניסיוס ג'וניור","כריסטיאנו רונאלדו"];
const goldenBoot = topStrikers[Math.floor(rand() * topStrikers.length)];

// Total goals (2.5/match avg × 48 matches = 120, range 95-145)
const totalGoals = 95 + Math.floor(rand() * 50);

console.log("const MONKEY_BOT_BETS = " + JSON.stringify({
  matches, groups, champion, goldenBoot, totalGoals
}) + ";");

// Print summary
let totalGoalsGuessed = 0;
for (const v of Object.values(matches)) totalGoalsGuessed += v.home + v.away;
const maxGoals = Math.max(...Object.values(matches).flatMap(v=>[v.home,v.away]));
console.error(`\nTotal goals in all bets: ${totalGoalsGuessed} across ${Object.keys(matches).length} matches`);
console.error(`Max single team goals: ${maxGoals}`);
console.error(`Champion: ${champion}, Golden Boot: ${goldenBoot}, Total Goals: ${totalGoals}`);
console.error("Group picks:", JSON.stringify(groups, null, 1));

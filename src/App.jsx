import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, updateDoc } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBdD-8CkgpIKpyWWJvcdmf17ZmLD-cfxLo",
  authDomain: "world-cup-2026-31d78.firebaseapp.com",
  projectId: "world-cup-2026-31d78",
  storageBucket: "world-cup-2026-31d78.firebasestorage.app",
  messagingSenderId: "199163978449",
  appId: "1:199163978449:web:0585aa656d53d8b21c5bf0"
};
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);
const auth = getAuth(fbApp);
const storage = getStorage(fbApp);
const googleProvider = new GoogleAuthProvider();

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
const ALL_TEAMS = Object.values(GROUPS_2026).flat();
// Only real teams (no playoff placeholders) for champion picker
const REAL_TEAMS = ALL_TEAMS.filter(t => !t.startsWith("פלייאוף"));

// Top strikers / goal threats for World Cup 2026
const STRIKERS = [
  "קיליאן אמבפה",
  "הארי קיין",
  "ליונל מסי",
  "ארלינג האלנד",
  "למין יאמאל",
  "כריסטיאנו רונאלדו",
  "ניק וולטמאדה",
  "עוסמאן דמבלה",
  "לאוטרו מרטינז",
  "ויניסיוס ג'וניור",
  "בוקאיו סאקה",
  "ראפיניה",
  "מיקל אויארסבאל",
];

const STRIKER_FLAGS = {
  "קיליאן אמבפה":       "🇫🇷",
  "הארי קיין":          "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "ליונל מסי":          "🇦🇷",
  "ארלינג האלנד":       "🇳🇴",
  "למין יאמאל":         "🇪🇸",
  "כריסטיאנו רונאלדו":  "🇵🇹",
  "ניק וולטמאדה":       "🇩🇪",
  "עוסמאן דמבלה":       "🇫🇷",
  "לאוטרו מרטינז":      "🇦🇷",
  "ויניסיוס ג'וניור":   "🇧🇷",
  "בוקאיו סאקה":        "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "ראפיניה":            "🇧🇷",
  "מיקל אויארסבאל":     "🇪🇸",
};
function withStrikerFlag(name){ return name ? `${STRIKER_FLAGS[name]||""} ${name}`.trim() : "—"; }

// Maps STRIKERS Hebrew names → possible English API name variants (football-data.org / API-Football)
const STRIKER_API_NAMES = {
  "קיליאן אמבפה":      ["Kylian Mbappé","Kylian Mbappe","K. Mbappé","K. Mbappe"],
  "הארי קיין":         ["Harry Kane","H. Kane"],
  "ליונל מסי":         ["Lionel Messi","L. Messi"],
  "ארלינג האלנד":      ["Erling Haaland","E. Haaland"],
  "למין יאמאל":        ["Lamine Yamal","L. Yamal"],
  "כריסטיאנו רונאלדו": ["Cristiano Ronaldo","C. Ronaldo"],
  "ניק וולטמאדה":      ["Nick Woltemade","N. Woltemade","Niclas Woltemade"],
  "עוסמאן דמבלה":      ["Ousmane Dembélé","Ousmane Dembele","O. Dembélé","O. Dembele"],
  "לאוטרו מרטינז":     ["Lautaro Martínez","Lautaro Martinez","L. Martínez","L. Martinez"],
  "ויניסיוס ג'וניור":  ["Vinícius Júnior","Vinicius Junior","V. Júnior","V. Junior","Vinícius Jr."],
  "בוקאיו סאקה":       ["Bukayo Saka","B. Saka"],
  "ראפיניה":           ["Raphinha","R. Raphinha"],
  "מיקל אויארסבאל":    ["Mikel Oyarzabal","M. Oyarzabal"],
};
function apiNameToHeb(apiName){
  const norm=n=>n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
  const na=norm(apiName);
  for(const [heb,vs] of Object.entries(STRIKER_API_NAMES))
    if(vs.some(v=>norm(v)===na))return heb;
  return null;
}

const ADMIN_UID = "8tDgIRJQDFZyiTvaR0pP8nXShgH2";

const GROUP_MATCHES = [
  // --- June 11 ---
  {id:"A1",group:"A",home:"מקסיקו",away:"דרום אפריקה",date:"11/06",kickoff:"2026-06-11T22:00:00+03:00"},
  // --- June 12 ---
  {id:"A2",group:"A",home:"קוריאה",away:"צ'כיה",date:"12/06",kickoff:"2026-06-12T05:00:00+03:00"},
  {id:"B1",group:"B",home:"קנדה",away:"בוסניה והרצגובינה",date:"12/06",kickoff:"2026-06-12T22:00:00+03:00"},
  // --- June 13 ---
  {id:"D1",group:"D",home:'ארה"ב',away:"פרגוואי",date:"13/06",kickoff:"2026-06-13T04:00:00+03:00"},
  {id:"B2",group:"B",home:"קטאר",away:"שוויץ",date:"13/06",kickoff:"2026-06-13T22:00:00+03:00"},
  // --- June 14 ---
  {id:"C1",group:"C",home:"ברזיל",away:"מרוקו",date:"14/06",kickoff:"2026-06-14T01:00:00+03:00"},
  {id:"C2",group:"C",home:"האיטי",away:"סקוטלנד",date:"14/06",kickoff:"2026-06-14T04:00:00+03:00"},
  {id:"D2",group:"D",home:"אוסטרליה",away:"טורקיה",date:"14/06",kickoff:"2026-06-14T07:00:00+03:00"},
  {id:"E1",group:"E",home:"גרמניה",away:"קוראסאו",date:"14/06",kickoff:"2026-06-14T20:00:00+03:00"},
  {id:"F1",group:"F",home:"הולנד",away:"יפן",date:"14/06",kickoff:"2026-06-14T23:00:00+03:00"},
  // --- June 15 ---
  {id:"E2",group:"E",home:"חוף השנהב",away:"אקוודור",date:"15/06",kickoff:"2026-06-15T02:00:00+03:00"},
  {id:"F2",group:"F",home:"שוודיה",away:"תוניסיה",date:"15/06",kickoff:"2026-06-15T05:00:00+03:00"},
  {id:"H1",group:"H",home:"ספרד",away:"כף ורדה",date:"15/06",kickoff:"2026-06-15T19:00:00+03:00"},
  {id:"G1",group:"G",home:"בלגיה",away:"מצרים",date:"15/06",kickoff:"2026-06-15T22:00:00+03:00"},
  // --- June 16 ---
  {id:"H2",group:"H",home:"ערב הסעודית",away:"אורוגוואי",date:"16/06",kickoff:"2026-06-16T01:00:00+03:00"},
  {id:"G2",group:"G",home:"איראן",away:"ניו זילנד",date:"16/06",kickoff:"2026-06-16T04:00:00+03:00"},
  {id:"I1",group:"I",home:"צרפת",away:"סנגל",date:"16/06",kickoff:"2026-06-16T22:00:00+03:00"},
  // --- June 17 ---
  {id:"I2",group:"I",home:"עיראק",away:"נורווגיה",date:"17/06",kickoff:"2026-06-17T01:00:00+03:00"},
  {id:"J1",group:"J",home:"ארגנטינה",away:"אלג'יריה",date:"17/06",kickoff:"2026-06-17T04:00:00+03:00"},
  {id:"J2",group:"J",home:"אוסטריה",away:"ירדן",date:"17/06",kickoff:"2026-06-17T07:00:00+03:00"},
  {id:"K1",group:"K",home:"פורטוגל",away:"קונגו דמוקרטית",date:"17/06",kickoff:"2026-06-17T20:00:00+03:00"},
  {id:"L1",group:"L",home:"אנגליה",away:"קרואטיה",date:"17/06",kickoff:"2026-06-17T23:00:00+03:00"},
  // --- June 18 ---
  {id:"L2",group:"L",home:"גאנה",away:"פנמה",date:"18/06",kickoff:"2026-06-18T02:00:00+03:00"},
  {id:"K2",group:"K",home:"אוזבקיסטן",away:"קולומביה",date:"18/06",kickoff:"2026-06-18T05:00:00+03:00"},
  {id:"A3",group:"A",home:"צ'כיה",away:"דרום אפריקה",date:"18/06",kickoff:"2026-06-18T19:00:00+03:00"},
  {id:"B3",group:"B",home:"שוויץ",away:"בוסניה והרצגובינה",date:"18/06",kickoff:"2026-06-18T22:00:00+03:00"},
  // --- June 19 ---
  {id:"B4",group:"B",home:"קנדה",away:"קטאר",date:"19/06",kickoff:"2026-06-19T01:00:00+03:00"},
  {id:"A4",group:"A",home:"מקסיקו",away:"קוריאה",date:"19/06",kickoff:"2026-06-19T04:00:00+03:00"},
  {id:"D3",group:"D",home:'ארה"ב',away:"אוסטרליה",date:"19/06",kickoff:"2026-06-19T22:00:00+03:00"},
  // --- June 20 ---
  {id:"C3",group:"C",home:"סקוטלנד",away:"מרוקו",date:"20/06",kickoff:"2026-06-20T01:00:00+03:00"},
  {id:"C4",group:"C",home:"ברזיל",away:"האיטי",date:"20/06",kickoff:"2026-06-20T03:30:00+03:00"},
  {id:"D4",group:"D",home:"טורקיה",away:"פרגוואי",date:"20/06",kickoff:"2026-06-20T06:00:00+03:00"},
  {id:"F3",group:"F",home:"הולנד",away:"שוודיה",date:"20/06",kickoff:"2026-06-20T20:00:00+03:00"},
  {id:"E3",group:"E",home:"גרמניה",away:"חוף השנהב",date:"20/06",kickoff:"2026-06-20T23:00:00+03:00"},
  // --- June 21 ---
  {id:"E4",group:"E",home:"אקוודור",away:"קוראסאו",date:"21/06",kickoff:"2026-06-21T03:00:00+03:00"},
  {id:"F4",group:"F",home:"תוניסיה",away:"יפן",date:"21/06",kickoff:"2026-06-21T07:00:00+03:00"},
  {id:"H3",group:"H",home:"ספרד",away:"ערב הסעודית",date:"21/06",kickoff:"2026-06-21T19:00:00+03:00"},
  {id:"G3",group:"G",home:"בלגיה",away:"איראן",date:"21/06",kickoff:"2026-06-21T22:00:00+03:00"},
  // --- June 22 ---
  {id:"H4",group:"H",home:"אורוגוואי",away:"כף ורדה",date:"22/06",kickoff:"2026-06-22T01:00:00+03:00"},
  {id:"G4",group:"G",home:"ניו זילנד",away:"מצרים",date:"22/06",kickoff:"2026-06-22T04:00:00+03:00"},
  {id:"J3",group:"J",home:"ארגנטינה",away:"אוסטריה",date:"22/06",kickoff:"2026-06-22T20:00:00+03:00"},
  // --- June 23 ---
  {id:"I3",group:"I",home:"צרפת",away:"עיראק",date:"23/06",kickoff:"2026-06-23T00:00:00+03:00"},
  {id:"I4",group:"I",home:"נורווגיה",away:"סנגל",date:"23/06",kickoff:"2026-06-23T03:00:00+03:00"},
  {id:"J4",group:"J",home:"ירדן",away:"אלג'יריה",date:"23/06",kickoff:"2026-06-23T06:00:00+03:00"},
  {id:"K3",group:"K",home:"פורטוגל",away:"אוזבקיסטן",date:"23/06",kickoff:"2026-06-23T20:00:00+03:00"},
  {id:"L3",group:"L",home:"אנגליה",away:"גאנה",date:"23/06",kickoff:"2026-06-23T23:00:00+03:00"},
  // --- June 24 ---
  {id:"L4",group:"L",home:"פנמה",away:"קרואטיה",date:"24/06",kickoff:"2026-06-24T02:00:00+03:00"},
  {id:"K4",group:"K",home:"קולומביה",away:"קונגו דמוקרטית",date:"24/06",kickoff:"2026-06-24T05:00:00+03:00"},
  {id:"B5",group:"B",home:"שוויץ",away:"קנדה",date:"24/06",kickoff:"2026-06-24T22:00:00+03:00"},
  {id:"B6",group:"B",home:"בוסניה והרצגובינה",away:"קטאר",date:"24/06",kickoff:"2026-06-24T22:00:00+03:00"},
  // --- June 25 ---
  {id:"C5",group:"C",home:"סקוטלנד",away:"ברזיל",date:"25/06",kickoff:"2026-06-25T01:00:00+03:00"},
  {id:"C6",group:"C",home:"מרוקו",away:"האיטי",date:"25/06",kickoff:"2026-06-25T01:00:00+03:00"},
  {id:"A5",group:"A",home:"צ'כיה",away:"מקסיקו",date:"25/06",kickoff:"2026-06-25T04:00:00+03:00"},
  {id:"A6",group:"A",home:"דרום אפריקה",away:"קוריאה",date:"25/06",kickoff:"2026-06-25T04:00:00+03:00"},
  {id:"E5",group:"E",home:"קוראסאו",away:"חוף השנהב",date:"25/06",kickoff:"2026-06-25T23:00:00+03:00"},
  {id:"E6",group:"E",home:"אקוודור",away:"גרמניה",date:"25/06",kickoff:"2026-06-25T23:00:00+03:00"},
  // --- June 26 ---
  {id:"F5",group:"F",home:"יפן",away:"שוודיה",date:"26/06",kickoff:"2026-06-26T02:00:00+03:00"},
  {id:"F6",group:"F",home:"תוניסיה",away:"הולנד",date:"26/06",kickoff:"2026-06-26T02:00:00+03:00"},
  {id:"D5",group:"D",home:"טורקיה",away:'ארה"ב',date:"26/06",kickoff:"2026-06-26T05:00:00+03:00"},
  {id:"D6",group:"D",home:"פרגוואי",away:"אוסטרליה",date:"26/06",kickoff:"2026-06-26T05:00:00+03:00"},
  {id:"I5",group:"I",home:"נורווגיה",away:"צרפת",date:"26/06",kickoff:"2026-06-26T22:00:00+03:00"},
  {id:"I6",group:"I",home:"סנגל",away:"עיראק",date:"26/06",kickoff:"2026-06-26T22:00:00+03:00"},
  // --- June 27 ---
  {id:"H5",group:"H",home:"כף ורדה",away:"ערב הסעודית",date:"27/06",kickoff:"2026-06-27T03:00:00+03:00"},
  {id:"H6",group:"H",home:"אורוגוואי",away:"ספרד",date:"27/06",kickoff:"2026-06-27T03:00:00+03:00"},
  {id:"G5",group:"G",home:"מצרים",away:"איראן",date:"27/06",kickoff:"2026-06-27T06:00:00+03:00"},
  {id:"G6",group:"G",home:"ניו זילנד",away:"בלגיה",date:"27/06",kickoff:"2026-06-27T06:00:00+03:00"},
  // --- June 28 ---
  {id:"L5",group:"L",home:"פנמה",away:"אנגליה",date:"28/06",kickoff:"2026-06-28T00:00:00+03:00"},
  {id:"L6",group:"L",home:"קרואטיה",away:"גאנה",date:"28/06",kickoff:"2026-06-28T00:00:00+03:00"},
  {id:"K5",group:"K",home:"קולומביה",away:"פורטוגל",date:"28/06",kickoff:"2026-06-28T02:30:00+03:00"},
  {id:"K6",group:"K",home:"קונגו דמוקרטית",away:"אוזבקיסטן",date:"28/06",kickoff:"2026-06-28T02:30:00+03:00"},
  {id:"J5",group:"J",home:"אלג'יריה",away:"אוסטריה",date:"28/06",kickoff:"2026-06-28T05:00:00+03:00"},
  {id:"J6",group:"J",home:"ירדן",away:"ארגנטינה",date:"28/06",kickoff:"2026-06-28T05:00:00+03:00"},
];

// Sorted unique dates from GROUP_MATCHES (for date navigation)
const ALL_MATCH_DATES = [...new Set(GROUP_MATCHES.filter(m=>m.date).map(m=>m.date))]
  .sort((a,b)=>{
    const aT=Math.min(...GROUP_MATCHES.filter(m=>m.date===a&&m.kickoff).map(m=>new Date(m.kickoff).getTime()));
    const bT=Math.min(...GROUP_MATCHES.filter(m=>m.date===b&&m.kickoff).map(m=>new Date(m.kickoff).getTime()));
    return aT-bT;
  });

function getDefaultMatchDate(){
  const d=new Date();
  const todayStr=`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  if(ALL_MATCH_DATES.includes(todayStr))return todayStr;
  // snap to closest past date, or first future date if nothing in the past
  const todayMs=d.setHours(0,0,0,0);
  const parse=s=>{const [dd,mm]=s.split('/');return new Date(2026,parseInt(mm)-1,parseInt(dd)).getTime();};
  const past=ALL_MATCH_DATES.filter(s=>parse(s)<=todayMs);
  return past.length?past[past.length-1]:ALL_MATCH_DATES[0];
}

const GROUP_LAST_MATCH = {};
Object.keys(GROUPS_2026).forEach(g => {
  const gm = GROUP_MATCHES.filter(m => m.group === g);
  GROUP_LAST_MATCH[g] = gm.reduce((a,b) => new Date(a.kickoff) > new Date(b.kickoff) ? a : b).kickoff;
});
// Last group stage kickoff + 2h buffer for match to finish
const GROUP_STAGE_END_TS = Math.max(...Object.values(GROUP_LAST_MATCH).map(k => new Date(k).getTime())) + 2 * 60 * 60 * 1000;
const TOURNAMENT_END = "2026-07-19T23:59:00+03:00";
const LOCK_MS = 0;

const FLAG_MAP = {
  "מקסיקו":"🇲🇽","קוריאה":"🇰🇷","דרום אפריקה":"🇿🇦","צ'כיה":"🇨🇿",
  "קנדה":"🇨🇦","שוויץ":"🇨🇭","קטאר":"🇶🇦","איטליה":"🇮🇹",
  "ברזיל":"🇧🇷","מרוקו":"🇲🇦","סקוטלנד":"🏴󠁧󠁢󠁳󠁣󠁴󠁿","האיטי":"🇭🇹",
  'ארה"ב':"🇺🇸","אוסטרליה":"🇦🇺","פרגוואי":"🇵🇾","טורקיה":"🇹🇷",
  "גרמניה":"🇩🇪","אקוודור":"🇪🇨","חוף השנהב":"🇨🇮","קוראסאו":"🇨🇼",
  "הולנד":"🇳🇱","יפן":"🇯🇵","תוניסיה":"🇹🇳","אוקראינה":"🇺🇦",
  "ספרד":"🇪🇸","ערב הסעודית":"🇸🇦","אורוגוואי":"🇺🇾","כף ורדה":"🇨🇻",
  "בלגיה":"🇧🇪","איראן":"🇮🇷","מצרים":"🇪🇬","ניו זילנד":"🇳🇿",
  "צרפת":"🇫🇷","סנגל":"🇸🇳","נורווגיה":"🇳🇴",
  "ארגנטינה":"🇦🇷","אלג'יריה":"🇩🇿","אוסטריה":"🇦🇹","ירדן":"🇯🇴",
  "פורטוגל":"🇵🇹","אוזבקיסטן":"🇺🇿","קולומביה":"🇨🇴",
  "אנגליה":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","קרואטיה":"🇭🇷","גאנה":"🇬🇭","פנמה":"🇵🇦",
  "עיראק":"🇮🇶","קונגו דמוקרטית":"🇨🇩",
  "בוסניה והרצגובינה":"🇧🇦","שוודיה":"🇸🇪",
  "צ'ילה":"🇨🇱",
  "ארמניה":"🇦🇲","קזחסטן":"🇰🇿","וויילס":"🏴󠁧󠁢󠁷󠁬󠁳󠁿","רומניה":"🇷🇴",
  "בוליביה":"🇧🇴","גיברלטר":"🇬🇮","קיימן":"🇰🇾","אלבניה":"🇦🇱","לוקסמבורג":"🇱🇺",
  "קומורו":"🇰🇲","רואנדה":"🇷🇼","אל סלבדור":"🇸🇻","ג'מייקה":"🇯🇲",
  "ונצואלה":"🇻🇪","הונדורס":"🇭🇳","ארובה":"🇦🇼",
  "קניה":"🇰🇪","לסוטו":"🇱🇸","דנמרק":"🇩🇰","סלובניה":"🇸🇮",
  "יוון":"🇬🇷","גואטמלה":"🇬🇹","ליכטנשטיין":"🇱🇮","קפריסין":"🇨🇾",
  "קוסובו":"🇽🇰","אנדורה":"🇦🇩","אפגניסטן":"🇦🇫","פקיסטן":"🇵🇰",
  "עומאן":"🇴🇲","מוזמביק":"🇲🇿","מלדיביים":"🇲🇻","בנגלדש":"🇧🇩",
  "מאוריטניה":"🇲🇷","ניז'ר":"🇳🇪",
  "פרו":"🇵🇪","בוצוואנה":"🇧🇼","אנגולה":"🇦🇴",
  "רפובליקה מרכז-אפריקאית":"🇨🇫","אתיופיה":"🇪🇹","מלאווי":"🇲🇼","טנזניה":"🇹🇿",
  "ונואטו":"🇻🇺","פיג'י":"🇫🇯","הפיליפינים":"🇵🇭","מיאנמר":"🇲🇲",
  "סין":"🇨🇳","תאילנד":"🇹🇭","קמבודיה":"🇰🇭","הונג קונג":"🇭🇰",
  "אינדונזיה":"🇮🇩","בחריין":"🇧🇭","סוריה":"🇸🇾",
  "קירגיזסטן":"🇰🇬","פלסטין":"🇵🇸","מולדובה":"🇲🇩",
  "טג'יקיסטן":"🇹🇯","הודו":"🇮🇳","גינאה המשוונית":"🇬🇶",
  "ליבריה":"🇱🇷","סיירה לאונה":"🇸🇱","רוסיה":"🇷🇺",
  "טרינידד וטובגו":"🇹🇹","בלארוס":"🇧🇾","בורקינה פאסו":"🇧🇫",
  "הונגריה":"🇭🇺","אזרבייג'ן":"🇦🇿","סן מרינו":"🇸🇲",
  "איסלנד":"🇮🇸","ניגריה":"🇳🇬","קוסטה ריקה":"🇨🇷",
};
function withFlag(name) {
  if (!name) return name;
  if (name.startsWith("פלייאוף")) return `❓ ${name}`;
  return FLAG_MAP[name] ? `${FLAG_MAP[name]} ${name}` : name;
}
function formatKickoffTime(kickoff) {
  if (!kickoff) return "";
  const m = kickoff.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : "";
}

// ── Betting Odds (The Odds API) ─────────────────────────────────────────────
const ODDS_API_KEY    = "91d6f91ae83212b240af46baba466379";
const ODDS_SPORT      = "soccer_fifa_world_cup";
const ODDS_TTL_NORMAL = 60 * 60 * 1000;   // 1h when no match soon
const ODDS_TTL_SOON   = 5 * 60 * 1000;    // 5min when match within 1h
function hasMatchWithinHour(){
  const n=Date.now();
  // upcoming within 1h OR recently started (within 2h) — so TTL stays short during live matches
  const relevant=t=>t>n-2*60*60*1000&&t<=n+60*60*1000;
  if(GROUP_MATCHES.some(m=>{if(!m.kickoff)return false;return relevant(new Date(m.kickoff).getTime());}))return true;
  return _koKickoffs.some(t=>relevant(t));
}
let _koKickoffs=[];
const ODDS_TEAM_MAP = {
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
function oddsHeb(n){ return ODDS_TEAM_MAP[n]||n; }
const SOFA_TEAM_MAP = {
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
const fdProxy=path=>`/api/fd-proxy?path=${encodeURIComponent(path)}`;
const sofaProxy=path=>`/api/sofa-proxy?path=${encodeURIComponent(path)}`;
function parseOddsData(fixtures){
  const map={};
  for(const f of fixtures){
    const homeH=oddsHeb(f.home_team), awayH=oddsHeb(f.away_team);
    let hS=0,dS=0,aS=0,cnt=0;
    for(const bk of (f.bookmakers||[])){
      const mkt=(bk.markets||[]).find(m=>m.key==="h2h");
      if(!mkt) continue;
      const hO=mkt.outcomes.find(o=>o.name===f.home_team);
      const dO=mkt.outcomes.find(o=>o.name==="Draw");
      const aO=mkt.outcomes.find(o=>o.name===f.away_team);
      if(hO&&dO&&aO){hS+=hO.price;dS+=dO.price;aS+=aO.price;cnt++;}
    }
    if(cnt>0) map[`${homeH}_${awayH}`]={home:(hS/cnt).toFixed(2),draw:(dS/cnt).toFixed(2),away:(aS/cnt).toFixed(2)};
  }
  return map;
}
async function fetchOdds(){
  try{
    const ttl=hasMatchWithinHour()?ODDS_TTL_SOON:ODDS_TTL_NORMAL;
    const cached=localStorage.getItem("wc2026_odds_v1");
    if(cached){const{data,ts}=JSON.parse(cached);if(Date.now()-ts<ttl)return parseOddsData(data);}
    const ctrl=new AbortController();
    const t=setTimeout(()=>ctrl.abort(),8000);
    const res=await fetch(`https://api.the-odds-api.com/v4/sports/${ODDS_SPORT}/odds/?apiKey=${ODDS_API_KEY}&regions=eu&markets=h2h&oddsFormat=decimal`,{signal:ctrl.signal});
    clearTimeout(t);
    if(!res.ok) return {};
    const data=await res.json();
    if(Array.isArray(data)){localStorage.setItem("wc2026_odds_v1",JSON.stringify({data,ts:Date.now()}));return parseOddsData(data);}
    return {};
  }catch{return {};}
}

function groupLabel(g){ return g==="יזיזות"?"⚽ יזיזות":`בית ${g}`; }
function now() { return Date.now(); }

// matchRes = results.matches[matchId] — lock when match actually started, not by schedule
function isMatchLocked(matchId, matchRes) {
  if (matchRes?.live === true || matchRes?.home != null) return true;
  // Safety fallback: 20min after scheduled kickoff in case sync is delayed
  const m = GROUP_MATCHES.find(g => g.id === matchId);
  return m?.kickoff ? now() >= new Date(m.kickoff).getTime() + 20*60*1000 : true;
}
function isGlobalLocked() { return now() >= new Date("2026-06-11T22:00:00+03:00").getTime(); }
function isGroupRevealed(group) { return now() >= new Date(GROUP_LAST_MATCH[group]).getTime(); }
function isGroupStageOver() { return now() >= GROUP_STAGE_END_TS; }
function isTournamentOver() { return now() >= new Date(TOURNAMENT_END).getTime(); }
function canSeeMatchBet(matchId, viewerUid, ownerUid, results) {
  if (viewerUid === ownerUid) return true;
  return isMatchLocked(matchId, results?.matches?.[matchId]);
}
function canSeeGroupBet(group, viewerUid, ownerUid) {
  return viewerUid === ownerUid || isGlobalLocked();
}
function canSeeSpecialBet(viewerUid, ownerUid) {
  return viewerUid === ownerUid || isGlobalLocked();
}


const KO_POINTS = {
  "32 האחרונות": {dir:2, exact:5},
  "שמינית גמר":  {dir:2, exact:5},
  "רבע גמר":     {dir:4, exact:8},
  "חצי גמר":     {dir:5, exact:10},
  "מקום שלישי":  {dir:5, exact:10},
  "גמר":         {dir:8, exact:15},
};

function getDir(h,a){if(+h>+a)return"home";if(+a>+h)return"away";return"draw";}
function calcScore(bets={},results={},allP=[]){
  let t=0;
  // Group picks — only after group stage is fully over
  if(isGroupStageOver()){
    Object.keys(GROUPS_2026).forEach(g=>{
      const picks=bets.groups?.[g]||[],correct=results.groups?.[g]||[];
      const hits=picks.filter(x=>correct.includes(x)).length;
      if(hits===1)t+=2;if(hits===2)t+=5;
    });
  }
  // Match scores — always, based on whatever results exist
  GROUP_MATCHES.forEach(m=>{
    const bet=bets.matches?.[m.id],real=results.matches?.[m.id];
    if(!bet||!real||bet.home==null||bet.away==null||real.home==null||real.away==null)return;
    if(getDir(bet.home,bet.away)===getDir(real.home,real.away)){
      t+=1;if(+bet.home===+real.home&&+bet.away===+real.away)t+=3;
    }
  });
  // KO match bets — points depend on stage
  if(bets.koMatches && results.koResults){
    Object.keys(bets.koMatches).forEach(id=>{
      const bet=bets.koMatches[id];
      const real=results.koResults?.[id.replace("ko_","")];
      if(!bet||!real||bet.home==null||bet.away==null||real.home==null||real.away==null)return;
      const koMatch=(results.knockoutMatches||[]).find(m=>m.id===id);
      const pts=KO_POINTS[koMatch?.stage]||{dir:2,exact:5};
      if(getDir(bet.home,bet.away)===getDir(real.home,real.away)){
        t+=pts.dir; if(+bet.home===+real.home&&+bet.away===+real.away)t+=pts.exact;
      }
    });
  }
  // Champion, golden boot, total goals — only after tournament is over
  if(isTournamentOver()){
    if(bets.champion&&bets.champion===results.champion)t+=12;
    if(bets.goldenBoot&&results.goldenBoot&&bets.goldenBoot.trim().toLowerCase()===results.goldenBoot.trim().toLowerCase())t+=12;
    if(bets.totalGoals!=null&&results.totalGoals!=null&&results.totalGoalsBonus!=null){
      const myD=Math.abs(+bets.totalGoals-+results.totalGoals);
      const diffs=allP.map(p=>Math.abs((p.bets?.totalGoals??9999)-+results.totalGoals));
      if(myD===Math.min(...diffs))t+=+results.totalGoalsBonus;
    }
  }
  return t;
}

function generateCode(){return Math.random().toString(36).substring(2,7).toUpperCase();}
async function loadGame(){
  const snap=await getDoc(doc(db,"mundial2026","game"));
  return snap.exists()?snap.data():{joinCode:generateCode(),results:{},playoffNames:{}};
}
async function saveGame(data){await setDoc(doc(db,"mundial2026","game"),data,{merge:true});}
async function saveParticipant(p){await setDoc(doc(db,"mundial2026","game","participants",p.uid),p,{merge:true});}

function NumStepper({value,onChange,min=0,max=99,disabled=false}){
  return(
    <div className="stepper">
      <button disabled={disabled||value===null} onClick={()=>onChange(Math.max(min,(value??0)-1))}>−</button>
      <span>{value??'—'}</span>
      <button disabled={disabled} onClick={()=>onChange(value===null ? 0 : Math.min(max,value+1))}>+</button>
    </div>
  );
}
function Toast({msg}){return msg?<div className="toast">{msg}</div>:null;}

function SignInScreen({onSignIn,loading}){
  return(
    <div className="signin-screen">
      <div className="signin-inner">
        <div className="signin-ball">⚽</div>
        <div className="signin-welcome">ברוכים הבאים</div>
        <h1 className="signin-title">מונדיאל<span>BET</span></h1>
        <div className="signin-year">2026</div>
        <p className="signin-sub">אתר ההימורים של גביע העולם על שם נייל קלארק</p>
        <div className="signin-sep"/>
        <button className="signin-btn-google" onClick={onSignIn} disabled={loading}>
          {loading?"מתחבר...":<><svg width="22" height="22" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.8 13.5-4.7l-6.2-5.2C29.3 35.6 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7l-6.5 5C9.5 39.5 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.4 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/></svg>כניסה עם Google</>}
        </button>
        <p className="signin-note">כניסה אחת — זוכר אותך לתמיד</p>
      </div>
    </div>
  );
}

function GroupPicker({groupId,teams,picks,onChange,locked,teamNames}){
  const toggle=t=>{
    if(locked)return;
    const cur=picks||[];
    if(cur.includes(t))onChange(cur.filter(x=>x!==t));
    else if(cur.length<2)onChange([...cur,t]);
  };
  return(
    <div className="group-box">
      <div className="group-label">בית {groupId}</div>
      <div className="team-grid">
        {teams.map(t=>{
          const idx=(picks||[]).indexOf(t);
          const resolved=teamNames?.[t]||t;
          const isUnknownPlayoff=resolved.startsWith("פלייאוף");
          const maxReached=(picks||[]).length>=2 && idx<0;
          return(
            <button key={t} className={`team-btn ${idx>=0?"sel":""} ${locked||isUnknownPlayoff||maxReached?"locked":""} ${isUnknownPlayoff?"playoff-tbd":""}`} onClick={()=>toggle(t)} disabled={isUnknownPlayoff||maxReached}>
              {idx===0&&<span className="badge">1</span>}
              {idx===1&&<span className="badge">2</span>}
              {withFlag(resolved)}
            </button>
          );
        })}
      </div>
      {!locked&&(picks||[]).length<2&&<div className="hint">בחר {2-(picks||[]).length} עוד</div>}
    </div>
  );
}

function MatchBetRow({match, savedBet, onSave, teamNames, odds, res}){
  const locked = isMatchLocked(match.id, res);
  const matchOdds = !locked && odds?.[`${match.home}_${match.away}`];
  const [h, setH] = useState(savedBet?.home ?? null);
  const [a, setA] = useState(savedBet?.away ?? null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync if external save updates come in
  useEffect(()=>{
    setH(savedBet?.home ?? null);
    setA(savedBet?.away ?? null);
  },[savedBet?.home, savedBet?.away]);

  const dirty = !locked && h !== null && a !== null &&
    (h !== savedBet?.home || a !== savedBet?.away);

  const handleSave = async () => {
    setSaving(true);
    await onSave(match.id, {home: h, away: a});
    setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false), 1500);
  };

  const dir = h!=null && a!=null ? getDir(+h,+a) : null;  return(
    <div className={`match-row ${locked?"locked-row":""} ${saved?"saved-row":""}`}>
      <div className="match-meta">
        {match.date}{match.kickoff && ` ${formatKickoffTime(match.kickoff)}`} · {groupLabel(match.group)}
        {locked ? <span className="lock-badge-sm"> 🔒</span> : <span className="open-badge-sm"> ✏️</span>}
      </div>
      {matchOdds && (
        <div className="match-odds">
          <span className="odds-cell"><span className="odds-label">בית</span><span className="odds-val">{matchOdds.home}</span></span>
          <span className="odds-cell"><span className="odds-label">תיקו</span><span className="odds-val">{matchOdds.draw}</span></span>
          <span className="odds-cell"><span className="odds-label">חוץ</span><span className="odds-val">{matchOdds.away}</span></span>
        </div>
      )}
      <div className="match-body">
        <div className={`team-name ${dir==="home"?"winner":""}`}>{withFlag(teamNames?.[match.home]||match.home)}</div>
        <div className="score-area">
          <NumStepper value={h} onChange={setH} disabled={locked}/>
          <span className="colon">:</span>
          <NumStepper value={a} onChange={setA} disabled={locked}/>
        </div>
        <div className={`team-name away ${dir==="away"?"winner":""}`}>{withFlag(teamNames?.[match.away]||match.away)}</div>
        {!locked && (
          <button
            className={`btn-save-match ${dirty?"dirty":""} ${saved?"done":""}`}
            onClick={handleSave}
            disabled={!dirty||saving}
          >
            {saved?"✓":saving?"...":"💾"}
          </button>
        )}
      </div>
    </div>
  );
}


function PlayerBetsView({player,viewerUid,results,teamNames}){
  const [tab,setTab]=useState("groups");
  const bets=player.bets||{};
  const globalLocked=isGlobalLocked();
  const medals=["🥇","🥈","🥉"];
  const hasSpecial=globalLocked&&(bets.champion||bets.goldenBoot||(bets.totalGoals!=null&&bets.totalGoals!==""));
  return(
    <div className="player-bets-view">
      <div className="pbv-profile-card">
        {player.photoURL
          ?<img src={player.photoURL} className="pbv-avatar" alt=""/>
          :<div className="pbv-avatar-ph">{(player.name||"?")[0]}</div>}
        <div className="pbv-name">{player.name}</div>
        <div className="pbv-meta">
          {player.rank&&<span className="pbv-rank-badge">{medals[player.rank-1]||`#${player.rank}`}</span>}
          <span className="pbv-score-badge">{calcScore(bets,results,[])} נק׳</span>
        </div>
        {hasSpecial&&(
          <div className="pbv-special-row">
            {bets.champion&&<span className="pbv-special-chip">🏆 {withFlag(teamNames?.[bets.champion]||bets.champion)}</span>}
            {bets.goldenBoot&&<span className="pbv-special-chip">👟 {withStrikerFlag(bets.goldenBoot)}</span>}
            {bets.totalGoals!=null&&bets.totalGoals!==""&&<span className="pbv-special-chip">⚽ {bets.totalGoals} שערים</span>}
          </div>
        )}
      </div>
      <div className="sub-tabs">
        {[["groups","🏠 בתים"],["matches","⚽ משחקים"],["knockout","🏆 נוקאאוט"],["special","⭐ מיוחד"]].map(([k,l])=>(
          <button key={k} className={`sub-tab ${tab===k?"active":""}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>
      {tab==="groups"&&(
        <div className="scroll-area">
          {Object.entries(GROUPS_2026).map(([g,teams])=>{
            const revealed=canSeeGroupBet(g,viewerUid,player.uid);
            const picks=bets.groups?.[g]||[];
            return(
              <div key={g} className="group-box">
                <div className="group-label">בית {g} {!revealed&&"🔒"}</div>
                {revealed?(
                  <div className="team-grid">
                    {teams.map(t=>{
                      const idx=picks.indexOf(t);
                      const correct=results.groups?.[g]||[];
                      const hit=correct.includes(t)&&picks.includes(t);
                      return(
                        <div key={t} className={`team-btn readonly ${idx>=0?"sel":""} ${hit?"correct":""}`}>
                          {idx===0&&<span className="badge">1</span>}
                          {idx===1&&<span className="badge">2</span>}
                          {withFlag(teamNames?.[t]||t)}{hit?" ✓":""}
                        </div>
                      );
                    })}
                  </div>
                ):<div className="hidden-block">🔒 יחשף בשריקת הפתיחה של המשחק הראשון</div>}
              </div>
            );
          })}
        </div>
      )}
      {tab==="matches"&&(
        <div className="scroll-area">
          {GROUP_MATCHES.map(m=>{
            const visible=canSeeMatchBet(m.id,viewerUid,player.uid,results);
            const bet=bets.matches?.[m.id];
            const real=results.matches?.[m.id];
            const hasReal=real?.home!=null&&real?.away!=null;
            const correct=hasReal&&bet?.home!=null&&getDir(+bet.home,+bet.away)===getDir(+real.home,+real.away);
            const exact=correct&&+bet.home===+real.home&&+bet.away===+real.away;
            return(
              <div key={m.id} className={`match-row ${!visible?"hidden-row":correct?"correct-row":""}`}>
                <div className="match-meta">{m.date}{m.kickoff && ` ${formatKickoffTime(m.kickoff)}`} · {groupLabel(m.group)}</div>
                <div className="match-body">
                  <span className="team-name">{withFlag(teamNames?.[m.home]||m.home)}</span>
                  <div className="score-area">
                    {visible&&bet?.home!=null
                      ?<span dir="ltr" className={`bet-score ${exact?"exact":correct?"dir-ok":""}`}>{bet.home}:{bet.away}{exact?" 🎯":correct?" ✓":""}</span>
                      :<span className="hidden-score">{visible?"—":"🔒"}</span>
                    }
                  </div>
                  <span className="team-name away">{withFlag(teamNames?.[m.away]||m.away)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tab==="special"&&(
        <div className="scroll-area special-area">
          {[
            {label:"🏆 אלופה",key:"champion",can:canSeeSpecialBet(viewerUid,player.uid)},
            {label:"👟 מלך שערים",key:"goldenBoot",can:canSeeSpecialBet(viewerUid,player.uid)},
            {label:"⚽ ניחוש שערים",key:"totalGoals",can:canSeeSpecialBet(viewerUid,player.uid)},
          ].map(({label,key,can})=>(
            <div key={key} className="special-row">
              <label>{label}</label>
              <div className={`special-val ${!can?"hidden-val":""}`}>{can?(key==="goldenBoot"?withStrikerFlag(bets[key]):bets[key]||"—"):"🔒 יחשף בשריקת הפתיחה של המשחק הראשון"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BetForm({user, onSave, onSaveMatch, onSaveKoMatch, koMatchesBet, teamNames, odds}){
  const [bets, setBets] = useState(user.bets||{});
  const [tab, setTab] = useState("groups");
  const [betDate,setBetDate]=useState(getDefaultMatchDate);
  const globalLocked = isGlobalLocked();

  // Keep local bets in sync when user.bets updates from Firebase
  useEffect(()=>{ setBets(user.bets||{}); },[JSON.stringify(user.bets)]);

  const setGroupPick=(g,picks)=>setBets(p=>({...p,groups:{...p.groups,[g]:picks}}));

  return(
    <div className="bet-form">
      {globalLocked&&<div className="locked-banner">🔒 הימורי בתים/אלופה/מלך שערים ננעלו!</div>}
      <div className="sub-tabs">
        {[["groups","🏠 בתים"],["matches","⚽ משחקים"],["special","⭐ מיוחד"]].map(([k,l])=>(
          <button key={k} className={`sub-tab ${tab===k?"active":""}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>
      {tab==="groups"&&(
        <div className="scroll-area">
          {!globalLocked&&<p className="section-note">בחר 2 קבוצות לכל בית · 2נק׳ לאחת | 5נק׳ לשתיים</p>}
          {Object.entries(GROUPS_2026).map(([g,teams])=>(
            <GroupPicker key={g} groupId={g} teams={teams} picks={bets.groups?.[g]}
              onChange={p=>setGroupPick(g,p)} locked={globalLocked} teamNames={teamNames}/>
          ))}
          {!globalLocked&&<button className="btn-green" onClick={()=>onSave(bets)}>💾 שמור הימורי בתים</button>}
        </div>
      )}
      {tab==="matches"&&(
        <div className="scroll-area">
          <DateNav selectedDate={betDate} onChange={setBetDate}/>
          <p className="section-note">⚡ 1נק׳ כיוון · +3נק׳ בול · נעילה בשריקת הפתיחה</p>
          {GROUP_MATCHES.filter(m=>m.date===betDate).map(m=>(
            <MatchBetRow key={m.id} match={m}
              savedBet={user.bets?.matches?.[m.id]}
              onSave={onSaveMatch}
              teamNames={teamNames}
              odds={odds}/>
          ))}
        </div>
      )}
      {tab==="knockout"&&(
        <div className="scroll-area">
          {(!koMatchesBet||koMatchesBet.length===0)
            ? <div className="nothing-revealed" style={{padding:"2rem",textAlign:"center"}}>
                <div style={{fontSize:"2rem"}}>⏳</div>
                <p style={{color:"var(--muted)"}}>משחקי הנוקאאוט יופיעו כאן ברגע שהקבוצות ידועות</p>
                <p style={{color:"var(--muted)",fontSize:".8rem"}}>ניתן להמר עד שריקת הפתיחה</p>
              </div>
            : <>
                <p className="section-note">⚡ כיוון / מדויק: 32&שמינית 2/+5 · רבע 4/+8 · חצי&מקום3 5/+10 · גמר 8/+15</p>
                {koMatchesBet.map((m,i)=>(
                  <MatchBetRow key={m.id||i} match={m}
                    savedBet={user.bets?.koMatches?.[m.id]}
                    onSave={(id,bet)=>onSaveKoMatch(id,bet)}
                    teamNames={teamNames}
                    odds={odds}/>
                ))}
              </>
          }
        </div>
      )}
      {tab==="special"&&(
        <div className="scroll-area special-area">
          <div className="special-row">
            <label>🏆 אלופה (12נק׳) {globalLocked&&"🔒"}</label>
            <select disabled={globalLocked} value={bets.champion||""} onChange={e=>setBets(p=>({...p,champion:e.target.value}))}>
              <option value="">— בחר —</option>
              {REAL_TEAMS.map(t=><option key={t} value={t}>{withFlag(teamNames?.[t]||t)}</option>)}
            </select>
          </div>
          <div className="special-row">
            <label>👟 מלך השערים (12נק׳) {globalLocked&&"🔒"}</label>
            <select disabled={globalLocked} value={bets.goldenBoot||""} onChange={e=>setBets(p=>({...p,goldenBoot:e.target.value}))}>
              <option value="">— בחר שחקן —</option>
              {STRIKERS.map(s=><option key={s} value={s}>{STRIKER_FLAGS[s]||""} {s}</option>)}
            </select>
          </div>
          <div className="special-row">
            <label>⚽ ניחוש סה״כ שערים {globalLocked&&"🔒"}</label>
            <input disabled={globalLocked} type="number" placeholder="כמה שערים?" value={bets.totalGoals||""} onChange={e=>setBets(p=>({...p,totalGoals:e.target.value}))}/>
          </div>
          <p className="section-note">💡 הקרוב ביותר מקבל 6–10 נק׳ (יוחלט לפני הגמר)</p>
          {!globalLocked&&<button className="btn-green" onClick={()=>onSave(bets)}>💾 שמור</button>}
        </div>
      )}
    </div>
  );
}

function Leaderboard({participants,results,onSelectPlayer}){
  const ranked=[...participants].map(p=>({...p,score:calcScore(p.bets||{},results,participants)})).sort((a,b)=>b.score-a.score);
  const medals=["🥇","🥈","🥉"];
  return(
    <div className="lb-list">
      {ranked.length===0&&<div className="empty-msg">עדיין אין משתתפים</div>}
      {ranked.map((p,i)=>(
        <div key={p.uid} className={`lb-row rank-${i+1}`} onClick={()=>onSelectPlayer(p)}>
          <span className="lb-rank">{medals[i]||i+1}</span>
          {p.photoURL&&<img src={p.photoURL} className="lb-avatar" alt=""/>}
          <span className="lb-name">{p.name}</span>
          <span className="lb-score">{p.score} נק׳</span>
          <span className="lb-arrow">›</span>
        </div>
      ))}
    </div>
  );
}

function MatchRow({m, res, teamNames, odds}){
  const hasRes = res?.home!=null && res?.away!=null;
  const isLive = res?.live===true;
  const isDone = hasRes && !isLive;
  const locked = isMatchLocked(m.id, res);
  const homeName = teamNames?.[m.home]||m.home||"?";
  const awayName = teamNames?.[m.away]||m.away||"?";
  const matchOdds = !locked && !hasRes && odds ? odds[`${m.home}_${m.away}`] : null;
  return(
    <div className={`sched-row ${isLive?"sched-live":""} ${!locked&&!hasRes&&m.kickoff?"sched-open":""}`}>
      <div className="sched-date">
        {m.date&&`${m.date}${m.kickoff?` ${formatKickoffTime(m.kickoff)}`:""} · `}{m.group?groupLabel(m.group):m.stage||""}
        {isLive&&<span className="live-badge"> 🔴 {res?.minute ? `${res.minute}'` : 'חי'}</span>}
        {isDone&&<span className="done-badge"> ✓ הסתיים</span>}
        {!locked&&!hasRes&&m.kickoff&&<span className="open-badge-sm"> ✏️ פתוח להימור</span>}
      </div>
      <div className="sched-teams">
        <span className={isDone&&+res.home>+res.away?"sched-winner":isLive&&+res.home>+res.away?"sched-winning":""}>{withFlag(homeName)}{res?.reds?.home>0&&<span className="rc-badge">{Array.from({length:Math.min(res.reds.home,3)}).map((_,i)=><span key={i} className="redcard"/>)}</span>}</span>
        {hasRes?<span dir="ltr" className={`sched-score ${isLive?"sched-score-live":""}`}>{res.away} – {res.home}</span>:<span className="sched-vs">vs</span>}
        <span className={isDone&&+res.away>+res.home?"sched-winner":isLive&&+res.away>+res.home?"sched-winning":""}>{res?.reds?.away>0&&<span className="rc-badge">{Array.from({length:Math.min(res.reds.away,3)}).map((_,i)=><span key={i} className="redcard"/>)}</span>}{withFlag(awayName)}</span>
      </div>
      {matchOdds&&(
        <div className="match-odds" style={{marginTop:".3rem",marginBottom:0}}>
          <span className="odds-cell"><span className="odds-label">בית</span><span className="odds-val">{matchOdds.home}</span></span>
          <span className="odds-cell"><span className="odds-label">תיקו</span><span className="odds-val">{matchOdds.draw}</span></span>
          <span className="odds-cell"><span className="odds-label">חוץ</span><span className="odds-val">{matchOdds.away}</span></span>
        </div>
      )}
    </div>
  );
}

function DateNav({selectedDate,onChange}){
  const MONTHS=["","ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  const parseDate=s=>{const [d,m]=s.split('/');return new Date(2026,parseInt(m)-1,parseInt(d)).getTime();};
  const selMs=selectedDate?parseDate(selectedDate):0;
  // find effective prev/next by timestamp, not just array index
  const prevDate=ALL_MATCH_DATES.filter(d=>parseDate(d)<selMs).at(-1)||null;
  const nextDate=ALL_MATCH_DATES.find(d=>parseDate(d)>selMs)||null;
  const [dd,mm]=(selectedDate||"").split("/");
  const label=dd&&mm?`${parseInt(dd)} ${MONTHS[parseInt(mm)]}`:selectedDate;
  const _td=new Date();
  const todayStr=`${String(_td.getDate()).padStart(2,'0')}/${String(_td.getMonth()+1).padStart(2,'0')}`;
  const isToday=selectedDate===todayStr;
  return(
    <div className="date-nav">
      <button className="date-nav-arrow" disabled={!prevDate} onClick={()=>prevDate&&onChange(prevDate)}>‹</button>
      <div className="date-nav-center">
        <span className="date-nav-label">{label}</span>
        {isToday&&<span className="date-today-pill">היום</span>}
      </div>
      <button className="date-nav-arrow" disabled={!nextDate} onClick={()=>nextDate&&onChange(nextDate)}>›</button>
    </div>
  );
}

function ScheduleView({results,teamNames,odds}){
  const [selDate,setSelDate]=useState(getDefaultMatchDate);
  const [koStage,setKoStage]=useState(null);
  const koMatches=results.knockoutMatches||[];
  const KO_STAGES=["32 האחרונות","שמינית גמר","רבע גמר","חצי גמר","גמר"];
  const hasKo=koMatches.length>0;
  const dateMatches=GROUP_MATCHES.filter(m=>m.date===selDate);
  const renderMatch=(m,i)=>{
    const res=results.matches?.[m.id]||(m.apiId?results.koResults?.[m.apiId]:null);
    return <MatchRow key={m.id||i} m={m} res={res} teamNames={teamNames} odds={odds}/>;
  };
  return(
    <div>
      <DateNav selectedDate={selDate} onChange={d=>{setSelDate(d);setKoStage(null);}}/>
      {hasKo&&(
        <div className="filter-row" style={{marginTop:".3rem"}}>
          {KO_STAGES.map(s=>(
            <button key={s} className={`filter-btn ${koStage===s?"active":""}`} onClick={()=>setKoStage(p=>p===s?null:s)}>{s}</button>
          ))}
        </div>
      )}
      <div className="scroll-area">
        {koStage?(
          koMatches.filter(m=>m.stage===koStage).length>0
            ?koMatches.filter(m=>m.stage===koStage).map((m,i)=>renderMatch(m,i))
            :<div className="empty-msg">⏳ השלב טרם החל</div>
        ):(
          dateMatches.length>0
            ?dateMatches.map((m,i)=>renderMatch(m,i))
            :<div className="empty-msg">אין משחקים בתאריך זה</div>
        )}
      </div>
    </div>
  );
}

function PlayoffEditor({playoffNames,onSave}){
  const [names,setNames]=useState(playoffNames||{});
  useEffect(()=>setNames(playoffNames||{}),[JSON.stringify(playoffNames)]);
  const pts=ALL_TEAMS.filter(t=>t.startsWith("פלייאוף"));
  return(
    <div className="playoff-editor">
      <p className="section-note">כשידוע מי עבר פלייאוף — עדכן כאן</p>
      {pts.map(t=>(
        <div key={t} className="special-row">
          <label>{t}</label>
          <input placeholder="שם הקבוצה" value={names[t]||""} onChange={e=>setNames(p=>({...p,[t]:e.target.value}))}/>
        </div>
      ))}
      <button className="btn-green" onClick={()=>onSave(names)}>💾 שמור</button>
    </div>
  );
}

// ─── REVEALED BETS VIEW ───────────────────────────────────────────────────────
function RevealedBetsView({participants, viewerUid, results, teamNames}){
  const [activePlayer, setActivePlayer] = useState(null);
  const [subTab, setSubTab] = useState("matches");
  const [revDate,setRevDate]=useState(getDefaultMatchDate);

  // What's currently revealed?
  const revealedMatches = GROUP_MATCHES.filter(m => canSeeMatchBet(m.id, "other", viewerUid, results));
  const revealedGroups = Object.keys(GROUPS_2026).filter(g => canSeeGroupBet(g, "other", viewerUid));
  const specialRevealed = canSeeSpecialBet("other", viewerUid);

  const nothingRevealed = revealedMatches.length===0 && revealedGroups.length===0 && !specialRevealed;

  if(activePlayer) return(
    <div className="section">
      <button className="btn-back-sm" onClick={()=>setActivePlayer(null)}>→ חזרה לרשימה</button>
      <PlayerBetsView player={activePlayer} viewerUid={viewerUid} results={results} teamNames={teamNames}/>
    </div>
  );

  return(
    <div className="section">
      <h2>👁️ הימורים גלויים</h2>

      {/* What's revealed summary */}
      <div className="revealed-summary">
        <div className="revealed-item">
          <span className="rev-label">⚽ משחקים גלויים</span>
          <span className="rev-count" dir="ltr">{revealedMatches.length} / {GROUP_MATCHES.length}</span>
        </div>
        <div className="revealed-item">
          <span className="rev-label">🏠 בתים גלויים</span>
          <span className="rev-count" dir="ltr">{revealedGroups.length} / 12</span>
        </div>
        <div className="revealed-item">
          <span className="rev-label">🏆 אלופה ומלך שערים</span>
          <span className={`rev-count ${specialRevealed?"green":""}`}>{specialRevealed?"✓ גלוי":"🔒 נעול"}</span>
        </div>
      </div>

      {nothingRevealed ? (
        <div className="nothing-revealed">
          <div style={{fontSize:"2.5rem"}}>🔒</div>
          <p>עדיין לא התחיל אף משחק</p>
          <p className="section-note">הימורים ייחשפו אוטומטית בשריקת הפתיחה של כל משחק</p>
        </div>
      ) : (
        <>
          <p className="section-note">לחץ על שחקן לראות את ההימורים הגלויים שלו</p>
          <div className="sub-tabs">
            {[["matches","⚽ לפי משחק"],["players","👤 לפי שחקן"],["groups","🏠 בתים"]].map(([k,l])=>(
              <button key={k} className={`sub-tab ${subTab===k?"active":""}`} onClick={()=>setSubTab(k)}>{l}</button>
            ))}
          </div>

          {subTab==="players"&&(
            <div className="scroll-area">
              {participants.map(p=>(
                <div key={p.uid} className="lb-row" onClick={()=>setActivePlayer(p)}>
                  {p.photoURL&&<img src={p.photoURL} className="lb-avatar" alt=""/>}
                  <span className="lb-name">{p.name}</span>
                  <span className="lb-score">{calcScore(p.bets||{},results,participants)} נק׳</span>
                  <span className="lb-arrow">›</span>
                </div>
              ))}
            </div>
          )}

          {subTab==="matches"&&(
            <div className="scroll-area">
              <DateNav selectedDate={revDate} onChange={setRevDate}/>
              {revealedMatches.filter(m=>m.date===revDate).length===0&&<div className="empty-msg">אין הימורים גלויים לתאריך זה</div>}
              {revealedMatches.filter(m=>m.date===revDate).map(m=>{
                const real=results.matches?.[m.id];
                const hasReal=real?.home!=null&&real?.away!=null;
                const isLive=real?.live===true;
                return(
                  <div key={m.id}>
                    <MatchRow m={m} res={real} teamNames={teamNames}/>
                    <div className="rev-bets-row">
                      {participants.map(p=>{
                        const bet=p.bets?.matches?.[m.id];
                        if(!bet||bet.home==null)return null;
                        const correct=hasReal&&getDir(+bet.home,+bet.away)===getDir(+real.home,+real.away);
                        const exact=correct&&+bet.home===+real.home&&+bet.away===+real.away;
                        const pts = hasReal ? (exact ? 4 : correct ? 1 : 0) : null;
                        return(
                          <div key={p.uid} className={`rev-bet-chip ${exact?"exact":correct?"correct":hasReal?"wrong":""}`}>
                            <span className="chip-name">{p.name.split(" ")[0]}</span>
                            <span className="chip-score">{bet.away}:{bet.home}</span>
                            {pts!==null&&<span className="chip-pts">{pts} נק׳</span>}
                            {exact&&<span>🎯</span>}
                            {!exact&&correct&&<span>✓</span>}
                            {hasReal&&!correct&&<span>✗</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {subTab==="groups"&&(
            <div className="scroll-area">
              {revealedGroups.length===0&&<div className="empty-msg">עדיין לא הסתיים אף בית</div>}
              {revealedGroups.map(g=>{
                const correct=results.groups?.[g]||[];
                return(
                  <div key={g} className="group-box">
                    <div className="group-label">
                      בית {g}
                      {correct.length>0&&<span style={{color:"var(--green)",marginRight:".5rem"}}>עלו: {correct.map(t=>withFlag(teamNames?.[t]||t)).join(", ")}</span>}
                    </div>
                    <div className="rev-bets-row wrap">
                      {participants.map(p=>{
                        const picks=p.bets?.groups?.[g]||[];
                        if(!picks.length)return null;
                        const hits=picks.filter(t=>correct.includes(t)).length;
                        const pts=hits===2?5:hits===1?2:0;
                        return(
                          <div key={p.uid} className={`rev-bet-chip ${hits===2?"exact":hits===1?"correct":correct.length?"wrong":""}`}>
                            <span className="chip-name">{p.name.split(" ")[0]}</span>
                            <span className="chip-score">{picks.map(t=>withFlag(teamNames?.[t]||t)).join(", ")}</span>
                            {correct.length>0&&<span>{pts>0?`+${pts}נק׳`:"✗"}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── LIVE BAR ─────────────────────────────────────────────────────────────────
function LiveBar({results, teamNames}){
  const live=GROUP_MATCHES.filter(m=>results.matches?.[m.id]?.live===true);
  if(!live.length)return null;
  return(
    <div className="live-now-bar">
      {live.map(m=>{
        const res=results.matches[m.id];
        return(
          <span key={m.id} className="live-now-item">
            🔴 {withFlag(teamNames?.[m.home]||m.home)} <b><span dir="ltr">{res.away}:{res.home}</span></b> {withFlag(teamNames?.[m.away]||m.away)}
            {res.minute?<span className="live-min"> {res.minute}'</span>:null}
          </span>
        );
      })}
    </div>
  );
}

// ─── WINNER ANNOUNCEMENT ──────────────────────────────────────────────────────
// Deterministic confetti layout — golden-ratio spacing so pieces spread evenly
const CONFETTI_COLORS = ["#FFD700","#FF6B6B","#4ECDC4","#00D87F","#FF8E53","#C084FC","#60A5FA","#F472B6"];
const CONFETTI_PIECES = Array.from({length: 48}, (_, i) => ({
  left:     (((i * 137.508) % 100)).toFixed(2) + "%",
  delay:    ((i * 0.19) % 3.5).toFixed(2) + "s",
  duration: (2.2 + (i * 0.13) % 1.8).toFixed(2) + "s",
  color:    CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  width:    6 + (i % 4) * 2,
  height:   8 + (i % 3) * 3,
  skew:     ((i * 31) % 40) - 20,
}));

function WinnerAnnouncement({ winner, isFinal, onClose }) {
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="wa-overlay" onClick={onClose}>
      {/* Confetti */}
      <div className="wa-confetti" aria-hidden="true">
        {CONFETTI_PIECES.map((p, i) => (
          <span key={i} className="wa-piece" style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            background: p.color,
            width: p.width,
            height: p.height,
            transform: `skewX(${p.skew}deg)`,
          }}/>
        ))}
      </div>

      {/* Card */}
      <div className="wa-card" onClick={e => e.stopPropagation()}>
        <div className="wa-trophy">🏆</div>
        <div className="wa-title">{isFinal ? "🎉 המנצח!" : "🥇 מוביל כרגע"}</div>
        {winner.photoURL
          ? <img src={winner.photoURL} className="wa-avatar" alt={winner.name}/>
          : <div className="wa-avatar-placeholder">{winner.name[0]}</div>
        }
        <div className="wa-name">{winner.name}</div>
        <div className="wa-score">{winner.score} <span className="wa-pts-label">נק׳</span></div>
        {!isFinal && (
          <div className="wa-subtitle">הטורניר עדיין לא הסתיים</div>
        )}
        <button className="wa-close" onClick={onClose}>סגור</button>
      </div>
    </div>
  );
}

// ─── SPECIAL BETS CARD ────────────────────────────────────────────────────────
function SpecialBetsCard({participants, results, teamNames}){
  if(!isGlobalLocked())return null;
  const over=isTournamentOver();
  const topScorer=results.topScorer;       // {name, goals} — synced from football-data.org
  const actualGoals=results.actualTotalGoals; // number — computed from match scores
  const champion=results.champion;

  // For total goals: find minimum diff (to highlight winner)
  const diffs=participants
    .filter(p=>p.bets?.totalGoals!=null&&p.bets.totalGoals!=="")
    .map(p=>Math.abs(+p.bets.totalGoals-(actualGoals??0)));
  const minDiff=diffs.length?Math.min(...diffs):null;

  return(
    <div className="home-card">
      <div className="home-card-title">⭐ הימורים מיוחדים</div>

      {/* Champion */}
      <div className="sp-section">
        <div className="sp-label">
          🏆 אלופה
          {champion&&<span className="sp-live-val">{withFlag(teamNames?.[champion]||champion)}</span>}
          {!champion&&<span className="sp-pending">ממתין לסיום</span>}
        </div>
        <div className="sp-chips">
          {participants.map(p=>{
            const bet=p.bets?.champion; if(!bet)return null;
            const correct=over&&champion&&bet===champion;
            const wrong=over&&champion&&!correct;
            return(
              <div key={p.uid} className={`sp-chip ${correct?"sp-correct":wrong?"sp-wrong":""}`}>
                <span className="sp-chip-name">{p.name.split(" ")[0]}</span>
                <span className="sp-chip-val">{withFlag(teamNames?.[bet]||bet)}</span>
                {correct&&<span className="sp-pts">+12נק׳</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Golden Boot */}
      <div className="sp-section">
        <div className="sp-label">
          👟 מלך שערים
          {topScorer&&<span className="sp-live-val">{withStrikerFlag(topScorer.name)} ({topScorer.goals}⚽)</span>}
          {!topScorer&&<span className="sp-pending">ממתין לנתונים</span>}
        </div>
        <div className="sp-chips">
          {participants.map(p=>{
            const bet=p.bets?.goldenBoot; if(!bet)return null;
            const correct=over&&topScorer?.name&&bet.trim().toLowerCase()===topScorer.name.trim().toLowerCase();
            const wrong=over&&topScorer?.name&&!correct;
            return(
              <div key={p.uid} className={`sp-chip ${correct?"sp-correct":wrong?"sp-wrong":""}`}>
                <span className="sp-chip-name">{p.name.split(" ")[0]}</span>
                <span className="sp-chip-val">{withStrikerFlag(bet)}</span>
                {correct&&<span className="sp-pts">+12נק׳</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Total Goals */}
      <div className="sp-section">
        <div className="sp-label">
          ⚽ סה״כ שערים בטורניר
          {actualGoals!=null&&<span className="sp-live-val">{actualGoals} שערים</span>}
          {actualGoals==null&&<span className="sp-pending">0 שערים עד כה</span>}
        </div>
        <div className="sp-chips">
          {participants.map(p=>{
            const bet=p.bets?.totalGoals; if(bet==null||bet==="")return null;
            const diff=actualGoals!=null?Math.abs(+bet-actualGoals):null;
            const isWinner=over&&diff!=null&&diff===minDiff;
            const wrong=over&&!isWinner;
            return(
              <div key={p.uid} className={`sp-chip ${isWinner?"sp-correct":wrong?"sp-wrong":""}`}>
                <span className="sp-chip-name">{p.name.split(" ")[0]}</span>
                <span className="sp-chip-val">{bet}</span>
                {isWinner&&<span className="sp-diff sp-exact">🎯</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── HOME VIEW ────────────────────────────────────────────────────────────────
function HomeView({me, participants, results, teamNames, odds, onSelectPlayer, onSaveBets, onGoToGroups, showWinner, setShowWinner}){
  const myBets=me?.bets||{};
  const globalLocked=isGlobalLocked();
  const [champion,setChampion]=useState(myBets.champion||"");
  const [goldenBoot,setGoldenBoot]=useState(myBets.goldenBoot||"");
  const [totalGoals,setTotalGoals]=useState(myBets.totalGoals||"");
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  useEffect(()=>{
    setChampion(myBets.champion||"");
    setGoldenBoot(myBets.goldenBoot||"");
    setTotalGoals(myBets.totalGoals||"");
  },[myBets.champion,myBets.goldenBoot,myBets.totalGoals]);
  const handleSaveSpecial=async()=>{
    setSaving(true);
    await onSaveBets({...myBets,champion,goldenBoot,totalGoals});
    setSaving(false);setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  };
  const nowTs=Date.now();
  const liveMatches=GROUP_MATCHES.filter(m=>results.matches?.[m.id]?.live===true);
  const nextMatch=liveMatches.length===0&&GROUP_MATCHES
    .filter(m=>{
      if(!m.kickoff)return false;
      const res=results.matches?.[m.id];
      return res?.home==null; // no result yet = hasn't finished (includes delayed/not-started)
    })
    .sort((a,b)=>new Date(a.kickoff).getTime()-new Date(b.kickoff).getTime())[0];
  const groupsPickedCount=Object.keys(GROUPS_2026).filter(g=>(myBets.groups?.[g]||[]).length===2).length;
  const ranked=[...participants].map(p=>({...p,score:calcScore(p.bets||{},results,participants)})).sort((a,b)=>b.score-a.score);
  const medals=["🥇","🥈","🥉"];
  const tournamentOver=isTournamentOver();
  const leader=ranked[0]||null;

  // Auto-show once when tournament ends
  useEffect(()=>{
    if(!tournamentOver||!leader)return;
    const key=`winner_shown_${leader.uid}`;
    if(!localStorage.getItem(key)){
      setShowWinner(true);
      localStorage.setItem(key,"1");
    }
  },[tournamentOver, leader?.uid]);
  return(
    <div className="section">
      {me&&(
        <div className="home-card">
          <div className="home-card-title">
            🎯 ההימורים הכלליים שלי
            {globalLocked&&<span className="lock-badge-sm"> 🔒 נעול</span>}
          </div>
          {globalLocked?(
            <div className="home-bets-grid">
              <div className="home-bet-item">
                <span className="home-bet-label">🏆 אלופה</span>
                <span className="home-bet-val">{myBets.champion?withFlag(teamNames?.[myBets.champion]||myBets.champion):"—"}</span>
              </div>
              <div className="home-bet-item">
                <span className="home-bet-label">👟 מלך שערים</span>
                <span className="home-bet-val">{withStrikerFlag(myBets.goldenBoot)||"—"}</span>
              </div>
              <div className="home-bet-item">
                <span className="home-bet-label">⚽ ניחוש שערים</span>
                <span className="home-bet-val">{myBets.totalGoals!=null?myBets.totalGoals:"—"}</span>
              </div>
              <div className="home-bet-item">
                <span className="home-bet-label">🏠 בתים שנבחרו</span>
                <span className="home-bet-val">{groupsPickedCount}/12</span>
              </div>
            </div>
          ):(
            <div className="home-special-form">
              <div className="special-row">
                <label>🏆 אלופה <span className="pts-hint">(12נק׳)</span></label>
                <select value={champion} onChange={e=>setChampion(e.target.value)}>
                  <option value="">— בחר קבוצה —</option>
                  {REAL_TEAMS.map(t=><option key={t} value={t}>{withFlag(teamNames?.[t]||t)}</option>)}
                </select>
              </div>
              <div className="special-row">
                <label>👟 מלך שערים <span className="pts-hint">(12נק׳)</span></label>
                <select value={goldenBoot} onChange={e=>setGoldenBoot(e.target.value)}>
                  <option value="">— בחר שחקן —</option>
                  {STRIKERS.map(s=><option key={s} value={s}>{STRIKER_FLAGS[s]||""} {s}</option>)}
                </select>
              </div>
              <div className="special-row">
                <label>⚽ ניחוש סה״כ שערים <span className="pts-hint">(קרוב ביותר מנצח)</span></label>
                <input type="number" placeholder="כמה שערים?" value={totalGoals} onChange={e=>setTotalGoals(e.target.value)}/>
              </div>
              <div className="home-groups-indicator" onClick={onGoToGroups} style={{cursor:"pointer"}}>
                <span>🏠 בתים שנבחרו</span>
                <span className={groupsPickedCount===12?"val-green":"val-muted"}>{groupsPickedCount}/12 — לחץ לעריכה</span>
              </div>
              <button className="btn-green" onClick={handleSaveSpecial} disabled={saving}>
                {saved?"✅ נשמר!":saving?"...":"💾 שמור הימורים"}
              </button>
            </div>
          )}
        </div>
      )}
      {liveMatches.length>0?(
        <div className="home-card">
          <div className="home-card-title">🔴 משחקים חיים</div>
          {liveMatches.map(m=>{
            const real=results.matches[m.id];
            const hasReal=real?.home!=null&&real?.away!=null;
            return(
              <div key={m.id} className="results-match-block">
                <MatchRow m={m} res={real} teamNames={teamNames}/>
                <div className="rev-bets-row">
                  {participants.map(p=>{
                    const bet=p.bets?.matches?.[m.id];
                    if(!bet||bet.home==null)return null;
                    const correct=hasReal&&getDir(+bet.home,+bet.away)===getDir(+real.home,+real.away);
                    const exact=correct&&+bet.home===+real.home&&+bet.away===+real.away;
                    const pts=hasReal?(exact?4:correct?1:0):null;
                    return(
                      <div key={p.uid} className={`rev-bet-chip ${exact?"exact":correct?"correct":hasReal?"wrong":""}`}>
                        <span className="chip-name">{p.name.split(" ")[0]}</span>
                        <span className="chip-score">{bet.away}:{bet.home}</span>
                        {pts!==null&&<span className="chip-pts">{pts>0?`+${pts}נק׳`:"✗"}</span>}
                        {exact&&<span>🎯</span>}
                        {!exact&&correct&&<span>✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ):nextMatch&&(
        <div className="home-card">
          <div className="home-card-title">⏰ המשחק הבא</div>
          <MatchRow m={nextMatch} res={results.matches?.[nextMatch.id]} teamNames={teamNames} odds={odds}/>
        </div>
      )}
      <SpecialBetsCard participants={participants} results={results} teamNames={teamNames}/>
      <div className="home-card">
        <div className="home-card-title">🏆 טבלת דירוג</div>
        <div className="prizes-row" style={{marginBottom:".6rem"}}>
          <span>👥 {participants.length} שחקנים</span>
          <span>💰 {participants.length*50} ₪ בקופה</span>
          <span>🥇 {participants.length*50} ₪ ראשון</span>
          <span>🥈 מקום אחרון משלם 50₪</span>
        </div>
        {/* Column headers */}
        <div className="lb-header">
          <span/>
          <span/>
          <span className="lb-h-label">שערים</span>
          <span className="lb-h-label">הזוכה</span>
          <span className="lb-h-label">מלך<br/>השערים</span>
          <span className="lb-h-label">נקודות</span>
        </div>
        <div className="lb-list">
          {ranked.map((p,i)=>{
            const champBet=p.bets?.champion;
            const bootBet=p.bets?.goldenBoot;
            const goalsBet=p.bets?.totalGoals;
            const champFlag=champBet?(FLAG_MAP[teamNames?.[champBet]||champBet]||"🏆"):null;
            const bootFlag=bootBet?(STRIKER_FLAGS[bootBet]||"👟"):null;
            return(
              <div key={p.uid} className={`lb-row rank-${i+1}`} onClick={()=>onSelectPlayer({...p,rank:i+1})}>
                <span className="lb-rank">{medals[i]||(i===ranked.length-1&&ranked.length>3?"🗑️":i+1)}</span>
                <div className="lb-name-col">
                  {p.photoURL
                    ?<img src={p.photoURL} className="lb-avatar" alt=""/>
                    :<div className="lb-avatar-ph">{p.name[0]}</div>}
                  <span className="lb-name">{p.name}</span>
                </div>
                <div className={`lb-circle ${!globalLocked||goalsBet==null||goalsBet===""?"lb-circle-locked":""}`}>
                  {globalLocked&&goalsBet!=null&&goalsBet!==""
                    ?<span className="lb-circle-num">{goalsBet}</span>
                    :<span className="lb-circle-icon">⚽</span>}
                </div>
                <div className={`lb-circle ${!globalLocked||!champBet?"lb-circle-locked":""}`}>
                  {globalLocked&&champFlag
                    ?<span className="lb-circle-flag">{champFlag}</span>
                    :<span className="lb-circle-icon">🏆</span>}
                </div>
                <div className={`lb-boot-cell ${!globalLocked||!bootBet?"lb-circle-locked":""}`}>
                  {globalLocked&&bootBet
                    ?<span className="lb-boot-chip">{bootBet}</span>
                    :<span className="lb-circle-icon">👟</span>}
                </div>
                <span className="lb-score">{p.score>0?`${p.score} נק׳`:"—"}</span>
              </div>
            );
          })}
          {ranked.length===0&&<div className="empty-msg">עדיין אין משתתפים</div>}
        </div>
      </div>
    </div>
  );
}

// ─── RESULTS VIEW ─────────────────────────────────────────────────────────────
function ResultsView({participants, viewerUid, results, teamNames, me, onSaveMatch, onSaveBets, odds, subTab, setSubTab}){
  const [revDate,setRevDate]=useState(getDefaultMatchDate);
  const [groupBets,setGroupBets]=useState(me?.bets?.groups||{});
  useEffect(()=>{setGroupBets(me?.bets?.groups||{});},[JSON.stringify(me?.bets?.groups)]);
  const globalLocked=isGlobalLocked();
  const dateMatches=GROUP_MATCHES.filter(m=>m.date===revDate);
  return(
    <div className="section">
      <LiveBar results={results} teamNames={teamNames}/>
      <div className="sub-tabs">
        {[["matches","⚽ משחקים"],["groups","🏠 בתים"],["knockout","🏆 נוקאאוט"]].map(([k,l])=>(
          <button key={k} className={`sub-tab ${subTab===k?"active":""}`} onClick={()=>setSubTab(k)}>{l}</button>
        ))}
      </div>
      {subTab==="matches"&&(
        <>
          <DateNav selectedDate={revDate} onChange={setRevDate}/>
          {dateMatches.length===0&&<div className="empty-msg">No games on this date</div>}
          {dateMatches.map(m=>{
            const real=results.matches?.[m.id];
            const locked=isMatchLocked(m.id, real);
            const hasReal=real?.home!=null&&real?.away!=null;
            if(!locked){
              return(
                <div key={m.id} className="results-match-block">
                  <MatchBetRow match={m} savedBet={me?.bets?.matches?.[m.id]} onSave={onSaveMatch} teamNames={teamNames} odds={odds} res={results?.matches?.[m.id]}/>
                  <div className="rev-bets-row">
                    {participants.filter(p=>p.uid!==viewerUid).map(p=>(
                      <div key={p.uid} className="rev-bet-chip locked-chip">
                        <span className="chip-name">{p.name.split(" ")[0]}</span>
                        <span className="chip-score">🔒</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return(
              <div key={m.id} className="results-match-block">
                <MatchRow m={m} res={real} teamNames={teamNames}/>
                <div className="rev-bets-row">
                  {participants.map(p=>{
                    const bet=p.bets?.matches?.[m.id];
                    if(!bet||bet.home==null)return null;
                    const correct=hasReal&&getDir(+bet.home,+bet.away)===getDir(+real.home,+real.away);
                    const exact=correct&&+bet.home===+real.home&&+bet.away===+real.away;
                    const pts=hasReal?(exact?4:correct?1:0):null;
                    return(
                      <div key={p.uid} className={`rev-bet-chip ${exact?"exact":correct?"correct":hasReal?"wrong":""}`}>
                        <span className="chip-name">{p.name.split(" ")[0]}</span>
                        <span className="chip-score">{bet.away}:{bet.home}</span>
                        {pts!==null&&<span className="chip-pts">{pts>0?`+${pts}נק׳`:"✗"}</span>}
                        {exact&&<span>🎯</span>}
                        {!exact&&correct&&<span>✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}
      {subTab==="groups"&&(
        <div className="cg-grid">
          {!globalLocked&&<p className="section-note" style={{gridColumn:'1/-1'}}>בחר 2 קבוצות לכל בית · 2נק׳ לאחת | 5נק׳ לשתיים</p>}
          {Object.entries(GROUPS_2026).map(([g, teams])=>{
            const st = computeGroupStandings(g, results.matches);
            const sorted = teams.slice().sort((a,b)=>{
              const [sa,sb]=[st[a],st[b]];
              return sb.pts!==sa.pts?sb.pts-sa.pts:sb.gd!==sa.gd?sb.gd-sa.gd:sb.gf-sa.gf;
            });
            const qualified = results.groups?.[g]||(sorted.every(t=>st[t].played===3)?sorted.slice(0,2):[]);
            const myPicks = groupBets[g]||[];
            return(
              <div key={g} className="cg-card">
                <div className="cg-card-hdr">בית {g}</div>
                <table className="st-table">
                  <thead><tr>
                    <th></th><th className="st-tc">קבוצה</th>
                    <th>מ׳</th><th>נ׳</th><th>ת׳</th><th>ה׳</th><th>±</th><th className="st-ptc">נק׳</th>
                  </tr></thead>
                  <tbody>
                    {sorted.map((t,i)=>{
                      const s=st[t], q=qualified.includes(t);
                      return(
                        <tr key={t} className={q?'st-q':''}>
                          <td className="st-num">{i+1}</td>
                          <td className="st-tc">{withFlag(teamNames?.[t]||t)}</td>
                          <td>{s.played}</td><td>{s.w}</td><td>{s.d}</td><td>{s.l}</td>
                          <td className={s.gd>0?'st-gd-pos':s.gd<0?'st-gd-neg':''}>{s.gd>0?'+':''}{s.gd}</td>
                          <td className="st-ptv">{s.pts}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="cg-bet-section">
                  {globalLocked ? (
                    <>
                      {qualified.length>0&&(
                        <div className="cg-qualifiers">עלו: {qualified.map(t=>withFlag(teamNames?.[t]||t)).join("  ")}</div>
                      )}
                      <div className="rev-bets-row wrap">
                        {participants.map(p=>{
                          const picks=p.bets?.groups?.[g]||[];
                          if(!picks.length)return null;
                          const hits=picks.filter(t=>qualified.includes(t)).length;
                          const pts=hits===2?5:hits===1?2:0;
                          return(
                            <div key={p.uid} className={`rev-bet-chip ${hits===2?"exact":hits===1?"correct":qualified.length?"wrong":""}`}>
                              <span className="chip-name">{p.name.split(" ")[0]}</span>
                              <span className="chip-score">{picks.map(t=>withFlag(teamNames?.[t]||t)).join(", ")}</span>
                              {qualified.length>0&&<span>{pts>0?`+${pts}נק׳`:"✗"}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="cg-picker">
                      {teams.map(t=>{
                        const idx=myPicks.indexOf(t);
                        const maxReached=myPicks.length>=2&&idx<0;
                        const toggle=()=>{
                          if(idx>=0) setGroupBets(prev=>({...prev,[g]:myPicks.filter(x=>x!==t)}));
                          else if(!maxReached) setGroupBets(prev=>({...prev,[g]:[...myPicks,t]}));
                        };
                        return(
                          <button key={t}
                            className={`cg-team-btn${idx>=0?' cg-sel':''}${maxReached?' cg-dim':''}`}
                            onClick={toggle} disabled={maxReached}>
                            {idx===0&&<span className="cg-badge">1</span>}
                            {idx===1&&<span className="cg-badge">2</span>}
                            {withFlag(teamNames?.[t]||t)}
                          </button>
                        );
                      })}
                      {myPicks.length<2&&<div className="cg-hint">בחר {2-myPicks.length} עוד</div>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {!globalLocked&&(
            <button className="btn-green" style={{gridColumn:'1/-1'}}
              onClick={()=>onSaveBets({...me?.bets,groups:groupBets})}>💾 שמור הימורי בתים</button>
          )}
        </div>
      )}
      {subTab==="standings"&&(
        <GroupStandingsView results={results} teamNames={teamNames}/>
      )}
      {subTab==="knockout"&&(
        <KnockoutBracketView results={results} teamNames={teamNames}/>
      )}
    </div>
  );
}

// ─── LIVE STANDINGS + KNOCKOUT BRACKET ───────────────────────────────────────

function computeGroupStandings(letter, matches) {
  const teams = GROUPS_2026[letter];
  const st = {};
  for (const t of teams) st[t] = {pts:0,w:0,d:0,l:0,gf:0,ga:0,gd:0,played:0};
  for (const m of GROUP_MATCHES.filter(gm=>gm.group===letter)) {
    const res = matches?.[m.id];
    if (res?.home==null) continue;
    const [h,a] = [res.home, res.away];
    st[m.home].played++; st[m.away].played++;
    st[m.home].gf+=h; st[m.home].ga+=a; st[m.home].gd+=h-a;
    st[m.away].gf+=a; st[m.away].ga+=h; st[m.away].gd+=a-h;
    if(h>a){st[m.home].pts+=3;st[m.home].w++;st[m.away].l++;}
    else if(h<a){st[m.away].pts+=3;st[m.away].w++;st[m.home].l++;}
    else{st[m.home].pts++;st[m.away].pts++;st[m.home].d++;st[m.away].d++;}
  }
  return st;
}

function GroupStandingsView({results, teamNames}){
  return(
    <div className="st-grid">
      {Object.entries(GROUPS_2026).map(([g, teams])=>{
        const st = computeGroupStandings(g, results.matches);
        const sorted = teams.slice().sort((a,b)=>{
          const [sa,sb]=[st[a],st[b]];
          return sb.pts!==sa.pts?sb.pts-sa.pts:sb.gd!==sa.gd?sb.gd-sa.gd:sb.gf-sa.gf;
        });
        const qualified = results.groups?.[g]||(sorted.every(t=>st[t].played===3)?sorted.slice(0,2):[]);
        return(
          <div key={g} className="st-group">
            <div className="st-group-hdr">בית {g}</div>
            <table className="st-table">
              <thead><tr>
                <th></th><th className="st-tc">קבוצה</th>
                <th>מ׳</th><th>נ׳</th><th>ת׳</th><th>ה׳</th><th>±</th><th className="st-ptc">נק׳</th>
              </tr></thead>
              <tbody>
                {sorted.map((t,i)=>{
                  const s=st[t], q=qualified.includes(t);
                  return(
                    <tr key={t} className={q?'st-q':''}>
                      <td className="st-num">{i+1}</td>
                      <td className="st-tc">{withFlag(teamNames?.[t]||t)}</td>
                      <td>{s.played}</td><td>{s.w}</td><td>{s.d}</td><td>{s.l}</td>
                      <td className={s.gd>0?'st-gd-pos':s.gd<0?'st-gd-neg':''}>{s.gd>0?'+':''}{s.gd}</td>
                      <td className="st-ptv">{s.pts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function BkTeam({name, score, won, teamNames}){
  const cls=`bk-tm${won?' bk-won':score!=null&&!won?' bk-lost':''}`;
  return(
    <div className={cls}>
      <span className="bk-tn">{name?withFlag(teamNames?.[name]||name):'?'}</span>
      {score!=null&&<span className="bk-sc">{score}</span>}
    </div>
  );
}

function BkMatch({m, result, teamNames}){
  const hW=result&&result.home>result.away, aW=result&&result.away>result.home;
  return(
    <div className={`bk-match${result?.live?' bk-live':''}`}>
      <BkTeam name={m?.home} score={result?.home} won={hW} teamNames={teamNames}/>
      <div className="bk-div"/>
      <BkTeam name={m?.away} score={result?.away} won={aW} teamNames={teamNames}/>
    </div>
  );
}

function BkCol({matches, koResults, teamNames, label}){
  return(
    <div className="bk-col">
      <div className="bk-col-lbl">{label}</div>
      <div className="bk-col-body">
        {Array.from({length:Math.max(matches.length,1)}).map((_,i)=>(
          <div key={i} className="bk-slot">
            {matches[i]
              ?<BkMatch m={matches[i]} result={koResults[matches[i].apiId]} teamNames={teamNames}/>
              :<div className="bk-ph">⏳</div>
            }
          </div>
        ))}
      </div>
    </div>
  );
}

function KnockoutBracketView({results, teamNames}){
  const kms=results.knockoutMatches||[], kr=results.koResults||{};
  if(!kms.length) return <div className="empty-msg">🏆 שלב הנוקאאוט יתחיל לאחר סיום שלב הבתים</div>;
  const by={};
  for(const m of kms)(by[m.stage]||(by[m.stage]=[])).push(m);
  const r32=by["32 האחרונות"]||[], r16=by["שמינית גמר"]||[];
  const qf=by["רבע גמר"]||[], sf=by["חצי גמר"]||[];
  const fin=by["גמר"]||[], trd=by["מקום שלישי"]||[];
  const L=a=>a.slice(0,Math.ceil(a.length/2));
  const R=a=>a.slice(Math.ceil(a.length/2));
  return(
    <div className="bk-outer">
      <div className="bk-scroll">
        {r32.length>0&&<BkCol matches={L(r32)} koResults={kr} teamNames={teamNames} label="32 אחרונות"/>}
        {r16.length>0&&<BkCol matches={L(r16)} koResults={kr} teamNames={teamNames} label="שמינית"/>}
        {qf.length>0&&<BkCol matches={L(qf)} koResults={kr} teamNames={teamNames} label="רבע גמר"/>}
        {sf.length>0&&<BkCol matches={L(sf)} koResults={kr} teamNames={teamNames} label="חצי גמר"/>}
        <div className="bk-final-col">
          <div className="bk-trophy">🏆</div>
          <div className="bk-col-lbl">גמר</div>
          {fin[0]
            ?<BkMatch m={fin[0]} result={kr[fin[0].apiId]} teamNames={teamNames}/>
            :<div className="bk-ph bk-ph-final">⏳</div>
          }
          {trd[0]&&<>
            <div className="bk-col-lbl" style={{marginTop:'.8rem'}}>מקום 3</div>
            <BkMatch m={trd[0]} result={kr[trd[0].apiId]} teamNames={teamNames}/>
          </>}
        </div>
        {sf.length>0&&<BkCol matches={R(sf)} koResults={kr} teamNames={teamNames} label="חצי גמר"/>}
        {qf.length>0&&<BkCol matches={R(qf)} koResults={kr} teamNames={teamNames} label="רבע גמר"/>}
        {r16.length>0&&<BkCol matches={R(r16)} koResults={kr} teamNames={teamNames} label="שמינית"/>}
        {r32.length>0&&<BkCol matches={R(r32)} koResults={kr} teamNames={teamNames} label="32 אחרונות"/>}
      </div>
    </div>
  );
}

// ─── RANKING VIEW ─────────────────────────────────────────────────────────────
function RankingView({participants, results, teamNames, onSelectPlayer}){
  const [expandedUid,setExpandedUid]=useState(null);
  const ranked=[...participants].map(p=>({...p,score:calcScore(p.bets||{},results,participants)})).sort((a,b)=>b.score-a.score);
  const medals=["🥇","🥈","🥉"];

  function getMatchPoints(p){
    const bets=p.bets||{};
    const items=[];
    GROUP_MATCHES.forEach(m=>{
      const bet=bets.matches?.[m.id];
      const real=results.matches?.[m.id];
      if(!bet||bet.home==null||!real||real.home==null)return;
      const correct=getDir(+bet.home,+bet.away)===getDir(+real.home,+real.away);
      const exact=correct&&+bet.home===+real.home&&+bet.away===+real.away;
      if(correct)items.push({m,bet,real,pts:exact?4:1,exact});
    });
    return items;
  }

  return(
    <div className="section">
      <LiveBar results={results} teamNames={teamNames}/>
      <div className="lb-list">
        {ranked.map((p,i)=>{
          const isExpanded=expandedUid===p.uid;
          const matchPts=isExpanded?getMatchPoints(p):[];
          return(
            <div key={p.uid}>
              <div className={`lb-row rank-${i+1}`} onClick={()=>setExpandedUid(isExpanded?null:p.uid)}>
                <span className="lb-rank">{medals[i]||i+1}</span>
                {p.photoURL&&<img src={p.photoURL} className="lb-avatar" alt=""/>}
                <span className="lb-name">{p.name}</span>
                <span className="lb-score">{p.score} נק׳</span>
                <span className="lb-expand">{isExpanded?"▲":"▼"}</span>
              </div>
              {isExpanded&&(
                <div className="ranking-breakdown">
                  {matchPts.length===0
                    ?<div className="bd-empty">עדיין אין נקודות ממשחקים</div>
                    :matchPts.map(({m,bet,real,pts,exact})=>(
                      <div key={m.id} className="breakdown-row">
                        <span className="bd-match">{withFlag(teamNames?.[m.home]||m.home)} vs {withFlag(teamNames?.[m.away]||m.away)}</span>
                        <span className="bd-detail">
                          <span className="bd-bet">{bet.home}:{bet.away}</span>
                          <span className="bd-sep">→</span>
                          <span className={`bd-real${real.live?" live":""}`}>{real.home}:{real.away}</span>
                        </span>
                        <span className={`bd-pts${exact?" exact":""}`}>+{pts}{exact?" 🎯":""}</span>
                      </div>
                    ))
                  }
                  <div className="bd-all-link" onClick={e=>{e.stopPropagation();onSelectPlayer(p);}}>
                    כל ההימורים ›
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {ranked.length===0&&<div className="empty-msg">עדיין אין משתתפים</div>}
      </div>
    </div>
  );
}

function timeAgo(ts){
  if(!ts)return"לא ידוע";
  const d=Date.now()-ts,m=Math.floor(d/60000);
  if(m<1)return"עכשיו";
  if(m<60)return`לפני ${m} דק׳`;
  const h=Math.floor(m/60);
  if(h<24)return`לפני ${h} שע׳`;
  const days=Math.floor(h/24);
  if(days===1)return"אתמול";
  return`לפני ${days} ימים`;
}

function tsToLocal(ts){
  if(!ts)return"";
  const d=new Date(ts);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")
    +"T"+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
}

function AdminPanel({ participants, game, showToast, onTriggerWinner }) {
  const [confirmAction, setConfirmAction] = useState(null);
  const [running, setRunning] = useState(false);
  const [editUid, setEditUid] = useState(null);
  const [editDate, setEditDate] = useState("");

  const actions = [
    {
      id: "allMatchBets",
      label: "אפס כל הימורי המשחקים",
      desc: "מוחק ניחושי משחקים של כולם — ידידות + מונדיאל (הימורים כלליים נשארים)",
      icon: "🧹",
      danger: true,
      run: async () => {
        for (const p of participants) {
          await saveParticipant({...p, bets: {...p.bets, matches: {}}});
        }
      }
    },
    {
      id: "allBets",
      label: "אפס הכל לחלוטין",
      desc: "מוחק כל ההימורים של כולם (משחקים + כלליים) + כל התוצאות",
      icon: "☠️",
      danger: true,
      run: async () => {
        for (const p of participants) {
          await saveParticipant({...p, bets: {}});
        }
        await saveGame({results: {}});
      }
    }
  ];

  const execute = async () => {
    if (!confirmAction) return;
    setRunning(true);
    try {
      await confirmAction.run();
      showToast(`✅ ${confirmAction.label} — בוצע!`);
    } catch(e) {
      showToast("❌ שגיאה: " + e.message);
    }
    setRunning(false);
    setConfirmAction(null);
  };

  return (
    <div className="section admin-panel">
      <h2>⚙️ פאנל מנהל</h2>
      <div className="admin-presence">
        <div className="admin-presence-title">👥 כניסות אחרונות</div>
        {[...participants].sort((a,b)=>(b.lastSeen||0)-(a.lastSeen||0)).map(p=>(
          <div key={p.uid} className="admin-presence-row">
            {p.photoURL
              ?<img src={p.photoURL} className="ap-avatar" alt=""/>
              :<div className="ap-avatar-ph">{(p.name||"?")[0]}</div>}
            <span className="ap-name">{p.name}</span>
            {editUid===p.uid?(
              <>
                <input type="datetime-local" className="ap-date-input" value={editDate}
                  onChange={e=>setEditDate(e.target.value)}/>
                <button className="ap-btn-save" onClick={async()=>{
                  if(!editDate)return;
                  await updateDoc(doc(db,"mundial2026","game","participants",p.uid),{lastSeen:new Date(editDate).getTime()});
                  setEditUid(null);
                  showToast("✅ עודכן");
                }}>✓</button>
                <button className="ap-btn-cancel" onClick={()=>setEditUid(null)}>✕</button>
              </>
            ):(
              <>
                <span className="ap-time">{timeAgo(p.lastSeen)}</span>
                <button className="ap-btn-edit" onClick={()=>{setEditUid(p.uid);setEditDate(tsToLocal(p.lastSeen||Date.now()));}}>✏️</button>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="admin-stats">
        <div className="admin-stat"><span className="admin-stat-val">{participants.length}</span><span>משתתפים</span></div>
        <div className="admin-stat"><span className="admin-stat-val">{Object.keys(game.results?.matches||{}).length}</span><span>תוצאות שמורות</span></div>
        <div className="admin-stat"><span className="admin-stat-val">{GROUP_MATCHES.length}</span><span>משחקי ליגה</span></div>
      </div>
      <div className="admin-winner-section">
        <div className="admin-action-info">
          <span className="admin-action-label">🎉 אנימציית מנצח</span>
          <span className="admin-action-desc">מציג את חלון הניצחון עם קונפטי למנצח הנוכחי</span>
        </div>
        <button className="btn-admin-winner" onClick={onTriggerWinner}>הפעל</button>
      </div>
      <div className="admin-actions">
        {actions.map(a=>(
          <div key={a.id} className={`admin-action-row ${a.danger?"admin-action-danger":""}`}>
            <div className="admin-action-info">
              <span className="admin-action-label">{a.icon} {a.label}</span>
              <span className="admin-action-desc">{a.desc}</span>
            </div>
            <button className={`btn-admin-act ${a.danger?"btn-admin-red":""}`} onClick={()=>setConfirmAction(a)}>אפס</button>
          </div>
        ))}
      </div>
      {confirmAction&&(
        <div className="admin-overlay" onClick={()=>setConfirmAction(null)}>
          <div className="admin-confirm" onClick={e=>e.stopPropagation()}>
            <div className="admin-confirm-title">אישור פעולה</div>
            <div className="admin-confirm-action">{confirmAction.icon} {confirmAction.label}</div>
            <div className="admin-confirm-desc">{confirmAction.desc}</div>
            <div className="admin-confirm-warn">⚠️ פעולה זו בלתי הפיכה!</div>
            <div className="admin-confirm-btns">
              <button className="btn-cancel-admin" onClick={()=>setConfirmAction(null)} disabled={running}>ביטול</button>
              <button className="btn-confirm-admin" onClick={execute} disabled={running}>{running?"מבצע...":"כן, אפס!"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function resizeImageToDataURL(file,size=120){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      const s=Math.min(img.width,img.height);
      const sx=(img.width-s)/2,sy=(img.height-s)/2;
      const canvas=document.createElement("canvas");
      canvas.width=size;canvas.height=size;
      canvas.getContext("2d").drawImage(img,sx,sy,s,s,0,0,size,size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg",0.75));
    };
    img.onerror=reject;
    img.src=url;
  });
}

function ProfileEditModal({authUser,currentParticipant,onClose,showToast}){
  const [name,setName]=useState(currentParticipant?.name||authUser.displayName||"");
  const [photoData,setPhotoData]=useState(null);
  const [preview,setPreview]=useState(currentParticipant?.photoURL||authUser.photoURL||null);
  const [saving,setSaving]=useState(false);

  async function handleFileChange(e){
    const f=e.target.files[0];
    if(!f)return;
    try{
      const data=await resizeImageToDataURL(f);
      setPhotoData(data);
      setPreview(data);
    }catch{ /* ignore */ }
  }

  async function handleSave(){
    setSaving(true);
    try{
      const photoURL=photoData||(currentParticipant?.photoURL||authUser.photoURL||null);
      await updateDoc(doc(db,"mundial2026","game","participants",authUser.uid),{
        name:name.trim()||authUser.displayName,
        photoURL
      });
      showToast("הפרופיל עודכן ✓");
      onClose();
    }catch(e){
      showToast("שגיאה בשמירה");
    }finally{
      setSaving(false);
    }
  }

  return(
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-confirm profile-modal" onClick={e=>e.stopPropagation()}>
        <div className="admin-confirm-title">עריכת פרופיל</div>
        <div className="profile-avatar-wrap">
          {preview?<img src={preview} className="profile-avatar-lg" alt=""/>:<div className="profile-avatar-placeholder">👤</div>}
          <label className="btn-upload">
            שנה תמונה
            <input type="file" accept="image/*" onChange={handleFileChange} style={{display:"none"}}/>
          </label>
        </div>
        <div className="profile-label">שם תצוגה</div>
        <input className="profile-input" value={name} onChange={e=>setName(e.target.value)} maxLength={30}/>
        <div className="admin-confirm-btns">
          <button className="btn-confirm-admin" style={{background:"var(--green)",color:"#000"}} onClick={handleSave} disabled={saving}>{saving?"שומר...":"שמור"}</button>
          <button className="btn-cancel-admin" onClick={onClose}>ביטול</button>
        </div>
      </div>
    </div>
  );
}


async function syncRedCards(){
  try{
    const gameSnap=await getDoc(doc(db,"mundial2026","game"));
    const cur=gameSnap.exists()?gameSnap.data():{};
    const matches=cur.results?.matches||{};
    const liveMatchIds=Object.entries(matches).filter(([,m])=>m.live).map(([id])=>id);
    if(!liveMatchIds.length)return;

    const heb=n=>SOFA_TEAM_MAP[n]||n;

    // Single API-Football call returns all live fixtures with their events.
    // One call covers every live match — no per-match calls needed.
    let fixtures=[];
    try{
      const r=await fetch("https://v3.football.api-sports.io/fixtures?live=all",{headers:{"x-apisports-key":AF_KEY}});
      const d=await r.json();
      fixtures=d.response||[];
    }catch{return;}

    const updates={};
    for(const matchId of liveMatchIds){
      const gm=GROUP_MATCHES.find(m=>m.id===matchId);
      if(!gm)continue;
      const fix=fixtures.find(f=>heb(f.teams?.home?.name||"")===gm.home&&heb(f.teams?.away?.name||"")===gm.away);
      if(!fix)continue;

      const reds={home:0,away:0};
      for(const ev of(fix.events||[])){
        if(ev.type!=="Card")continue;
        const d=(ev.detail||"").toLowerCase();
        if(!d.includes("red")&&!d.includes("yellow red"))continue;
        if(ev.team?.id===fix.teams?.home?.id)reds.home++;
        else reds.away++;
      }
      const prev=matches[matchId]?.reds||{home:0,away:0};
      if(reds.home!==prev.home||reds.away!==prev.away)
        updates[`results.matches.${matchId}.reds`]=reds;
    }
    if(Object.keys(updates).length)
      await updateDoc(doc(db,"mundial2026","game"),updates);
  }catch(e){console.warn("Red card sync failed:",e.message);}
}

export default function App(){
  const [authUser,setAuthUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [signingIn,setSigningIn]=useState(false);
  const [game,setGame]=useState({joinCode:"",results:{},playoffNames:{}});
  const [participants,setParticipants]=useState([]);
  const [gameLoading,setGameLoading]=useState(true);
  const [tab,setTab]=useState("home");
  const [resultsSubTab,setResultsSubTab]=useState("matches");
  const [selectedPlayer,setSelectedPlayer]=useState(null);
  const [toast,setToast]=useState(null);
  const [odds,setOdds]=useState({});
  const [showProfileEdit,setShowProfileEdit]=useState(false);
  const [showWinner,setShowWinner]=useState(false);
  const toastRef=useRef(null);
  const showToast=msg=>{setToast(msg);clearTimeout(toastRef.current);toastRef.current=setTimeout(()=>setToast(null),2800);};

  useEffect(()=>{
    // Delay odds fetch so Firebase+Auth load first, then fill in odds silently
    const init=setTimeout(()=>fetchOdds().then(setOdds), 3000);
    const poll=setInterval(()=>fetchOdds().then(setOdds), 5*60*1000);
    return()=>{clearTimeout(init);clearInterval(poll);};
  },[]);

  useEffect(()=>{
    return onAuthStateChanged(auth,async user=>{
      setAuthUser(user);setAuthLoading(false);
      if(user){
        const snap=await getDoc(doc(db,"mundial2026","game","participants",user.uid));
        if(!snap.exists())
          await saveParticipant({uid:user.uid,name:user.displayName,photoURL:user.photoURL||null,bets:{}});
        await updateDoc(doc(db,"mundial2026","game","participants",user.uid),{lastSeen:Date.now()});
      }
    });
  },[]);

  useEffect(()=>{
    loadGame().then(g=>{setGame(g);setGameLoading(false);});
    const u1=onSnapshot(doc(db,"mundial2026","game"),snap=>{
      if(snap.exists()){
        const d=snap.data();
        setGame(d);
        _koKickoffs=(d.results?.knockoutMatches||[]).filter(m=>m.kickoff).map(m=>new Date(m.kickoff).getTime());
      }
    });
    const u2=onSnapshot(collection(db,"mundial2026","game","participants"),snap=>{
      setParticipants(snap.docs.map(d=>({...d.data(),uid:d.id})));
    });

    const heb = n => SOFA_TEAM_MAP[n]||n;

    const syncScores = async (uid) => {
      try {
        // ── Only sync during active match windows ───────────────────
        // 10h window: covers live play (2h) + overnight catchup if midnight sync was missed
        const now = Date.now();
        const SYNC_WINDOW = 10 * 60 * 60 * 1000;
        const hasActiveMatch = GROUP_MATCHES.some(m => {
          const t = new Date(m.kickoff).getTime();
          return now >= t - 5*60*1000 && now <= t + SYNC_WINDOW;
        });
        if (!hasActiveMatch) return;

        // ── LEADER LOCK: only one client calls ESPN at a time ───────
        const syncSnap = await getDoc(doc(db,"mundial2026","sync"));
        const syncData = syncSnap.exists() ? syncSnap.data() : {};
        const lastSync = syncData.lastSync ? new Date(syncData.lastSync).getTime() : 0;
        const secondsSinceLast = (now - lastSync) / 1000;

        // If synced less than 45s ago by someone else, skip — read from Firebase instead
        if (secondsSinceLast < 20 && syncData.syncedBy !== uid) return;

        // Claim the sync slot
        await setDoc(doc(db,"mundial2026","sync"), {
          lastSync: new Date().toISOString(),
          syncedBy: uid,
        });

        // ── Score source parsers ────────────────────────────────────
        const now2 = new Date();
        const yyyymmdd = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
        const isoDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

        const addBothKeys = (res, h, a, hg, ag, status, live, minute) => {
          res[`${h}_${a}`]={home:hg,away:ag,status,live,minute:minute??null};
          res[`${a}_${h}`]={home:ag,away:hg,status,live,minute:minute??null};
        };

        const parseESPN = evs => {
          const res={};
          for(const ev of(evs||[])){
            const comp=ev.competitions?.[0]; if(!comp)continue;
            const state=comp.status?.type?.state;
            const fin=state==="post", live=state==="in";
            if(!fin&&!live)continue;
            const hC=comp.competitors?.find(c=>c.homeAway==="home");
            const aC=comp.competitors?.find(c=>c.homeAway==="away");
            if(!hC||!aC)continue;
            const hg=parseInt(hC.score,10),ag=parseInt(aC.score,10);
            if(isNaN(hg)||isNaN(ag))continue;
            const minute=live ? (parseInt(comp.status?.displayClock,10)||null) : null;
            addBothKeys(res,heb(hC.team.displayName),heb(aC.team.displayName),hg,ag,fin?"FT":"LIVE",live,minute);
          }
          return res;
        };

        const parseSofaScore = evs => {
          const res={};
          for(const ev of(evs||[])){
            const t=ev.status?.type;
            const fin=t==="finished", live=t==="inprogress";
            if(!fin&&!live)continue;
            const hg=ev.homeScore?.current, ag=ev.awayScore?.current;
            if(hg==null||ag==null)continue;
            const minute=live ? (ev.time?.played??null) : null;
            const hn=heb(ev.homeTeam?.name), an=heb(ev.awayTeam?.name);
            addBothKeys(res,hn,an,hg,ag,fin?"FT":"LIVE",live,minute);
            if(ev.id){res[`${hn}_${an}`].sofaId=ev.id;res[`${an}_${hn}`].sofaId=ev.id;}
          }
          return res;
        };

        const parseSportsDB = evs => {
          const res={};
          for(const ev of(evs||[])){
            const s=ev.strStatus;
            const fin=["FT","AET","PEN"].includes(s), live=["1H","2H","HT","ET","P","LIVE"].includes(s);
            if(!fin&&!live)continue;
            const hg=parseInt(ev.intHomeScore,10),ag=parseInt(ev.intAwayScore,10);
            if(isNaN(hg)||isNaN(ag))continue;
            const minute=live ? (parseInt(ev.intProgress,10)||null) : null;
            addBothKeys(res,heb(ev.strHomeTeam),heb(ev.strAwayTeam),hg,ag,fin?"FT":"LIVE",live,minute);
          }
          return res;
        };

        const parseFDScore = ms => {
          const res={};
          for(const m of(ms||[])){
            const s=m.status;
            const fin=["FINISHED","AWARDED"].includes(s),live=["IN_PLAY","PAUSED","HALFTIME"].includes(s);
            if(!fin&&!live)continue;
            const hg=m.score?.fullTime?.home,ag=m.score?.fullTime?.away;
            if(hg==null||ag==null)continue;
            const minute=live?(m.minute??null):null;
            addBothKeys(res,heb(m.homeTeam?.name||""),heb(m.awayTeam?.name||""),hg,ag,fin?"FT":"LIVE",live,minute);
          }
          return res;
        };

        // Fetch from multiple sources — merge all to avoid ESPN early-return missing small matches
        const fetchWithFallback = async (espnSlugs, iso, ymd) => {
          const merged = {};
          // 1. ESPN — collect all slugs, don't stop on first hit
          for(const slug of espnSlugs){
            try{
              const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${ymd}`);
              const d=await r.json();
              if(d.events?.length) Object.assign(merged, parseESPN(d.events));
            }catch(e){}
          }
          // 2. TheSportsDB — always supplement
          try{
            const r=await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${iso}&s=Soccer`);
            const d=await r.json();
            if(d.events?.length){
              const p=parseSportsDB(d.events);
              for(const [k,v] of Object.entries(p)) if(!merged[k]) merged[k]=v;
            }
          }catch(e){}
          // 3. SofaScore — always supplement (covers obscure matches ESPN/TheSportsDB miss)
          try{
            const r=await fetch(`https://api.sofascore.com/api/v1/sport/football/scheduled-events/${iso}`);
            const d=await r.json();
            if(d.events?.length){
              const p=parseSofaScore(d.events);
              for(const [k,v] of Object.entries(p)) if(!merged[k]) merged[k]=v;
            }
          }catch(e){}
          // 4. API-Football — rate-limited to once per hour to preserve 100/day quota
          const lastAF = syncData.lastApiFootballSync ? new Date(syncData.lastApiFootballSync).getTime() : 0;
          if (Date.now() - lastAF > 60 * 60 * 1000) {
            try{
              const r=await fetch(`https://v3.football.api-sports.io/fixtures?date=${iso}`,{headers:{"x-apisports-key":AF_KEY}});
              const d=await r.json();
              for(const f of(d.response||[])){
                const{fixture:fi,teams,goals}=f;
                const s=fi.status.short;
                const fin=["FT","AET","PEN"].includes(s),live=["1H","2H","HT","ET","BT","P","SUSP","INT","LIVE"].includes(s);
                if((fin||live)&&goals.home!=null&&goals.away!=null){
                  const minute=live ? (fi.status.elapsed??null) : null;
                  const k1=`${heb(teams.home.name)}_${heb(teams.away.name)}`;
                  if(!merged[k1]) addBothKeys(merged,heb(teams.home.name),heb(teams.away.name),goals.home,goals.away,fin?"FT":"LIVE",live,minute);
                }
              }
              await setDoc(doc(db,"mundial2026","sync"),{lastApiFootballSync:new Date().toISOString()},{merge:true});
            }catch(e){}
          }
          return merged;
        };

        const today = yyyymmdd(now2);
        const todayISO = isoDate(now2);
        const firstWCKickoff = Math.min(...GROUP_MATCHES.filter(m=>m.group!=="יזיזות").map(m=>new Date(m.kickoff).getTime()));
        const wcStarted = Date.now() >= firstWCKickoff - 2*60*60*1000;

        let standingsData = { response: [] }; // kept for compatibility, no longer used for standings

        const gameSnap = await getDoc(doc(db,"mundial2026","game"));
        const cur = gameSnap.exists() ? gameSnap.data() : {};

        // ── MATCHES ────────────────────────────────────────────────
        const byKey = {};

        // Friendly/test matches — fetch by the actual kickoff dates of active friendlies
        // (avoids midnight bug: after 00:00, new Date() returns next day but matches are still from prev day)
        const activeFriendlyDates = [...new Set(
          GROUP_MATCHES
            .filter(m => { const t=new Date(m.kickoff).getTime(); return m.group==="יזיזות" && now >= t - 5*60*1000 && now <= t + SYNC_WINDOW; })
            .map(m => isoDate(new Date(m.kickoff)))
        )];
        for (const iso of activeFriendlyDates) {
          const ymd = iso.replace(/-/g, '');
          Object.assign(byKey, await fetchWithFallback(["fifa.friendly","intl.friendlies"], iso, ymd));
        }

        // WC matches — ESPN→SofaScore→TheSportsDB→API-Football
        if (wcStarted) {
          // Also derive date from active WC match kickoffs to handle midnight crossing
          const activeWCDates = [...new Set(
            GROUP_MATCHES
              .filter(m => { const t=new Date(m.kickoff).getTime(); return m.group!=="יזיזות" && now >= t - 5*60*1000 && now <= t + SYNC_WINDOW; })
              .map(m => isoDate(new Date(m.kickoff)))
          )];
          const wcDates = activeWCDates.length ? activeWCDates : [todayISO];
          for (const iso of wcDates) {
            const ymd = iso.replace(/-/g, '');
            Object.assign(byKey, await fetchWithFallback(["fifa.world"], iso, ymd));
            // football-data.org supplement — via server-side proxy (no CORS)
            try{
              const r=await fetch(fdProxy(`/v4/competitions/WC/matches?dateFrom=${iso}&dateTo=${iso}`));
              const d=await r.json();
              if(d.matches?.length){const p=parseFDScore(d.matches);for(const [k,v] of Object.entries(p)) if(!byKey[k]) byKey[k]=v;}
            }catch(e){}
          }
        }

        // Extra: SofaScore live events — catches obscure matches missed by ESPN date-based calls
        try{
          const r=await fetch(`https://api.sofascore.com/api/v1/sport/football/events/live`);
          const d=await r.json();
          if(d.events?.length){
            const p=parseSofaScore(d.events);
            for(const [k,v] of Object.entries(p)) if(!byKey[k]) byKey[k]=v;
          }
        }catch(e){}

        const fixtures = [];
        const curMatches = cur.results?.matches || {};
        const updatedMatches = {...curMatches};
        let matchChanged = false;
        for (const m of GROUP_MATCHES) {
          const key = `${m.home}_${m.away}`;
          if (byKey[key]) {
            const prev = curMatches[m.id], next = byKey[key];
            if (!prev || prev.home!==next.home || prev.away!==next.away || prev.live!==next.live || prev.minute!==next.minute) {
              updatedMatches[m.id] = {...(curMatches[m.id]||{}), ...next}; matchChanged = true;
            }
          }
        }

        // ── STANDINGS → derive from stored results, no API call needed ────
        let groupsChanged = false;
        const updatedGroups = {...(cur.results?.groups||{})};

        for (const [letter, teams] of Object.entries(GROUPS_2026)) {
          const groupMatches = GROUP_MATCHES.filter(m => m.group === letter);
          const allComplete = groupMatches.every(m => {
            const md = updatedMatches[m.id];
            return md && md.home != null && md.away != null && !md.live;
          });
          if (!allComplete) continue;

          const st = {};
          for (const t of teams) st[t] = {pts:0, gd:0, gf:0};
          for (const m of groupMatches) {
            const md = updatedMatches[m.id];
            const h = md.home, a = md.away;
            st[m.home].gf += h; st[m.home].gd += h - a;
            st[m.away].gf += a; st[m.away].gd += a - h;
            if (h > a)      { st[m.home].pts += 3; }
            else if (h < a) { st[m.away].pts += 3; }
            else            { st[m.home].pts += 1; st[m.away].pts += 1; }
          }
          const top2 = teams.slice().sort((a,b) => {
            const sa=st[a], sb=st[b];
            if (sb.pts !== sa.pts) return sb.pts - sa.pts;
            if (sb.gd  !== sa.gd)  return sb.gd  - sa.gd;
            return sb.gf - sa.gf;
          }).slice(0, 2);

          const prev = updatedGroups[letter];
          if (!prev || JSON.stringify(prev) !== JSON.stringify(top2)) {
            updatedGroups[letter] = top2; groupsChanged = true;
          }
        }

        // ── KNOCKOUT MATCHES — fetch from ESPN (free, unlimited) ──────────
        const STAGE_MAP = {
          "Round of 32":"32 האחרונות","Round of 16":"שמינית גמר",
          "Quarter-finals":"רבע גמר","Semi-finals":"חצי גמר",
          "3rd Place Final":"מקום שלישי","Final":"גמר"
        };
        const ROUND_SLUG = {
          "32 האחרונות":"round-of-32","שמינית גמר":"round-of-16",
          "רבע גמר":"quarterfinals","חצי גמר":"semifinals",
          "מקום שלישי":"third-place","גמר":"final"
        };
        const koMatchesArr = [];
        const koResults = {};
        try {
          const koRes = await fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard");
          const koData = await koRes.json();
          for (const ev of (koData.events || [])) {
            const comp = ev.competitions?.[0];
            if (!comp) continue;
            const round = ev.season?.slug || ev.name || "";
            let stage = null;
            for (const [eng, heb2] of Object.entries(STAGE_MAP)) {
              if (round.toLowerCase().includes(eng.toLowerCase()) || (ev.season?.type?.name||"").toLowerCase().includes(eng.toLowerCase())) {
                stage = heb2; break;
              }
            }
            if (!stage) continue;
            const hC = comp.competitors?.find(c=>c.homeAway==="home");
            const aC = comp.competitors?.find(c=>c.homeAway==="away");
            if (!hC || !aC) continue;
            const state = comp.status?.type?.state;
            const isFinished = state === "post";
            const isLive = state === "in";
            const dateStr = ev.date ? new Date(ev.date).toLocaleDateString("he-IL",{day:"2-digit",month:"2-digit"}) : "";
            const koMatch = {
              id: `ko_${ev.id}`, apiId: ev.id, stage, date: dateStr,
              home: heb(hC.team?.displayName||""), away: heb(aC.team?.displayName||""),
              kickoff: ev.date||null,
            };
            if ((isFinished||isLive) && hC.score != null) {
              koResults[ev.id] = {home:parseInt(hC.score,10), away:parseInt(aC.score,10), live:isLive};
            }
            koMatchesArr.push(koMatch);
          }
        } catch(e) {}

        // ── TOP SCORER + TOTAL GOALS (WC only, not friendlies) ─────────────
        let topScorerUpdate = null;
        if (wcStarted) {
          // Fetch top scorer from football-data.org, max once/hour
          const lastTS = syncData.lastTopScorerSync ? new Date(syncData.lastTopScorerSync).getTime() : 0;
          if (Date.now() - lastTS > 60 * 60 * 1000) {
            try {
              const r = await fetch(fdProxy('/v4/competitions/WC/scorers'));
              const d = await r.json();
              if (d.scorers?.length) {
                const top = d.scorers[0];
                const hebName = apiNameToHeb(top.player?.name||"") || top.player?.name || "";
                topScorerUpdate = { name: hebName, goals: top.goals ?? 0 };
                await setDoc(doc(db,"mundial2026","sync"),{lastTopScorerSync:new Date().toISOString()},{merge:true});
              }
            } catch(e) {}
          }
        }

        // Compute total WC goals — includes live matches (count as-you-go), excludes orphan friendlies
        let wcGoals = 0;
        for (const [id, m] of Object.entries(updatedMatches)) {
          const gm = GROUP_MATCHES.find(g => g.id === id);
          if (!gm) continue; // skip orphan friendly IDs (T53, T54 etc.) still in Firestore
          if (m.home != null && m.away != null) wcGoals += m.home + m.away;
        }
        for (const m of Object.values(koResults)) {
          if (m.home != null && m.away != null) wcGoals += m.home + m.away;
        }
        const goalsChanged = wcStarted && wcGoals !== (cur.results?.actualTotalGoals ?? -1);
        const topScorerChanged = topScorerUpdate && (
          topScorerUpdate.name !== cur.results?.topScorer?.name ||
          topScorerUpdate.goals !== cur.results?.topScorer?.goals
        );

        const updates = {};
        if (matchChanged || groupsChanged || koMatchesArr.length > 0 || topScorerChanged || goalsChanged) {
          updates.results = {
            ...cur.results,
            matches: updatedMatches,
            koResults,
            knockoutMatches: koMatchesArr,
            ...(groupsChanged ? {groups: updatedGroups} : {}),
            ...(topScorerChanged ? {topScorer: topScorerUpdate} : {}),
            ...(goalsChanged ? {actualTotalGoals: wcGoals} : {}),
          };
        }
        if (Object.keys(updates).length) await saveGame(updates);

      } catch(e) { console.warn("Score sync failed:", e.message); }
    };

    syncScores(auth.currentUser?.uid||"anon");
    const poll = setInterval(()=>syncScores(auth.currentUser?.uid||"anon"), 15 * 1000);
    const redPoll = setInterval(()=>syncRedCards(), 3 * 60 * 1000);
    return()=>{u1();u2();clearInterval(poll);clearInterval(redPoll);};
  },[]);

  const handleSignIn=async()=>{
    setSigningIn(true);
    try{await signInWithPopup(auth,googleProvider);}catch(e){console.error(e);}
    setSigningIn(false);
  };
  const handleSaveBets=async bets=>{
    if(!authUser)return;
    const cur=participants.find(p=>p.uid===authUser.uid)||{};
    await saveParticipant({...cur,uid:authUser.uid,bets});
    showToast("✅ הימורים נשמרו!");
  };

  const handleSaveMatchBet=async(matchId, matchBet)=>{
    if(!authUser)return;
    const cur=participants.find(p=>p.uid===authUser.uid)||{};
    const updatedBets={...cur.bets,matches:{...cur.bets?.matches,[matchId]:matchBet}};
    await saveParticipant({...cur,uid:authUser.uid,bets:updatedBets});
  };
  const handleSaveKoMatchBet=async(matchId, matchBet)=>{
    if(!authUser)return;
    const cur=participants.find(p=>p.uid===authUser.uid)||{};
    const updatedBets={...cur.bets,koMatches:{...cur.bets?.koMatches,[matchId]:matchBet}};
    await saveParticipant({...cur,uid:authUser.uid,bets:updatedBets});
  };

  const teamNames=game.playoffNames||{};
  const me=authUser?participants.find(p=>p.uid===authUser.uid):null;
  const isAdmin=authUser?.uid===ADMIN_UID;
  const n=participants.length;
  const tournamentOver=isTournamentOver();
  const appRanked=[...participants].map(p=>({...p,score:calcScore(p.bets||{},game.results||{},participants)})).sort((a,b)=>b.score-a.score);
  const appLeader=appRanked[0]||null;

  if(authLoading||gameLoading)return(<div className="app loading-screen"><div className="loading-ball">⚽</div><p>טוען...</p></div>);
  if(!authUser)return(<div className="app"><SignInScreen onSignIn={handleSignIn} loading={signingIn}/><style>{STYLES}</style></div>);

  if(selectedPlayer)return(
    <div className="app" dir="rtl">
      <Toast msg={toast}/>
      <div className="main-screen">
        <div className="main-header">
          <button className="back-btn" onClick={()=>setSelectedPlayer(null)}>→</button>
          <span className="header-title">הימורים של {selectedPlayer.name}</span>
        </div>
        <div className="main-body">
          <PlayerBetsView player={selectedPlayer} viewerUid={authUser.uid} results={game.results||{}} teamNames={teamNames}/>
        </div>
      </div>
      <style>{STYLES}</style>
    </div>
  );

  return(
    <>
    <div className="app" dir="rtl">
      <Toast msg={toast}/>
      <div className="main-screen">
        <div className="main-header">
          <div className="header-user" onClick={()=>setShowProfileEdit(true)} style={{cursor:"pointer"}} title="עריכת פרופיל">
            {(me?.photoURL||authUser.photoURL)&&<img src={me?.photoURL||authUser.photoURL} className="header-avatar" alt=""/>}
            <span className="header-name">{(me?.name||authUser.displayName)?.split(" ")[0]}</span>
          </div>
          <div className="header-title">
            <div>מונדיאל<span style={{color:"var(--green)"}}>Bet</span><span style={{color:"var(--gold)"}}>2026</span></div>
            <div className="header-subtitle">על שם נייל קלארק</div>
          </div>
          <button className="btn-signout" onClick={()=>signOut(auth)}>יציאה</button>
        </div>
        <div className="main-content">
        <div className="main-tabs">
          {[["home","🏟️","בית"],["results","score","תוצאות"],["rules","ref","חוקים"],...(isAdmin?[["admin","⚙️","מנהל"]]:[])].map(([k,icon,label])=>(
            <button key={k} className={`main-tab ${tab===k?"active":""}`} onClick={()=>setTab(k)}>
              {icon==="score"
                ? <span className="tab-icon tab-score">3:2</span>
                : icon==="ref"
                ? <span className="tab-icon"><img src="/referee.png" className="tab-ref-img" alt="referee"/></span>
                : <span className="tab-icon">{icon}</span>
              }
              <span className="tab-label">{label}</span>
            </button>
          ))}
        </div>
        <div className="main-body">
          {tab==="home"&&(
            <HomeView
              me={me}
              participants={participants}
              results={game.results||{}}
              teamNames={teamNames}
              odds={odds}
              onSelectPlayer={setSelectedPlayer}
              onSaveBets={handleSaveBets}
              onGoToGroups={()=>{setTab("results");setResultsSubTab("groups");}}
              showWinner={showWinner}
              setShowWinner={setShowWinner}
            />
          )}
          {tab==="results"&&(
            <ResultsView
              participants={participants}
              viewerUid={authUser.uid}
              results={game.results||{}}
              teamNames={teamNames}
              me={me}
              onSaveMatch={handleSaveMatchBet}
              onSaveBets={handleSaveBets}
              odds={odds}
              subTab={resultsSubTab}
              setSubTab={setResultsSubTab}
            />
          )}

          {tab==="rules"&&(
            <div className="section rules-section">
              <h2>📜 ספר חוקים</h2>
              {[
                ["💰 קופה","כל משתתף שם 50 ₪"],["🥇 מקום ראשון","מקבל את כל הקופה"],
                ["🥈 מקום שני","מקבל 50 ₪ ממי שסיים אחרון"],
                ["🔒 נעילת הימורים","בשריקת הפתיחה של כל משחק — אי אפשר לשנות אחרי הנעילה"],
                ["🔓 חשיפת ניחושים","ניחוש משחק נחשף לכולם ברגע שריקת הפתיחה"],
                ["🔐 נעילה וחשיפה","בתים · אלופה · מלך שערים · כמות שערים — ננעלים ונחשפים לכולם בשריקת הפתיחה של המשחק הראשון בטורניר"],
                ["🏠 בתים","2נק׳ לקבוצה נכונה · 5נק׳ לשתיים · הניקוד מחושב בסיום שלב הבתים"],
                ["⚽ שלב בתים — כיוון","1נק׳"],["✅ שלב בתים — מדויק","+3נק׳ בונוס"],
                ["🏆 32 האחרונות / שמינית גמר","כיוון: 2נק׳ · מדויק: +5נק׳"],
                ["🏆 רבע גמר","כיוון: 4נק׳ · מדויק: +8נק׳"],
                ["🏆 חצי גמר / מקום שלישי","כיוון: 5נק׳ · מדויק: +10נק׳"],
                ["🏆 גמר","כיוון: 8נק׳ · מדויק: +15נק׳"],
                ["🥇 אלופה","12 נק׳ · מחושב בסיום הטורניר"],
                ["👟 מלך שערים","12 נק׳ · מחושב בסיום הטורניר"],
                ["⚽ סה״כ שערים","הקרוב ביותר מנצח — מחושב בסיום הטורניר (6–10 נק׳)"],
                ["🤖 תוצאות","מתעדכנות אוטומטית מ-API בזמן אמת"],
              ].map(([t,v])=>(
                <div key={t} className="rule-row"><div className="rule-title">{t}</div><div className="rule-text">{v}</div></div>
              ))}
            </div>
          )}
          {tab==="admin"&&isAdmin&&(
            <AdminPanel participants={participants} game={game} showToast={showToast} onTriggerWinner={()=>setShowWinner(true)}/>
          )}
        </div>
        </div>{/* /main-content */}
      </div>
      <style>{STYLES}</style>
    </div>
    {showWinner&&appLeader&&(
      <WinnerAnnouncement
        winner={appLeader}
        isFinal={tournamentOver}
        onClose={()=>setShowWinner(false)}
      />
    )}
    {showProfileEdit&&authUser&&(
      <ProfileEditModal
        authUser={authUser}
        currentParticipant={me}
        onClose={()=>setShowProfileEdit(false)}
        showToast={showToast}
      />
    )}
  </>
  );
}

const STYLES=`
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#080e1d;--card:#0f1929;--card2:#182337;--border:#1e3050;--green:#00d87f;--gold:#ffce00;--red:#ff4d6d;--text:#e2eaf5;--muted:#5a7ba0;}
  body{background:var(--bg);color:var(--text);font-family:'Heebo',sans-serif;min-height:100vh}
  .app{min-height:100vh;direction:rtl;background:radial-gradient(ellipse at 15% 0%,rgba(0,216,127,.07) 0%,transparent 55%),radial-gradient(ellipse at 85% 100%,rgba(255,206,0,.05) 0%,transparent 55%),var(--bg);}
  .loading-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:1.2rem;padding:2rem;text-align:center}
  .loading-ball{font-size:3rem;animation:sway 1s ease-in-out infinite}
  .loading-screen p{color:var(--muted)}
  @keyframes sway{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(12deg)}}
  .signin-screen{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 20%,rgba(0,216,127,.12) 0%,transparent 55%),radial-gradient(ellipse at 80% 90%,rgba(255,206,0,.07) 0%,transparent 45%),#080e1d;z-index:999}
  .signin-inner{display:flex;flex-direction:column;align-items:center;text-align:center;gap:1.1rem;padding:2.5rem 2rem;width:100%;max-width:400px}
  .signin-ball{font-size:5.5rem;line-height:1;animation:float 3s ease-in-out infinite;filter:drop-shadow(0 0 28px rgba(0,216,127,.45))}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
  .signin-welcome{font-family:'Heebo',sans-serif;font-size:.9rem;font-weight:700;letter-spacing:.25em;color:var(--green);text-transform:uppercase}
  .signin-title{font-family:'Heebo',sans-serif;font-size:4rem;font-weight:900;line-height:1;margin:0;color:var(--text);letter-spacing:-2px}
  .signin-title span{color:var(--green)}
  .signin-year{font-family:'Heebo',sans-serif;font-size:1.6rem;font-weight:900;color:var(--gold);letter-spacing:.1em;margin-top:-.5rem}
  .signin-sub{font-family:'Heebo',sans-serif;color:var(--muted);font-size:1rem;font-weight:600;margin:0}
  .signin-sep{width:60px;height:3px;background:linear-gradient(90deg,transparent,var(--green),transparent);border-radius:2px}
  .signin-btn-google{display:flex;align-items:center;justify-content:center;gap:.8rem;background:#fff;color:#1a1a1a;font-weight:800;font-family:'Heebo',sans-serif;border:none;border-radius:14px;padding:1rem 2rem;font-size:1.05rem;cursor:pointer;transition:transform .15s,box-shadow .15s;width:100%;box-shadow:0 4px 20px rgba(0,0,0,.3)}
  .signin-btn-google:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,0,0,.4)}
  .signin-btn-google:disabled{opacity:.6;cursor:default}
  .signin-note{font-family:'Heebo',sans-serif;color:var(--muted);font-size:.82rem}
  .btn-google{display:flex;align-items:center;gap:.7rem;background:#fff;color:#333;font-weight:700;font-family:'Heebo',sans-serif;border:none;border-radius:12px;padding:.85rem 1.4rem;font-size:1rem;cursor:pointer;transition:transform .15s;width:100%;justify-content:center}
  .btn-google:hover{transform:translateY(-2px)}
  .btn-google:disabled{opacity:.6;cursor:default}
  .btn-green{background:var(--green);color:#060e1a;font-weight:800;font-family:'Heebo',sans-serif;border:none;border-radius:12px;padding:.8rem 1.4rem;font-size:1rem;cursor:pointer;transition:transform .15s;width:100%}
  .btn-green:hover{transform:translateY(-2px)}
  .main-screen{display:flex;flex-direction:column;height:100vh;overflow:hidden}
  .main-header{display:flex;align-items:center;gap:.7rem;padding:.7rem 1rem;background:var(--card);border-bottom:1px solid var(--border);flex-shrink:0}
  .header-user{display:flex;align-items:center;gap:.5rem}
  .header-avatar{width:30px;height:30px;border-radius:50%;object-fit:cover}
  .header-name{font-weight:700;font-size:.9rem;color:var(--green)}
  .header-title{flex:1;text-align:center;display:flex;flex-direction:column;align-items:center;gap:.05rem}
  .header-title>div:first-child{font-weight:900;font-size:1.05rem;letter-spacing:-.3px;line-height:1.1}
  .header-subtitle{font-size:.68rem;color:var(--muted);font-weight:500;line-height:1}
  .back-btn{background:none;border:none;color:var(--muted);font-size:1.3rem;cursor:pointer;padding:.2rem .5rem}
  .btn-signout{background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:.3rem .7rem;font-size:.75rem;cursor:pointer;font-family:'Heebo',sans-serif;white-space:nowrap}
  .btn-signout:hover{color:var(--red);border-color:var(--red)}
  .main-content{display:flex;flex-direction:column;flex:1;overflow:hidden;min-height:0}
  .main-tabs{display:flex;justify-content:center;background:var(--card);border-bottom:1px solid var(--border);padding:0 .5rem;flex-shrink:0;scrollbar-width:none}
  .main-tabs::-webkit-scrollbar{display:none}
  .main-tab{background:none;border:none;color:var(--muted);font-family:'Heebo',sans-serif;cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap;transition:all .2s;display:flex;flex-direction:column;align-items:center;gap:.1rem;padding:.55rem 1.4rem}
  .tab-icon{font-size:1.6rem;line-height:1}
  .tab-label{font-size:.72rem;font-weight:600}
  .tab-score{font-size:1.1rem;font-weight:900;font-family:'Heebo',sans-serif;color:inherit;background:var(--card2);border:1.5px solid var(--border);border-radius:7px;padding:.1rem .4rem;letter-spacing:-.5px}
  .main-tab.active .tab-score{border-color:var(--green);color:var(--green)}
  .tab-ref-img{width:1.8rem;height:1.8rem;object-fit:contain}
  .redcard{display:inline-block;width:9px;height:13px;background:#ff6060;border-radius:2px;flex-shrink:0;vertical-align:middle}
  .rc-badge{display:inline-flex;align-items:center;gap:2px;margin-right:3px}
  .main-tab.active{color:var(--green);border-bottom-color:var(--green)}
  .main-body{flex:1;overflow-y:auto;padding:1rem}
  .section{display:flex;flex-direction:column;gap:1rem;max-width:680px;margin:0 auto}
  /* ── Desktop responsive layout ── */
  @media(min-width:800px){
    .main-content{flex-direction:row} /* RTL: tabs first in DOM = rightmost (sidebar) */
    .main-tabs{flex-direction:column;width:96px;border-bottom:none;border-left:1px solid var(--border);padding:.6rem 0;justify-content:flex-start;gap:.2rem;overflow-y:auto}
    .main-tab{border-bottom:none;padding:.7rem .4rem;border-radius:10px;margin:0 .35rem;white-space:normal;text-align:center}
    .main-tab.active{background:rgba(0,216,127,.1);color:var(--green)}
    .tab-icon{font-size:1.5rem}
    .tab-label{font-size:.68rem}
    .main-body{padding:1.5rem 2rem}
    .section{max-width:900px}
    .lb-header,.lb-row{grid-template-columns:32px minmax(0,1fr) 62px 62px 100px 72px;column-gap:.5rem}
    .lb-h-label{font-size:.72rem}
    .lb-circle{width:54px;height:54px}
    .lb-circle-flag{font-size:2rem}
    .lb-circle-icon{font-size:1.3rem}
    .lb-circle-num{font-size:1rem}
    .lb-boot-chip{font-size:.72rem;padding:.22rem .6rem}
    .lb-avatar,.lb-avatar-ph{width:42px;height:42px}
    .lb-avatar-ph{font-size:1.1rem}
    .lb-name{font-size:.95rem}
    .lb-rank{font-size:1rem}
    .lb-score{font-size:.88rem}
  }
  @media(min-width:1200px){
    .main-tabs{width:110px}
    .main-tab{padding:.8rem .5rem}
    .tab-icon{font-size:1.7rem}
    .tab-label{font-size:.72rem}
    .section{max-width:1060px}
  }
  .section h2{font-size:1.2rem;font-weight:800}
  .section-header{display:flex;flex-direction:column;gap:.5rem}
  .prizes-row{display:flex;flex-wrap:wrap;gap:.5rem}
  .prizes-row span{background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:.25rem .7rem;font-size:.78rem;font-weight:700}
  .section-note{font-size:.82rem;color:var(--muted)}
  .locked-banner{background:rgba(255,77,109,.12);border:1px solid rgba(255,77,109,.3);color:var(--red);border-radius:12px;padding:.7rem 1rem;font-size:.85rem;font-weight:700;text-align:center}
  .group-box{background:var(--card2);border:1px solid var(--border);border-radius:14px;padding:.9rem;margin-bottom:.6rem}
  .group-label{font-weight:800;color:var(--gold);font-size:.85rem;margin-bottom:.5rem}
  .team-grid{display:grid;grid-template-columns:1fr 1fr;gap:.4rem}
  .team-grid.sm{grid-template-columns:repeat(3,1fr)}
  .team-btn{background:var(--card);border:1.5px solid var(--border);color:var(--text);border-radius:9px;padding:.45rem .5rem;font-family:'Heebo',sans-serif;font-size:.8rem;cursor:pointer;transition:all .15s;position:relative;text-align:center}
  .team-btn:hover:not(.locked):not(.readonly){border-color:var(--green)}
  .team-btn.sel{background:rgba(0,216,127,.15);border-color:var(--green);color:var(--green);font-weight:700}
  .team-btn.sm{font-size:.73rem;padding:.32rem .35rem}
  .team-btn.locked,.team-btn.readonly{cursor:default}
  .team-btn.playoff-tbd{opacity:.35;font-style:italic;border-style:dashed}
  .team-btn.correct{background:rgba(0,216,127,.2);border-color:var(--green);color:var(--green)}
  .badge{position:absolute;top:2px;left:4px;font-size:.58rem;color:var(--gold);font-weight:900}
  .hint{font-size:.72rem;color:var(--muted);margin-top:.4rem}
  .hidden-block{background:rgba(90,123,160,.1);border:1px dashed var(--border);border-radius:10px;padding:.6rem;text-align:center;color:var(--muted);font-size:.82rem}
  .match-row{background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:.65rem .9rem;margin-bottom:.45rem}
  .match-row.locked-row{opacity:.75}
  .match-row.correct-row{border-right:3px solid var(--green)}
  .match-row.hidden-row{opacity:.6}
  .match-odds{display:flex;justify-content:center;gap:.5rem;margin-bottom:.4rem;direction:rtl}
  .odds-cell{display:flex;flex-direction:column;align-items:center;background:rgba(255,206,0,.08);border:1px solid rgba(255,206,0,.2);border-radius:8px;padding:.2rem .55rem;min-width:3.2rem}
  .odds-label{font-size:.6rem;color:var(--muted);font-weight:600}
  .odds-val{font-size:.85rem;font-weight:800;color:#f0c040}
  .match-meta{font-size:.85rem;color:var(--muted);margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
  .match-body{display:flex;align-items:center;gap:.5rem}
  .team-name{font-size:.95rem;font-weight:600;flex:1;text-align:right}
  .team-name.away{text-align:left}
  .team-name.winner{color:var(--green)}
  .score-area{display:flex;align-items:center;gap:.35rem}
  .colon{font-weight:800;color:var(--muted)}
  .lock-badge-sm{font-size:.65rem;color:var(--red)}
  .open-badge-sm{font-size:.65rem;color:var(--green)}
  .hidden-score{color:var(--muted);font-size:.8rem;padding:0 .5rem}
  .bet-score{font-weight:800;font-size:.9rem;padding:.1rem .5rem;border-radius:6px;background:var(--card)}
  .bet-score.dir-ok{color:var(--green)}
  .bet-score.exact{color:var(--gold);background:rgba(255,206,0,.1)}
  .stepper{display:flex;align-items:center;gap:.3rem}
  .stepper button{width:26px;height:26px;border-radius:7px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
  .stepper button:hover:not(:disabled){border-color:var(--green);color:var(--green)}
  .stepper button:disabled{opacity:.35;cursor:default}
  .stepper span{width:24px;text-align:center;font-weight:700;font-size:.9rem}
  .pts-hint{font-size:.7rem;color:var(--muted);font-weight:400}
  /* leaderboard grid template: rank | name | goals | champ | boot | score */
  .lb-header,.lb-row{display:grid;grid-template-columns:20px minmax(0,1fr) 38px 38px 68px 46px;align-items:center;column-gap:.35rem}
  .lb-header{padding:.1rem .6rem .35rem}
  .lb-h-label{font-size:.6rem;color:var(--muted);font-weight:600;text-align:center;line-height:1.2}
  /* leaderboard rows */
  .lb-list{display:flex;flex-direction:column;gap:.4rem}
  .lb-row{background:var(--card2);border:1px solid var(--border);border-radius:14px;padding:.5rem .6rem;cursor:pointer;transition:border-color .15s}
  .lb-row:hover{border-color:var(--green)}
  .lb-row.rank-1{border-color:rgba(255,206,0,.5);background:rgba(255,206,0,.05)}
  .lb-row.rank-2{border-color:rgba(200,200,220,.25)}
  .lb-row.rank-3{border-color:rgba(180,110,50,.3)}
  .lb-rank{font-size:.85rem;font-weight:700;text-align:center;color:var(--muted)}
  .lb-name-col{display:flex;align-items:center;gap:.35rem;overflow:hidden;min-width:0}
  .lb-name{font-weight:700;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .lb-avatar{width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1.5px solid rgba(255,255,255,.15)}
  .lb-avatar-ph{width:30px;height:30px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.82rem;color:#fff;background:var(--green)}
  .lb-circle{width:32px;height:32px;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.12)}
  .lb-circle-locked{opacity:.25;filter:grayscale(1)}
  .lb-circle-flag{font-size:1.1rem;line-height:1}
  .lb-circle-icon{font-size:.9rem;line-height:1}
  .lb-circle-num{font-size:.78rem;font-weight:900;color:var(--green)}
  .lb-boot-cell{display:flex;align-items:center;justify-content:center}
  .lb-boot-chip{display:inline-flex;align-items:center;background:var(--card2);border:1px solid var(--border);border-radius:20px;padding:.18rem .45rem;font-size:.62rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;color:var(--text)}
  .lb-score{font-size:.78rem;font-weight:800;color:var(--green);text-align:center}
  .empty-msg{text-align:center;color:var(--muted);padding:2rem;font-size:.9rem}
  .player-bets-view{display:flex;flex-direction:column;gap:.8rem}
  .pbv-profile-card{display:flex;flex-direction:column;align-items:center;gap:.55rem;background:var(--card2);border-radius:16px;padding:1.4rem 1rem 1.1rem;margin-bottom:.8rem}
  .pbv-avatar{width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid var(--green)}
  .pbv-avatar-ph{width:90px;height:90px;border-radius:50%;background:var(--green);color:#060e1a;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:2.3rem;flex-shrink:0}
  .pbv-name{font-size:1.2rem;font-weight:800;text-align:center}
  .pbv-meta{display:flex;align-items:center;gap:.5rem}
  .pbv-rank-badge{font-size:1.3rem}
  .pbv-score-badge{background:rgba(0,216,127,.15);color:var(--green);border-radius:20px;padding:.28rem .85rem;font-weight:800;font-size:.85rem}
  .pbv-special-row{display:flex;gap:.4rem;flex-wrap:wrap;justify-content:center}
  .pbv-special-chip{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:.22rem .7rem;font-size:.78rem;color:var(--muted)}
  .filter-row{display:flex;overflow-x:auto;gap:.4rem;padding:.3rem 0;margin-bottom:.5rem;scrollbar-width:none}
  .filter-row::-webkit-scrollbar{display:none}
  .filter-btn{background:var(--card2);border:1px solid var(--border);color:var(--muted);border-radius:20px;padding:.28rem .65rem;font-family:'Heebo',sans-serif;font-size:.75rem;cursor:pointer;white-space:nowrap;transition:all .15s}
  .filter-sep{color:var(--border);padding:0 .2rem;font-size:.8rem;align-self:center}
  .filter-btn.active{background:rgba(0,216,127,.15);border-color:var(--green);color:var(--green);font-weight:700}
  .sched-row{background:var(--card2);border:1px solid var(--border);border-radius:11px;padding:.55rem .85rem;margin-bottom:.38rem}
  .sched-live{border-color:rgba(255,77,109,.5) !important;background:rgba(255,77,109,.05)}
  .sched-open{border-color:rgba(0,216,127,.2)}
  .live-badge{font-size:.65rem;color:var(--red);font-weight:800;animation:pulse 1s ease-in-out infinite}
  .done-badge{font-size:.65rem;color:var(--green)}
  .redcard{display:inline-block;width:9px;height:13px;background:#ff6060;border-radius:2px;flex-shrink:0;vertical-align:middle}
  .rc-badge{display:inline-flex;align-items:center;gap:2px;margin:0 3px}

  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  .sched-score-live{background:rgba(255,77,109,.15);color:var(--red) !important}
  .sched-winning{color:var(--gold) !important}
  .sched-date{font-size:.82rem;color:var(--muted);margin-bottom:.28rem}
  .sched-teams{display:flex;align-items:center;gap:.5rem;font-size:1rem;font-weight:600}
  .sched-teams>span:first-child{flex:1;text-align:right;padding-right:.6rem}
  .sched-teams>span:last-child{flex:1;text-align:left;padding-left:.6rem}
  .sched-vs{background:var(--card);border-radius:6px;padding:.12rem .45rem;font-size:.7rem;color:var(--muted)}
  .sched-score{background:rgba(0,216,127,.15);color:var(--green);border-radius:7px;padding:.12rem .65rem;font-weight:800;font-size:.88rem}
  .sched-winner{color:var(--green)}
  .special-area{display:flex;flex-direction:column;gap:.9rem}
  .special-row{display:flex;flex-direction:column;gap:.38rem}
  .special-row label{font-weight:700;font-size:.88rem}
  .special-row select,.special-row input{background:var(--card2);border:1px solid var(--border);color:var(--text);border-radius:10px;padding:.62rem 1rem;font-family:'Heebo',sans-serif;font-size:.92rem;outline:none;width:100%}
  .special-row select:focus,.special-row input:focus{border-color:var(--green)}
  .special-row select:disabled,.special-row input:disabled{opacity:.45}
  .special-val{background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:.62rem 1rem;font-size:.92rem;font-weight:700;color:var(--green)}
  .hidden-val{color:var(--muted) !important;font-style:italic;font-weight:400}
  .playoff-editor{display:flex;flex-direction:column;gap:.8rem}
  .sub-tabs{display:flex;gap:.3rem;background:var(--card2);border-radius:10px;padding:.22rem;margin-bottom:.2rem}
  .sub-tab{flex:1;background:transparent;border:none;color:var(--muted);font-family:'Heebo',sans-serif;font-size:.76rem;border-radius:8px;padding:.42rem;cursor:pointer;transition:all .2s;white-space:nowrap}
  .sub-tab.active{background:var(--card);color:var(--text);font-weight:700}
  .scroll-area{display:flex;flex-direction:column}
  .rules-section{gap:.45rem}
  .rule-row{background:var(--card2);border-radius:12px;padding:.7rem 1rem;border-right:3px solid var(--green);margin-bottom:.1rem}
  .rule-title{font-weight:800;font-size:.87rem;margin-bottom:.18rem}
  .rule-text{color:var(--muted);font-size:.8rem}
  .btn-save-match{background:var(--card);border:1.5px solid var(--border);color:var(--muted);border-radius:8px;padding:.3rem .6rem;font-size:.85rem;cursor:pointer;transition:all .2s;margin-right:.3rem;min-width:36px;font-family:'Heebo',sans-serif;flex-shrink:0}
  .btn-save-match.dirty{border-color:var(--green);color:var(--green);background:rgba(0,216,127,.1)}
  .btn-save-match.done{border-color:var(--green);color:var(--green);background:rgba(0,216,127,.2)}
  .btn-save-match:disabled{opacity:.3;cursor:default}
  .saved-row{border-color:rgba(0,216,127,.4) !important}
  .sync-badge{font-size:.72rem;color:var(--green);background:rgba(0,216,127,.1);border:1px solid rgba(0,216,127,.3);border-radius:20px;padding:.2rem .7rem}

  .revealed-summary{display:flex;flex-wrap:wrap;gap:.5rem}
  .revealed-item{background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:.5rem .8rem;display:flex;flex-direction:column;gap:.2rem;flex:1;min-width:120px}
  .rev-label{font-size:.72rem;color:var(--muted)}
  .rev-count{font-weight:800;font-size:.95rem;direction:ltr;unicode-bidi:embed}
  .rev-count.green{color:var(--green)}
  .nothing-revealed{text-align:center;padding:2rem;color:var(--muted);display:flex;flex-direction:column;gap:.5rem;align-items:center}
  .revealed-match-block{background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:.7rem .9rem;margin-bottom:.5rem}
  .rev-match-header{display:flex;align-items:center;justify-content:space-between;font-weight:700;font-size:.85rem;margin-bottom:.6rem}
  .rev-bets-row{display:flex;flex-wrap:wrap;gap:.4rem}
  .rev-bets-row.wrap{flex-wrap:wrap}
  .rev-bet-chip{display:flex;align-items:center;gap:.3rem;background:var(--card);border:1.5px solid var(--border);border-radius:20px;padding:.25rem .7rem;font-size:.75rem}
  .rev-bet-chip.correct{border-color:var(--green);background:rgba(0,216,127,.1)}
  .rev-bet-chip.exact{border-color:var(--gold);background:rgba(255,206,0,.1)}
  .rev-bet-chip.wrong{opacity:.5}
  .chip-name{font-weight:700;color:var(--text)}
  .chip-score{color:var(--muted)}
  .chip-pts{font-size:.75rem;font-weight:800;color:var(--accent);opacity:.9}
  .btn-back-sm{background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:.3rem .8rem;font-size:.85rem;font-family:'Heebo',sans-serif;cursor:pointer;margin-bottom:.5rem}
  .btn-back-sm:hover{color:var(--text);border-color:var(--text)}
  .toast{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:var(--green);color:#060e1a;font-weight:800;border-radius:100px;padding:.65rem 1.6rem;font-size:.92rem;z-index:999;box-shadow:0 8px 30px rgba(0,216,127,.4);animation:fadeUp .3s ease}
  @keyframes fadeUp{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
  .date-nav{display:flex;align-items:center;justify-content:space-between;background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:.5rem .8rem;margin-bottom:.5rem}
  .date-nav-arrow{background:var(--card);border:1px solid var(--border);color:var(--text);border-radius:8px;width:2rem;height:2rem;font-size:1.3rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;font-family:sans-serif}
  .date-nav-arrow:disabled{opacity:.3;cursor:default}
  .date-nav-arrow:not(:disabled):hover{border-color:var(--green)}
  .date-nav-center{display:flex;flex-direction:column;align-items:center;gap:.15rem}
  .date-nav-label{font-size:1rem;font-weight:700}
  .date-today-pill{font-size:.6rem;background:var(--green);color:#000;border-radius:10px;padding:.1rem .45rem;font-weight:800}
  /* ── Home card ── */
  .home-card{background:var(--card2);border:1px solid var(--border);border-radius:16px;padding:1rem 1rem .8rem;margin-bottom:.7rem}
  .home-card-title{font-weight:800;font-size:.95rem;margin-bottom:.7rem;color:var(--text)}
  .home-bets-grid{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}
  .home-bet-item{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:.55rem .75rem;display:flex;flex-direction:column;gap:.25rem}
  .home-bet-label{font-size:.68rem;color:var(--muted)}
  .home-bet-val{font-weight:800;font-size:.88rem;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .home-special-form{display:flex;flex-direction:column;gap:.75rem}
  .home-groups-indicator{display:flex;justify-content:space-between;align-items:center;background:var(--card);border:1px dashed var(--border);border-radius:10px;padding:.55rem .75rem;font-size:.82rem}
  .val-green{color:var(--green);font-weight:700}
  .val-muted{color:var(--muted)}
  /* ── Live bar ── */
  .live-now-bar{background:rgba(255,77,109,.1);border:1px solid rgba(255,77,109,.35);border-radius:10px;padding:.5rem .85rem;display:flex;flex-wrap:wrap;gap:.55rem;margin-bottom:.55rem}
  .live-now-item{font-size:.8rem;color:var(--red);font-weight:700;display:flex;align-items:center;gap:.25rem}
  .live-min{color:var(--muted);font-weight:400}
  /* ── Results tab ── */
  .rev-bet-chip.locked-chip{opacity:.35}
  .results-match-block{margin-bottom:.85rem}
  /* ── Ranking breakdown ── */
  .lb-expand{color:var(--muted);font-size:.72rem;min-width:1.2rem;text-align:center}
  .ranking-breakdown{background:var(--card);border:1px solid var(--border);border-top:none;border-radius:0 0 12px 12px;padding:.65rem .9rem;display:flex;flex-direction:column;gap:.45rem;margin-bottom:.45rem}
  .breakdown-row{display:flex;align-items:center;gap:.5rem;font-size:.78rem;flex-wrap:wrap}
  .bd-match{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)}
  .bd-detail{display:flex;align-items:center;gap:.28rem;flex-shrink:0}
  .bd-bet{color:var(--muted)}
  .bd-sep{color:var(--border);font-size:.7rem}
  .bd-real{font-weight:700;color:var(--text)}
  .bd-real.live{color:var(--red)}
  .bd-pts{font-weight:800;color:var(--green);font-size:.8rem;min-width:2.5rem;text-align:left;flex-shrink:0}
  .bd-pts.exact{color:var(--gold)}
  .bd-empty{color:var(--muted);font-size:.8rem;text-align:center;padding:.4rem 0}
  .bd-all-link{color:var(--green);font-size:.78rem;cursor:pointer;text-align:center;padding:.35rem 0 0;border-top:1px solid var(--border);margin-top:.15rem}
  .bd-all-link:hover{text-decoration:underline}
  .admin-panel{display:flex;flex-direction:column;gap:1.2rem}
  .admin-stats{display:flex;gap:.8rem;flex-wrap:wrap}
  .admin-presence{background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:.7rem 1rem;display:flex;flex-direction:column;gap:.45rem}
  .admin-presence-title{font-size:.78rem;font-weight:700;color:var(--muted);margin-bottom:.1rem}
  .admin-presence-row{display:flex;align-items:center;gap:.6rem}
  .ap-avatar{width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0}
  .ap-avatar-ph{width:30px;height:30px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.82rem;color:#fff;background:var(--green)}
  .ap-name{flex:1;font-size:.85rem;font-weight:600}
  .ap-time{font-size:.75rem;color:var(--muted);flex-shrink:0}
  .ap-btn-edit{background:none;border:none;cursor:pointer;font-size:.85rem;opacity:.5;padding:0 .2rem;flex-shrink:0}
  .ap-btn-edit:hover{opacity:1}
  .ap-date-input{background:var(--card);border:1px solid var(--border);color:var(--text);border-radius:7px;padding:.25rem .4rem;font-size:.75rem;font-family:'Heebo',sans-serif;flex:1;min-width:0}
  .ap-btn-save{background:var(--green);border:none;color:#060e1a;border-radius:6px;padding:.25rem .55rem;font-weight:800;cursor:pointer;font-size:.8rem;flex-shrink:0}
  .ap-btn-cancel{background:var(--card2);border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:.25rem .5rem;font-weight:700;cursor:pointer;font-size:.8rem;flex-shrink:0}
  .admin-stat{background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:.6rem 1rem;display:flex;flex-direction:column;align-items:center;gap:.1rem;min-width:80px}
  .admin-stat-val{font-size:1.4rem;font-weight:800;color:var(--green)}
  .admin-stat span:last-child{font-size:.72rem;color:var(--muted)}
  .admin-winner-section{background:var(--card2);border:1px solid rgba(0,216,127,.3);border-radius:12px;padding:.85rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem}
  .btn-admin-winner{background:linear-gradient(135deg,#00d87f,#00b86a);color:#060e1a;border:none;border-radius:8px;padding:.4rem 1.1rem;font-size:.85rem;font-weight:800;cursor:pointer;font-family:'Heebo',sans-serif;white-space:nowrap;flex-shrink:0}
  .btn-admin-winner:hover{opacity:.88}
  .admin-actions{display:flex;flex-direction:column;gap:.6rem}
  .admin-action-row{background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:.85rem 1rem;display:flex;align-items:center;justify-content:space-between;gap:1rem}
  .admin-action-danger{border-color:rgba(255,77,109,.3)}
  .admin-action-info{display:flex;flex-direction:column;gap:.2rem;flex:1}
  .admin-action-label{font-size:.9rem;font-weight:700}
  .admin-action-desc{font-size:.75rem;color:var(--muted)}
  .btn-admin-act{background:var(--card);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:.4rem .9rem;font-size:.8rem;font-weight:700;cursor:pointer;font-family:'Heebo',sans-serif;white-space:nowrap;flex-shrink:0}
  .btn-admin-act:hover{border-color:var(--green);color:var(--green)}
  .btn-admin-red{border-color:rgba(255,77,109,.4);color:var(--red)}
  .btn-admin-red:hover{background:rgba(255,77,109,.1);border-color:var(--red)}
  .admin-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:200;display:flex;align-items:center;justify-content:center;padding:1rem}
  .admin-confirm{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:1.5rem;width:100%;max-width:360px;display:flex;flex-direction:column;gap:.8rem;text-align:center}
  .admin-confirm-title{font-size:1rem;font-weight:800;color:var(--gold)}
  .admin-confirm-action{font-size:1.05rem;font-weight:700}
  .admin-confirm-desc{font-size:.8rem;color:var(--muted)}
  .admin-confirm-warn{font-size:.82rem;color:var(--red);font-weight:600}
  .admin-confirm-btns{display:flex;gap:.7rem;justify-content:center;margin-top:.3rem}
  .btn-cancel-admin{background:var(--card2);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:.5rem 1.2rem;font-size:.85rem;font-weight:600;cursor:pointer;font-family:'Heebo',sans-serif}
  .btn-confirm-admin{background:var(--red);border:none;color:#fff;border-radius:8px;padding:.5rem 1.4rem;font-size:.85rem;font-weight:700;cursor:pointer;font-family:'Heebo',sans-serif}
  .btn-confirm-admin:disabled,.btn-cancel-admin:disabled{opacity:.5;cursor:not-allowed}
  .profile-modal{align-items:center;min-width:260px}
  .profile-avatar-wrap{display:flex;flex-direction:column;align-items:center;gap:.5rem}
  .profile-avatar-lg{width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid var(--green)}
  .profile-avatar-placeholder{width:80px;height:80px;border-radius:50%;background:var(--border);display:flex;align-items:center;justify-content:center;font-size:2rem}
  .btn-upload{background:var(--card2);border:1px solid var(--border);border-radius:.4rem;padding:.3rem .8rem;cursor:pointer;font-size:.85rem;color:var(--text);font-family:'Heebo',sans-serif}
  .profile-label{font-size:.85rem;color:var(--muted);align-self:flex-start;width:100%}
  .profile-input{width:100%;padding:.5rem .7rem;border-radius:.4rem;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:1rem;box-sizing:border-box;text-align:right;font-family:'Heebo',sans-serif}
  .header-user:hover .header-name{color:var(--text)}
  /* ── Combined Group Cards ── */
  .cg-grid{display:grid;grid-template-columns:1fr 1fr;gap:.55rem;padding:.3rem 0}
  @media(max-width:500px){.cg-grid{grid-template-columns:1fr}}
  @media(min-width:800px){.cg-grid{grid-template-columns:1fr;gap:.8rem}}
  .cg-card{background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden;display:flex;flex-direction:column}
  .cg-card-hdr{background:rgba(0,216,127,.1);color:var(--green);font-weight:800;font-size:.82rem;padding:.35rem .6rem;text-align:center;border-bottom:1px solid var(--border)}
  .cg-bet-section{border-top:1px solid var(--border);padding:.45rem .5rem}
  .cg-picker{display:grid;grid-template-columns:1fr 1fr;gap:.3rem}
  .cg-team-btn{background:var(--card2);border:1.5px solid var(--border);color:var(--text);border-radius:8px;padding:.28rem .35rem;font-size:.72rem;cursor:pointer;font-family:'Heebo',sans-serif;text-align:center;display:flex;align-items:center;justify-content:center;gap:.2rem;transition:all .18s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .cg-team-btn.cg-sel{border-color:var(--green);background:rgba(0,216,127,.12);font-weight:700}
  .cg-team-btn.cg-dim{opacity:.35;cursor:default}
  .cg-badge{background:var(--green);color:#060e1a;font-size:.6rem;font-weight:800;border-radius:50%;width:14px;height:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .cg-hint{grid-column:1/-1;font-size:.68rem;color:var(--muted);text-align:center;padding:.15rem 0}
  .cg-qualifiers{font-size:.73rem;color:var(--green);font-weight:700;margin-bottom:.35rem}
  /* ── Group Standings (standalone, kept for reference) ── */
  .st-grid{display:grid;grid-template-columns:1fr 1fr;gap:.55rem;padding:.3rem 0}
  @media(max-width:480px){.st-grid{grid-template-columns:1fr}}
  @media(min-width:800px){.st-grid{grid-template-columns:1fr;gap:.8rem}}
  .st-group{background:var(--card);border:1px solid var(--border);border-radius:10px;overflow:hidden}
  .st-group-hdr{background:rgba(0,216,127,.1);color:var(--green);font-weight:800;font-size:.82rem;padding:.35rem .6rem;text-align:center;border-bottom:1px solid var(--border)}
  .st-table{width:100%;border-collapse:collapse;font-size:.73rem}
  .st-table th{color:var(--muted);font-weight:600;padding:.2rem .22rem;text-align:center;border-bottom:1px solid var(--border)}
  .st-table td{padding:.2rem .22rem;text-align:center;border-bottom:1px solid rgba(255,255,255,.03)}
  .st-tc{text-align:right!important;min-width:68px;padding-right:.35rem!important}
  .st-num{color:var(--muted);font-size:.66rem;width:12px}
  .st-ptc{font-weight:700}
  .st-ptv{font-weight:800;color:var(--green)}
  .st-gd-pos{color:var(--green)}
  .st-gd-neg{color:var(--red)}
  .st-q{background:rgba(0,216,127,.06)}
  .st-q .st-num::after{content:"↑";font-size:.58rem;color:var(--green)}
  @media(min-width:800px){
    .cg-card-hdr,.st-group-hdr{font-size:1rem;padding:.5rem .9rem}
    .st-table{font-size:.92rem}
    .st-table th{padding:.3rem .4rem}
    .st-table td{padding:.28rem .4rem}
    .st-tc{min-width:120px}
    .st-num{font-size:.8rem;width:18px}
    .cg-team-btn{font-size:.88rem;padding:.38rem .55rem}
  }
  /* ── Knockout Bracket ── */
  .bk-outer{overflow:hidden;margin:0 -.5rem}
  .bk-scroll{display:flex;align-items:stretch;overflow-x:auto;gap:3px;padding:.6rem .5rem;min-height:300px}
  .bk-col{display:flex;flex-direction:column;flex-shrink:0;width:112px}
  .bk-col-lbl{font-size:.62rem;color:var(--muted);font-weight:600;text-align:center;margin-bottom:.2rem;height:15px;white-space:nowrap}
  .bk-col-body{display:flex;flex-direction:column;flex:1}
  .bk-slot{display:flex;align-items:center;flex:1;padding:.1rem 0}
  .bk-final-col{display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;width:125px;padding:.2rem .25rem}
  .bk-trophy{font-size:2.4rem;margin-bottom:.2rem;line-height:1}
  .bk-match{background:var(--card);border:1px solid var(--border);border-radius:7px;overflow:hidden;width:100%}
  .bk-match.bk-live{border-color:var(--red)}
  .bk-tm{display:flex;align-items:center;justify-content:space-between;padding:.17rem .32rem;gap:.2rem;font-size:.71rem}
  .bk-tm.bk-won{background:rgba(0,216,127,.12);font-weight:700}
  .bk-tm.bk-lost{opacity:.42}
  .bk-tn{flex:1;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:rtl}
  .bk-sc{font-weight:800;color:var(--green);flex-shrink:0;min-width:11px;text-align:center;font-size:.75rem}
  .bk-div{height:1px;background:var(--border)}
  .bk-ph{border:1px dashed var(--border);border-radius:7px;text-align:center;padding:.28rem;font-size:.72rem;width:100%;box-sizing:border-box;color:var(--muted);background:rgba(255,255,255,.02)}
  .bk-ph-final{width:120px}
  /* ── Special Bets Card ── */
  .sp-section{display:flex;flex-direction:column;gap:.3rem;padding:.55rem 0;border-bottom:1px solid var(--border)}
  .sp-section:last-child{border-bottom:none;padding-bottom:0}
  .sp-section:first-child{padding-top:0}
  .sp-label{font-size:.82rem;font-weight:700;display:flex;align-items:center;gap:.45rem;flex-wrap:wrap}
  .sp-live-val{background:rgba(0,216,127,.12);color:var(--green);font-size:.8rem;border-radius:6px;padding:.1rem .4rem;font-weight:800}
  .sp-pending{color:var(--muted);font-size:.75rem;font-weight:400}
  .sp-chips{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.2rem}
  .sp-chip{display:flex;align-items:center;gap:.28rem;background:var(--card2);border:1px solid var(--border);border-radius:20px;padding:.2rem .55rem;font-size:.74rem}
  .sp-chip.sp-correct{border-color:var(--green);background:rgba(0,216,127,.12);font-weight:700}
  .sp-chip.sp-wrong{opacity:.45}
  .sp-chip-name{color:var(--muted);font-size:.68rem}
  .sp-chip-val{font-weight:600}
  .sp-pts{color:var(--green);font-weight:800;font-size:.68rem}
  .sp-diff{color:var(--muted);font-size:.68rem}
  .sp-diff.sp-exact{color:var(--green)}
  /* ── Winner Announcement ── */
  @keyframes wa-fall{0%{transform:translateY(-120px) rotate(0deg);opacity:1}80%{opacity:.9}100%{transform:translateY(105vh) rotate(600deg);opacity:0}}
  @keyframes wa-card-in{0%{transform:scale(0.2) translateY(60px);opacity:0}65%{transform:scale(1.06) translateY(-6px);opacity:1}85%{transform:scale(.97) translateY(2px)}100%{transform:scale(1) translateY(0);opacity:1}}
  @keyframes wa-trophy{0%,100%{transform:scale(1) rotate(-8deg)}50%{transform:scale(1.2) rotate(8deg)}}
  @keyframes wa-name-glow{0%,100%{text-shadow:0 0 0 transparent}50%{text-shadow:0 0 18px rgba(255,215,0,.7)}}
  @keyframes wa-score-pop{0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1)}}
  @keyframes wa-overlay-in{from{opacity:0}to{opacity:1}}
  .wa-overlay{position:fixed;inset:0;background:rgba(6,14,26,.88);z-index:1000;display:flex;align-items:center;justify-content:center;animation:wa-overlay-in .35s ease;backdrop-filter:blur(4px);padding:1rem}
  .wa-confetti{position:absolute;inset:0;overflow:hidden;pointer-events:none}
  .wa-piece{position:absolute;top:-20px;border-radius:2px;animation:wa-fall linear infinite}
  .wa-card{background:linear-gradient(145deg,#0d1e35,#132540);border:2px solid #FFD700;border-radius:20px;padding:2rem 2.2rem;text-align:center;display:flex;flex-direction:column;align-items:center;gap:.7rem;max-width:320px;width:100%;animation:wa-card-in .7s cubic-bezier(.34,1.56,.64,1) forwards;box-shadow:0 0 60px rgba(255,215,0,.25),0 20px 60px rgba(0,0,0,.6);position:relative;z-index:1}
  .wa-trophy{font-size:4rem;line-height:1;animation:wa-trophy 1.8s ease-in-out infinite}
  .wa-title{font-size:1.1rem;font-weight:800;color:#FFD700;letter-spacing:.03em}
  .wa-avatar{width:80px;height:80px;border-radius:50%;border:3px solid #FFD700;object-fit:cover;box-shadow:0 0 20px rgba(255,215,0,.4)}
  .wa-avatar-placeholder{width:80px;height:80px;border-radius:50%;border:3px solid #FFD700;background:rgba(255,215,0,.15);display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;color:#FFD700}
  .wa-name{font-size:1.6rem;font-weight:900;color:#fff;animation:wa-name-glow 2s ease-in-out infinite}
  .wa-score{font-size:2.2rem;font-weight:900;color:#FFD700;animation:wa-score-pop 1.5s ease-in-out infinite}
  .wa-pts-label{font-size:1rem;font-weight:600;opacity:.8}
  .wa-subtitle{font-size:.78rem;color:var(--muted);margin-top:-.3rem}
  .wa-close{margin-top:.4rem;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:10px;padding:.5rem 1.6rem;font-family:'Heebo',sans-serif;font-size:.9rem;cursor:pointer;transition:background .2s}
  .wa-close:hover{background:rgba(255,255,255,.2)}
  .wa-trigger-btn{background:rgba(255,215,0,.12);border:1.5px solid rgba(255,215,0,.4);color:#FFD700;border-radius:8px;padding:.25rem .7rem;font-family:'Heebo',sans-serif;font-size:.75rem;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap}
  .wa-trigger-btn:hover{background:rgba(255,215,0,.22)}
  .wa-trigger-btn.wa-trigger-final{background:rgba(255,215,0,.2);border-color:#FFD700;animation:wa-score-pop 1.5s ease-in-out infinite}
`;

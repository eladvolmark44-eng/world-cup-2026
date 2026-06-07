import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

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
  // ארגנטינה
  "ליאונל מסי","חוליאן אלבארז","לאוטרו מרטינס",
  // צרפת
  "קיליאן מבאפה","אוליביה ז'ירו","מרכוס תוראם",
  // אנגליה
  "הארי קיין","בוקאיו סאקה","פיל פודן","ג'ודה בלינגהאם",
  // פורטוגל
  "קריסטיאנו רונאלדו","ברונו פרננדש","ז'ואאו פליקס","גונסאלו ראמוש",
  // ברזיל
  "וינישיוס ג'וניור","רודריגו","ראפיניה","אנדריק",
  // ספרד
  "לאמין יאמל","ניקו וויליאמס","אלוורו מוראטה","פדרי",
  // גרמניה
  "פלוריאן וירץ","ג'מאל מוסיאלה","קאי האברץ","תומאס מולר",
  // הולנד
  "קודי גאקפו","ממפיס דיפאי","דאהווי קלאסן",
  // בלגיה
  "רומלו לוקאקו","לואיס אופנדה",
  // נורווגיה
  "ארלינג הולאנד",
  // אורוגוואי
  "דרווין נונייס","לואיס סוארס","פדרו דה לה וגה",
  // מקסיקו
  "חיאן לוזאנו","הנרי מרטין","סנטיאגו חימנז",
  // ארה"ב
  "כריסטיאן פוליסיץ","פולקר הרוש","ריקי פוסה",
  // קנדה
  "אלפונסו דאוויס","תאדאוס סאלאה",
  // סנגל
  "סאדיו מאנה","ישחק קויאטה",
  // מרוקו
  "עיאש ח'מכוני","ופאד אח'יארד","יוסף אנסאפלה",
  // קוריאה
  "סון הון-מין",
  // יפן
  "דאיצ'י מיינו","ריוואטה אוסאקו",
  // אקוודור
  "אנר ואלנציה","גונסאלו פלאסיו",
  // פולאנד / צ'כיה
  "אדם הלוסה",
].sort((a,b)=>a.localeCompare(b,"he"));

const GROUP_MATCHES = [
  // --- June 6 (יזיזות — dry run) ---
  {id:"T0",group:"יזיזות",home:"בלגיה",away:"תוניסיה",date:"06/06",kickoff:"2026-06-06T16:00:00+03:00"},
  {id:"T4",group:"יזיזות",home:"ארמניה",away:"קזחסטן",date:"06/06",kickoff:"2026-06-06T19:00:00+03:00"},
  {id:"T12",group:"יזיזות",home:"קומורו",away:"רואנדה",date:"06/06",kickoff:"2026-06-06T19:00:00+03:00"},
  {id:"T10",group:"יזיזות",home:"גיברלטר",away:"קיימן",date:"06/06",kickoff:"2026-06-06T20:00:00+03:00"},
  {id:"T5",group:"יזיזות",home:"וויילס",away:"רומניה",date:"06/06",kickoff:"2026-06-06T20:45:00+03:00"},
  {id:"T1",group:"יזיזות",home:"פורטוגל",away:"צ'ילה",date:"06/06",kickoff:"2026-06-06T20:45:00+03:00"},
  {id:"T11",group:"יזיזות",home:"אלבניה",away:"לוקסמבורג",date:"06/06",kickoff:"2026-06-06T21:00:00+03:00"},
  {id:"T2",group:"יזיזות",home:'ארה"ב',away:"גרמניה",date:"06/06",kickoff:"2026-06-06T21:30:00+03:00"},
  {id:"T7",group:"יזיזות",home:"שוויץ",away:"אוסטרליה",date:"06/06",kickoff:"2026-06-06T22:00:00+03:00"},
  {id:"T13",group:"יזיזות",home:"פנמה",away:"בוסניה והרצגובינה",date:"06/06",kickoff:"2026-06-06T22:00:00+03:00"},
  {id:"T3",group:"יזיזות",home:"אנגליה",away:"ניו זילנד",date:"06/06",kickoff:"2026-06-06T23:00:00+03:00"},
  {id:"T8",group:"יזיזות",home:"בוליביה",away:"סקוטלנד",date:"06/06",kickoff:"2026-06-06T23:00:00+03:00"},
  {id:"T14",group:"יזיזות",home:"קטאר",away:"אל סלבדור",date:"06/06",kickoff:"2026-06-06T23:00:00+03:00"},
  {id:"T15",group:"יזיזות",home:"ג'מייקה",away:"דרום אפריקה",date:"07/06",kickoff:"2026-06-07T00:00:00+03:00"},
  {id:"T9",group:"יזיזות",home:"ברזיל",away:"מצרים",date:"07/06",kickoff:"2026-06-07T01:00:00+03:00"},
  {id:"T16",group:"יזיזות",home:"ונצואלה",away:"טורקיה",date:"07/06",kickoff:"2026-06-07T01:00:00+03:00"},
  {id:"T17",group:"יזיזות",home:"ארגנטינה",away:"הונדורס",date:"07/06",kickoff:"2026-06-07T03:00:00+03:00"},
  {id:"T18",group:"יזיזות",home:"קוראסאו",away:"ארובה",date:"07/06",kickoff:"2026-06-07T03:00:00+03:00"},
  {id:"T27",group:"יזיזות",home:"אפגניסטן",away:"פקיסטן",date:"07/06",kickoff:"2026-06-07T14:00:00+03:00"},
  {id:"T19",group:"יזיזות",home:"קניה",away:"לסוטו",date:"07/06",kickoff:"2026-06-07T16:00:00+03:00"},
  {id:"T25",group:"יזיזות",home:"ליכטנשטיין",away:"קפריסין",date:"07/06",kickoff:"2026-06-07T16:00:00+03:00"},
  {id:"T28",group:"יזיזות",home:"עומאן",away:"מוזמביק",date:"07/06",kickoff:"2026-06-07T16:00:00+03:00"},
  {id:"T20",group:"יזיזות",home:"דנמרק",away:"אוקראינה",date:"07/06",kickoff:"2026-06-07T19:30:00+03:00"},
  {id:"T29",group:"יזיזות",home:"מלדיביים",away:"בנגלדש",date:"07/06",kickoff:"2026-06-07T19:00:00+03:00"},
  {id:"T26",group:"יזיזות",home:"קוסובו",away:"אנדורה",date:"07/06",kickoff:"2026-06-07T20:00:00+03:00"},
  {id:"T21",group:"יזיזות",home:"קרואטיה",away:"סלובניה",date:"07/06",kickoff:"2026-06-07T21:45:00+03:00"},
  {id:"T22",group:"יזיזות",home:"מרוקו",away:"נורווגיה",date:"07/06",kickoff:"2026-06-07T22:00:00+03:00"},
  {id:"T23",group:"יזיזות",home:"יוון",away:"איטליה",date:"07/06",kickoff:"2026-06-07T22:00:00+03:00"},
  {id:"T24",group:"יזיזות",home:"אקוודור",away:"גואטמלה",date:"07/06",kickoff:"2026-06-07T23:00:00+03:00"},
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
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
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
const ODDS_TTL_NORMAL = 2 * 60 * 60 * 1000;  // 2h when no match soon
const ODDS_TTL_SOON   = 5 * 60 * 1000;        // 5min when match within 1h
function hasMatchWithinHour(){
  const n=Date.now();
  return GROUP_MATCHES.some(m=>{if(!m.kickoff)return false;const t=new Date(m.kickoff).getTime();return t>n&&t-n<=60*60*1000;});
}
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
};
function oddsHeb(n){ return ODDS_TEAM_MAP[n]||n; }
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

function isMatchLocked(kickoff) { return now() >= new Date(kickoff).getTime() - LOCK_MS; }
function isGlobalLocked() { return isMatchLocked("2026-06-11T22:00:00+03:00"); }
function isGroupRevealed(group) { return now() >= new Date(GROUP_LAST_MATCH[group]).getTime(); }
function isGroupStageOver() { return now() >= GROUP_STAGE_END_TS; }
function isTournamentOver() { return now() >= new Date(TOURNAMENT_END).getTime(); }
function canSeeMatchBet(matchId, viewerUid, ownerUid) {
  if (viewerUid === ownerUid) return true;
  const match = GROUP_MATCHES.find(m => m.id === matchId);
  return match ? isMatchLocked(match.kickoff) : false;
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

function MatchBetRow({match, savedBet, onSave, teamNames, odds}){
  const locked = isMatchLocked(match.kickoff);
  const matchOdds = odds?.[`${match.home}_${match.away}`];
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
  return(
    <div className="player-bets-view">
      <div className="player-header">
        {player.photoURL&&<img src={player.photoURL} className="player-avatar" alt=""/>}
        <span className="player-hname">{player.name}</span>
        <span className="player-score-badge">{calcScore(bets,results,[])} נק׳</span>
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
            const visible=canSeeMatchBet(m.id,viewerUid,player.uid);
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
                      ?<span dir="ltr" className={`bet-score ${exact?"exact":correct?"dir-ok":""}`}>{bet.away}:{bet.home}{exact?" 🎯":correct?" ✓":""}</span>
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
              <div className={`special-val ${!can?"hidden-val":""}`}>{can?(bets[key]||"—"):"🔒 יחשף בשריקת הפתיחה של המשחק הראשון"}</div>
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
              {STRIKERS.map(s=><option key={s} value={s}>{s}</option>)}
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
  const locked = m.kickoff ? isMatchLocked(m.kickoff) : true;
  const homeName = teamNames?.[m.home]||m.home||"?";
  const awayName = teamNames?.[m.away]||m.away||"?";
  const matchOdds = !hasRes && odds ? odds[`${m.home}_${m.away}`] : null;
  return(
    <div className={`sched-row ${isLive?"sched-live":""} ${!locked&&!hasRes&&m.kickoff?"sched-open":""}`}>
      <div className="sched-date">
        {m.date&&`${m.date}${m.kickoff?` ${formatKickoffTime(m.kickoff)}`:""} · `}{m.group?groupLabel(m.group):m.stage||""}
        {isLive&&<span className="live-badge"> 🔴 {res?.minute ? `${res.minute}'` : 'חי'}</span>}
        {isDone&&<span className="done-badge"> ✓ סיים</span>}
        {!locked&&!hasRes&&m.kickoff&&<span className="open-badge-sm"> ✏️ פתוח להימור</span>}
      </div>
      <div className="sched-teams">
        <span className={isDone&&+res.home>+res.away?"sched-winner":isLive&&+res.home>+res.away?"sched-winning":""}>{withFlag(homeName)}</span>
        {hasRes?<span dir="ltr" className={`sched-score ${isLive?"sched-score-live":""}`}>{res.away} – {res.home}</span>:<span className="sched-vs">vs</span>}
        <span className={isDone&&+res.away>+res.home?"sched-winner":isLive&&+res.away>+res.home?"sched-winning":""}>{withFlag(awayName)}</span>
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
  const idx=ALL_MATCH_DATES.indexOf(selectedDate);
  const [dd,mm]=(selectedDate||"").split("/");
  const MONTHS=["","ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  const label=dd&&mm?`${parseInt(dd)} ${MONTHS[parseInt(mm)]}`:selectedDate;
  const _td=new Date();
  const todayStr=`${String(_td.getDate()).padStart(2,'0')}/${String(_td.getMonth()+1).padStart(2,'0')}`;
  const isToday=selectedDate===todayStr;
  return(
    <div className="date-nav">
      <button className="date-nav-arrow" disabled={idx<=0} onClick={()=>idx>0&&onChange(ALL_MATCH_DATES[idx-1])}>‹</button>
      <div className="date-nav-center">
        <span className="date-nav-label">{label}</span>
        {isToday&&<span className="date-today-pill">היום</span>}
      </div>
      <button className="date-nav-arrow" disabled={idx>=ALL_MATCH_DATES.length-1} onClick={()=>idx<ALL_MATCH_DATES.length-1&&onChange(ALL_MATCH_DATES[idx+1])}>›</button>
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
  const revealedMatches = GROUP_MATCHES.filter(m => canSeeMatchBet(m.id, "other", viewerUid));
  const revealedGroups = Object.keys(GROUPS_2026).filter(g => canSeeGroupBet(g, "other", viewerUid));
  const specialRevealed = canSeeSpecialBet("other", viewerUid);

  const nothingRevealed = revealedMatches.length===0 && revealedGroups.length===0 && !specialRevealed;

  if(activePlayer) return(
    <div className="section">
      <button className="btn-back-sm" onClick={()=>setActivePlayer(null)}>← חזרה לרשימה</button>
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
            🔴 {withFlag(teamNames?.[m.home]||m.home)} <b>{res.home}:{res.away}</b> {withFlag(teamNames?.[m.away]||m.away)}
            {res.minute?<span className="live-min"> {res.minute}'</span>:null}
          </span>
        );
      })}
    </div>
  );
}

// ─── HOME VIEW ────────────────────────────────────────────────────────────────
function HomeView({me, participants, results, teamNames, odds, onSelectPlayer, onSaveBets}){
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
    .filter(m=>m.kickoff&&new Date(m.kickoff).getTime()>nowTs)
    .sort((a,b)=>new Date(a.kickoff).getTime()-new Date(b.kickoff).getTime())[0];
  const groupsPickedCount=Object.keys(GROUPS_2026).filter(g=>(myBets.groups?.[g]||[]).length===2).length;
  const ranked=[...participants].map(p=>({...p,score:calcScore(p.bets||{},results,participants)})).sort((a,b)=>b.score-a.score);
  const medals=["🥇","🥈","🥉"];
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
                <span className="home-bet-val">{myBets.goldenBoot||"—"}</span>
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
                  {STRIKERS.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="special-row">
                <label>⚽ ניחוש סה״כ שערים <span className="pts-hint">(קרוב ביותר מנצח)</span></label>
                <input type="number" placeholder="כמה שערים?" value={totalGoals} onChange={e=>setTotalGoals(e.target.value)}/>
              </div>
              <div className="home-groups-indicator">
                <span>🏠 בתים שנבחרו</span>
                <span className={groupsPickedCount===12?"val-green":"val-muted"}>{groupsPickedCount}/12 — ערוך בלשונית תוצאות</span>
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
      <div className="home-card">
        <div className="home-card-title">🏆 טבלת דירוג</div>
        <div className="prizes-row" style={{marginBottom:".6rem"}}>
          <span>👥 {participants.length} שחקנים</span>
          <span>💰 {participants.length*50} ₪ בקופה</span>
          <span>🥇 {participants.length*50} ₪ ראשון</span>
          <span>🥈 מקום אחרון משלם 50₪</span>
        </div>
        <div className="lb-list">
          {ranked.map((p,i)=>(
            <div key={p.uid} className={`lb-row rank-${i+1}`} onClick={()=>onSelectPlayer(p)}>
              <span className="lb-rank">{medals[i]||i+1}</span>
              {p.photoURL&&<img src={p.photoURL} className="lb-avatar" alt=""/>}
              <span className="lb-name">{p.name}</span>
              <span className="lb-score">{p.score} נק׳</span>
              <span className="lb-arrow">›</span>
            </div>
          ))}
          {ranked.length===0&&<div className="empty-msg">עדיין אין משתתפים</div>}
        </div>
      </div>
    </div>
  );
}

// ─── RESULTS VIEW ─────────────────────────────────────────────────────────────
function ResultsView({participants, viewerUid, results, teamNames, me, onSaveMatch, onSaveBets, odds}){
  const [subTab,setSubTab]=useState("matches");
  const [revDate,setRevDate]=useState(getDefaultMatchDate);
  const [groupBets,setGroupBets]=useState(me?.bets?.groups||{});
  useEffect(()=>{setGroupBets(me?.bets?.groups||{});},[JSON.stringify(me?.bets?.groups)]);
  const globalLocked=isGlobalLocked();
  const dateMatches=GROUP_MATCHES.filter(m=>m.date===revDate);
  return(
    <div className="section">
      <LiveBar results={results} teamNames={teamNames}/>
      <div className="sub-tabs">
        {[["matches","⚽ משחקים"],["groups","🏠 בתים"]].map(([k,l])=>(
          <button key={k} className={`sub-tab ${subTab===k?"active":""}`} onClick={()=>setSubTab(k)}>{l}</button>
        ))}
      </div>
      {subTab==="matches"&&(
        <>
          <DateNav selectedDate={revDate} onChange={setRevDate}/>
          {dateMatches.length===0&&<div className="empty-msg">No games on this date</div>}
          {dateMatches.map(m=>{
            const locked=isMatchLocked(m.kickoff);
            const real=results.matches?.[m.id];
            const hasReal=real?.home!=null&&real?.away!=null;
            if(!locked){
              return(
                <div key={m.id} className="results-match-block">
                  <MatchBetRow match={m} savedBet={me?.bets?.matches?.[m.id]} onSave={onSaveMatch} teamNames={teamNames} odds={odds}/>
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
        <div className="scroll-area">
          {globalLocked?(
            Object.entries(GROUPS_2026).map(([g,teams])=>{
              const correct=results.groups?.[g]||[];
              return(
                <div key={g} className="group-box">
                  <div className="group-label">
                    בית {g}
                    {correct.length>0&&<span style={{color:"var(--green)",marginRight:".5rem"}}>עלו: {correct.map(t=>withFlag(teamNames?.[t]||t)).join(", ")}</span>}
                  </div>
                  <div className="rev-bets-row wrap" style={{marginTop:".4rem"}}>
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
            })
          ):(
            <>
              <p className="section-note">בחר 2 קבוצות לכל בית · 2נק׳ לאחת | 5נק׳ לשתיים</p>
              {Object.entries(GROUPS_2026).map(([g,teams])=>(
                <GroupPicker key={g} groupId={g} teams={teams} picks={groupBets[g]}
                  onChange={p=>setGroupBets(prev=>({...prev,[g]:p}))} locked={false} teamNames={teamNames}/>
              ))}
              <button className="btn-green" onClick={()=>onSaveBets({...me?.bets,groups:groupBets})}>💾 שמור הימורי בתים</button>
            </>
          )}
        </div>
      )}
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

export default function App(){
  const [authUser,setAuthUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [signingIn,setSigningIn]=useState(false);
  const [game,setGame]=useState({joinCode:"",results:{},playoffNames:{}});
  const [participants,setParticipants]=useState([]);
  const [gameLoading,setGameLoading]=useState(true);
  const [tab,setTab]=useState("home");
  const [selectedPlayer,setSelectedPlayer]=useState(null);
  const [toast,setToast]=useState(null);
  const [odds,setOdds]=useState({});
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
        const existing=snap.exists()?snap.data():{};
        if(!snap.exists()||existing.name!==user.displayName)
          await saveParticipant({uid:user.uid,name:user.displayName,photoURL:user.photoURL||null,bets:existing.bets||{}});
      }
    });
  },[]);

  useEffect(()=>{
    loadGame().then(g=>{setGame(g);setGameLoading(false);});
    const u1=onSnapshot(doc(db,"mundial2026","game"),snap=>{if(snap.exists())setGame(snap.data());});
    const u2=onSnapshot(collection(db,"mundial2026","game","participants"),snap=>{
      setParticipants(snap.docs.map(d=>({...d.data(),uid:d.id})));
    });

    const TEAM_MAP = {
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
      "Rwanda":"רואנדה",
      "El Salvador":"אל סלבדור",
      "Jamaica":"ג'מייקה",
      "Venezuela":"ונצואלה",
      "Honduras":"הונדורס",
      "Aruba":"ארובה",
      "Kenya":"קניה","Lesotho":"לסוטו","Denmark":"דנמרק","Ukraine":"אוקראינה",
      "Slovenia":"סלובניה","Greece":"יוון","Italy":"איטליה","Guatemala":"גואטמלה",
      "Liechtenstein":"ליכטנשטיין","Cyprus":"קפריסין","Kosovo":"קוסובו","Andorra":"אנדורה",
      "Afghanistan":"אפגניסטן","Pakistan":"פקיסטן","Oman":"עומאן","Mozambique":"מוזמביק",
      "Maldives":"מלדיביים","Bangladesh":"בנגלדש",
    };
    const heb = n => TEAM_MAP[n]||n;

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
            addBothKeys(res,heb(ev.homeTeam?.name),heb(ev.awayTeam?.name),hg,ag,fin?"FT":"LIVE",live,minute);
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
              const r=await fetch(`https://v3.football.api-sports.io/fixtures?date=${iso}`,{headers:{"x-apisports-key":"2150fd15cbccf603f549914910637735"}});
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

        let standingsData = { response: [] };

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
          }

          // Standings via API-Football, max once per hour
          const lastSS = syncData.lastStandingsSync ? new Date(syncData.lastStandingsSync).getTime() : 0;
          if (Date.now()-lastSS > 60*60*1000) {
            try {
              const rs=await fetch("https://v3.football.api-sports.io/standings?league=1&season=2026",{headers:{"x-apisports-key":"2150fd15cbccf603f549914910637735"}});
              standingsData=await rs.json();
              await setDoc(doc(db,"mundial2026","sync"),{lastStandingsSync:new Date().toISOString()},{merge:true});
            } catch(e) {}
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
              updatedMatches[m.id] = next; matchChanged = true;
            }
          }
        }

        // ── STANDINGS → auto group qualifiers + playoff names ──────
        let groupsChanged = false, playoffChanged = false;
        const updatedGroups = {...(cur.results?.groups||{})};
        const updatedPlayoff = {...(cur.playoffNames||{})};

        const standingsList = standingsData.response?.[0]?.league?.standings || [];
        const GROUP_LETTER = {"Group A":"A","Group B":"B","Group C":"C","Group D":"D","Group E":"E","Group F":"F","Group G":"G","Group H":"H","Group I":"I","Group J":"J","Group K":"K","Group L":"L"};
        for (const groupStandings of standingsList) {
          if (!Array.isArray(groupStandings)||!groupStandings.length) continue;
          const groupName = groupStandings[0]?.group;
          const letter = GROUP_LETTER[groupName];
          if (!letter) continue;
          const allPlayed = groupStandings.every(t => t.all?.played >= 3);
          if (allPlayed) {
            const top2 = groupStandings.slice(0,2).map(t => heb(t.team.name));
            const prev = updatedGroups[letter];
            if (!prev || JSON.stringify(prev)!==JSON.stringify(top2)) {
              updatedGroups[letter] = top2; groupsChanged = true;
            }
          }
          for (const t of groupStandings) {
            const apiName = t.team.name;
            const hebName = heb(apiName);
            if (t.all?.played > 0) {
              if (GROUPS_2026[letter]?.includes("פלייאוף FIFA 1") && t.all.played > 0) {
                if (!Object.values(TEAM_MAP).includes(hebName) && hebName !== apiName) {
                  if (updatedPlayoff["פלייאוף FIFA 1"] !== hebName) {
                    updatedPlayoff["פלייאוף FIFA 1"] = hebName; playoffChanged = true;
                  }
                }
              }
            }
          }
        }

        // ── KNOCKOUT MATCHES (schedule + results, no betting) ─────
        const STAGE_MAP = {
          "Round of 32":"32 האחרונות","Round of 16":"שמינית גמר",
          "Quarter-finals":"רבע גמר","Semi-finals":"חצי גמר",
          "3rd Place Final":"מקום שלישי","Final":"גמר"
        };
        const koMatchesArr = [];
        for (const f of fixtures) {
          const round = f.league?.round || "";
          const stage = STAGE_MAP[round];
          if (!stage) continue; // skip group stage
          const {fixture:fi, teams, goals} = f;
          const status = fi.status.short;
          const isFinished = ["FT","AET","PEN"].includes(status);
          const isLive = ["1H","2H","HT","ET","BT","P"].includes(status);
          const dateStr = fi.date ? new Date(fi.date).toLocaleDateString("he-IL",{day:"2-digit",month:"2-digit"}) : "";
          koMatchesArr.push({
            id: `ko_${fi.id}`,
            apiId: fi.id,
            stage,
            date: dateStr,
            home: heb(teams.home.name),
            away: heb(teams.away.name),
            ...(((isFinished||isLive)&&goals.home!=null)?{result:{home:goals.home,away:goals.away,live:isLive,status}}:{}),
          });
        }
        const koResults = {};
        koMatchesArr.forEach(m=>{ if(m.result) koResults[m.apiId]=m.result; });
        const koMatchesCleaned = koMatchesArr.map(({result,...m})=>m);

        const updates = {};
        if (matchChanged || groupsChanged || koMatchesArr.length > 0) {
          updates.results = {
            ...cur.results,
            matches: updatedMatches,
            koResults,
            knockoutMatches: koMatchesCleaned,
            ...(groupsChanged ? {groups: updatedGroups} : {}),
          };
        }
        if (playoffChanged) updates.playoffNames = updatedPlayoff;
        if (Object.keys(updates).length) await saveGame(updates);

      } catch(e) { console.warn("Score sync failed:", e.message); }
    };

    syncScores(auth.currentUser?.uid||"anon");
    const poll = setInterval(()=>syncScores(auth.currentUser?.uid||"anon"), 15 * 1000);
    return()=>{u1();u2();clearInterval(poll);};
  },[]);

  const handleSignIn=async()=>{
    setSigningIn(true);
    try{await signInWithPopup(auth,googleProvider);}catch(e){console.error(e);}
    setSigningIn(false);
  };
  const handleSaveBets=async bets=>{
    if(!authUser)return;
    await saveParticipant({uid:authUser.uid,name:authUser.displayName,photoURL:authUser.photoURL||null,bets});
    showToast("✅ הימורים נשמרו!");
  };

  const handleSaveMatchBet=async(matchId, matchBet)=>{
    if(!authUser)return;
    const curBets=participants.find(p=>p.uid===authUser.uid)?.bets||{};
    const updatedBets={...curBets,matches:{...curBets.matches,[matchId]:matchBet}};
    await saveParticipant({uid:authUser.uid,name:authUser.displayName,photoURL:authUser.photoURL||null,bets:updatedBets});
  };
  const handleSaveKoMatchBet=async(matchId, matchBet)=>{
    if(!authUser)return;
    const curBets=participants.find(p=>p.uid===authUser.uid)?.bets||{};
    const updatedBets={...curBets,koMatches:{...curBets.koMatches,[matchId]:matchBet}};
    await saveParticipant({uid:authUser.uid,name:authUser.displayName,photoURL:authUser.photoURL||null,bets:updatedBets});
  };

  const teamNames=game.playoffNames||{};
  const me=authUser?participants.find(p=>p.uid===authUser.uid):null;
  const n=participants.length;

  if(authLoading||gameLoading)return(<div className="app loading-screen"><div className="loading-ball">⚽</div><p>טוען...</p></div>);
  if(!authUser)return(<div className="app"><SignInScreen onSignIn={handleSignIn} loading={signingIn}/><style>{STYLES}</style></div>);

  if(selectedPlayer)return(
    <div className="app" dir="rtl">
      <Toast msg={toast}/>
      <div className="main-screen">
        <div className="main-header">
          <button className="back-btn" onClick={()=>setSelectedPlayer(null)}>←</button>
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
    <div className="app" dir="rtl">
      <Toast msg={toast}/>
      <div className="main-screen">
        <div className="main-header">
          <div className="header-user">
            {authUser.photoURL&&<img src={authUser.photoURL} className="header-avatar" alt=""/>}
            <span className="header-name">{authUser.displayName?.split(" ")[0]}</span>
          </div>
          <div className="header-title"><span>⚽ מונדיאל 2026 BET</span><small>על שם נייל קלארק</small></div>
          <button className="btn-signout" onClick={()=>signOut(auth)}>יציאה</button>
        </div>
        <div className="main-tabs">
          {[["home","🏠","בית"],["results","📊","תוצאות"],["rules","📜","חוקים"]].map(([k,icon,label])=>(
            <button key={k} className={`main-tab ${tab===k?"active":""}`} onClick={()=>setTab(k)}>
              <span className="tab-icon">{icon}</span>
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
        </div>
      </div>
      <style>{STYLES}</style>
    </div>
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
  .header-title{flex:1;font-weight:800;font-size:.9rem;text-align:center;display:flex;flex-direction:column;gap:.05rem;line-height:1.2}
  .header-title small{font-size:.65rem;color:var(--muted);font-weight:600}
  .back-btn{background:none;border:none;color:var(--muted);font-size:1.3rem;cursor:pointer;padding:.2rem .5rem}
  .btn-signout{background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:.3rem .7rem;font-size:.75rem;cursor:pointer;font-family:'Heebo',sans-serif;white-space:nowrap}
  .btn-signout:hover{color:var(--red);border-color:var(--red)}
  .main-tabs{display:flex;justify-content:center;background:var(--card);border-bottom:1px solid var(--border);padding:0 .5rem;flex-shrink:0;scrollbar-width:none}
  .main-tabs::-webkit-scrollbar{display:none}
  .main-tab{background:none;border:none;color:var(--muted);font-family:'Heebo',sans-serif;cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap;transition:all .2s;display:flex;flex-direction:column;align-items:center;gap:.1rem;padding:.55rem 1.4rem}
  .tab-icon{font-size:1.6rem;line-height:1}
  .tab-label{font-size:.72rem;font-weight:700}
  .main-tab.active{color:var(--green);border-bottom-color:var(--green)}
  .main-body{flex:1;overflow-y:auto;padding:1rem}
  .section{display:flex;flex-direction:column;gap:1rem;max-width:680px;margin:0 auto}
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
  .lb-list{display:flex;flex-direction:column;gap:.45rem}
  .lb-row{display:flex;align-items:center;gap:.7rem;background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:.7rem 1rem;cursor:pointer;transition:border-color .15s}
  .lb-row:hover{border-color:var(--green)}
  .lb-row.rank-1{border-color:rgba(255,206,0,.5);background:rgba(255,206,0,.06)}
  .lb-row.rank-2{border-color:rgba(200,200,220,.3)}
  .lb-row.rank-3{border-color:rgba(180,110,50,.3)}
  .lb-rank{font-size:1.2rem;width:1.8rem;text-align:center}
  .lb-avatar{width:28px;height:28px;border-radius:50%;object-fit:cover}
  .lb-name{flex:1;font-weight:700}
  .lb-score{color:var(--green);font-weight:800;font-size:1.05rem}
  .lb-arrow{color:var(--muted);font-size:1.2rem}
  .empty-msg{text-align:center;color:var(--muted);padding:2rem;font-size:.9rem}
  .player-bets-view{display:flex;flex-direction:column;gap:.8rem}
  .player-header{display:flex;align-items:center;gap:.8rem;background:var(--card2);border-radius:14px;padding:.8rem 1rem}
  .player-avatar{width:36px;height:36px;border-radius:50%;object-fit:cover}
  .player-hname{flex:1;font-weight:800;font-size:1rem}
  .player-score-badge{background:rgba(0,216,127,.15);color:var(--green);border-radius:20px;padding:.3rem .9rem;font-weight:800}
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

  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  .sched-score-live{background:rgba(255,77,109,.15);color:var(--red) !important}
  .sched-winning{color:var(--gold) !important}
  .sched-date{font-size:.82rem;color:var(--muted);margin-bottom:.28rem}
  .sched-teams{display:flex;align-items:center;gap:.5rem;font-size:1rem;font-weight:600}
  .sched-teams>span:first-child{flex:1;text-align:right}
  .sched-teams>span:last-child{flex:1;text-align:left}
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
`;

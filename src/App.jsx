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
  B: ["קנדה","שוויץ","קטאר","איטליה"],
  C: ["ברזיל","מרוקו","סקוטלנד","האיטי"],
  D: ['ארה"ב',"אוסטרליה","פרגוואי","טורקיה"],
  E: ["גרמניה","אקוודור","חוף השנהב","קוראסאו"],
  F: ["הולנד","יפן","תוניסיה","אוקראינה"],
  G: ["בלגיה","איראן","מצרים","ניו זילנד"],
  H: ["ספרד","ערב הסעודית","אורוגוואי","כף ורדה"],
  I: ["צרפת","סנגל","נורווגיה","פלייאוף FIFA 2"],
  J: ["ארגנטינה","אלג'יריה","אוסטריה","ירדן"],
  K: ["פורטוגל","אוזבקיסטן","קולומביה","פלייאוף FIFA 1"],
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
  {id:"A1",group:"A",home:"מקסיקו",away:"דרום אפריקה",date:"11/06",kickoff:"2026-06-11T22:00:00+03:00"},
  {id:"A2",group:"A",home:"קוריאה",away:"צ'כיה",date:"12/06",kickoff:"2026-06-12T05:00:00+03:00"},
  {id:"B1",group:"B",home:"קנדה",away:"איטליה",date:"12/06",kickoff:"2026-06-12T22:00:00+03:00"},
  {id:"D1",group:"D",home:'ארה"ב',away:"פרגוואי",date:"13/06",kickoff:"2026-06-13T04:00:00+03:00"},
  {id:"C1",group:"C",home:"ברזיל",away:"מרוקו",date:"13/06",kickoff:"2026-06-13T22:00:00+03:00"},
  {id:"D2",group:"D",home:"אוסטרליה",away:"טורקיה",date:"14/06",kickoff:"2026-06-14T01:00:00+03:00"},
  {id:"C2",group:"C",home:"האיטי",away:"סקוטלנד",date:"14/06",kickoff:"2026-06-14T04:00:00+03:00"},
  {id:"B2",group:"B",home:"קטאר",away:"שוויץ",date:"14/06",kickoff:"2026-06-14T05:00:00+03:00"},
  {id:"E1",group:"E",home:"גרמניה",away:"קוראסאו",date:"14/06",kickoff:"2026-06-14T20:00:00+03:00"},
  {id:"E2",group:"E",home:"חוף השנהב",away:"אקוודור",date:"14/06",kickoff:"2026-06-14T23:00:00+03:00"},
  {id:"F1",group:"F",home:"הולנד",away:"יפן",date:"15/06",kickoff:"2026-06-15T02:00:00+03:00"},
  {id:"F2",group:"F",home:"אוקראינה",away:"תוניסיה",date:"15/06",kickoff:"2026-06-15T05:00:00+03:00"},
  {id:"H1",group:"H",home:"ספרד",away:"כף ורדה",date:"15/06",kickoff:"2026-06-15T19:00:00+03:00"},
  {id:"G1",group:"G",home:"בלגיה",away:"מצרים",date:"15/06",kickoff:"2026-06-15T22:00:00+03:00"},
  {id:"H2",group:"H",home:"ערב הסעודית",away:"אורוגוואי",date:"16/06",kickoff:"2026-06-16T01:00:00+03:00"},
  {id:"G2",group:"G",home:"איראן",away:"ניו זילנד",date:"16/06",kickoff:"2026-06-16T04:00:00+03:00"},
  {id:"I1",group:"I",home:"צרפת",away:"סנגל",date:"16/06",kickoff:"2026-06-16T22:00:00+03:00"},
  {id:"I2",group:"I",home:"פלייאוף FIFA 2",away:"נורווגיה",date:"17/06",kickoff:"2026-06-17T01:00:00+03:00"},
  {id:"J1",group:"J",home:"ארגנטינה",away:"אלג'יריה",date:"17/06",kickoff:"2026-06-17T04:00:00+03:00"},
  {id:"J2",group:"J",home:"אוסטריה",away:"ירדן",date:"17/06",kickoff:"2026-06-17T07:00:00+03:00"},
  {id:"K1",group:"K",home:"פורטוגל",away:"פלייאוף FIFA 1",date:"17/06",kickoff:"2026-06-17T20:00:00+03:00"},
  {id:"L1",group:"L",home:"אנגליה",away:"קרואטיה",date:"17/06",kickoff:"2026-06-17T23:00:00+03:00"},
  {id:"L2",group:"L",home:"גאנה",away:"פנמה",date:"18/06",kickoff:"2026-06-18T02:00:00+03:00"},
  {id:"K2",group:"K",home:"אוזבקיסטן",away:"קולומביה",date:"18/06",kickoff:"2026-06-18T05:00:00+03:00"},
  {id:"A3",group:"A",home:"צ'כיה",away:"דרום אפריקה",date:"18/06",kickoff:"2026-06-18T19:00:00+03:00"},
  {id:"B3",group:"B",home:"שוויץ",away:"איטליה",date:"18/06",kickoff:"2026-06-18T22:00:00+03:00"},
  {id:"B4",group:"B",home:"קנדה",away:"קטאר",date:"19/06",kickoff:"2026-06-19T01:00:00+03:00"},
  {id:"A4",group:"A",home:"מקסיקו",away:"קוריאה",date:"19/06",kickoff:"2026-06-19T04:00:00+03:00"},
  {id:"D3",group:"D",home:'ארה"ב',away:"אוסטרליה",date:"19/06",kickoff:"2026-06-19T22:00:00+03:00"},
  {id:"C3",group:"C",home:"סקוטלנד",away:"מרוקו",date:"20/06",kickoff:"2026-06-20T01:00:00+03:00"},
  {id:"C4",group:"C",home:"ברזיל",away:"האיטי",date:"20/06",kickoff:"2026-06-20T04:00:00+03:00"},
  {id:"D4",group:"D",home:"טורקיה",away:"פרגוואי",date:"20/06",kickoff:"2026-06-20T07:00:00+03:00"},
  {id:"F3",group:"F",home:"יפן",away:"תוניסיה",date:"20/06",kickoff:"2026-06-20T19:00:00+03:00"},
  {id:"E3",group:"E",home:"גרמניה",away:"חוף השנהב",date:"20/06",kickoff:"2026-06-20T22:00:00+03:00"},
  {id:"E4",group:"E",home:"קוראסאו",away:"אקוודור",date:"21/06",kickoff:"2026-06-21T01:00:00+03:00"},
  {id:"F4",group:"F",home:"הולנד",away:"אוקראינה",date:"21/06",kickoff:"2026-06-21T04:00:00+03:00"},
  {id:"G3",group:"G",home:"בלגיה",away:"ניו זילנד",date:"21/06",kickoff:"2026-06-21T19:00:00+03:00"},
  {id:"H3",group:"H",home:"ספרד",away:"ערב הסעודית",date:"21/06",kickoff:"2026-06-21T22:00:00+03:00"},
  {id:"H4",group:"H",home:"אורוגוואי",away:"כף ורדה",date:"22/06",kickoff:"2026-06-22T01:00:00+03:00"},
  {id:"G4",group:"G",home:"מצרים",away:"איראן",date:"22/06",kickoff:"2026-06-22T04:00:00+03:00"},
  {id:"I3",group:"I",home:"צרפת",away:"נורווגיה",date:"22/06",kickoff:"2026-06-22T19:00:00+03:00"},
  {id:"J3",group:"J",home:"ארגנטינה",away:"אוסטריה",date:"22/06",kickoff:"2026-06-22T22:00:00+03:00"},
  {id:"J4",group:"J",home:"אלג'יריה",away:"ירדן",date:"23/06",kickoff:"2026-06-23T01:00:00+03:00"},
  {id:"I4",group:"I",home:"סנגל",away:"פלייאוף FIFA 2",date:"23/06",kickoff:"2026-06-23T04:00:00+03:00"},
  {id:"L3",group:"L",home:"אנגליה",away:"גאנה",date:"23/06",kickoff:"2026-06-23T19:00:00+03:00"},
  {id:"K3",group:"K",home:"פורטוגל",away:"קולומביה",date:"23/06",kickoff:"2026-06-23T22:00:00+03:00"},
  {id:"K4",group:"K",home:"אוזבקיסטן",away:"פלייאוף FIFA 1",date:"24/06",kickoff:"2026-06-24T01:00:00+03:00"},
  {id:"L4",group:"L",home:"קרואטיה",away:"פנמה",date:"24/06",kickoff:"2026-06-24T04:00:00+03:00"},
  {id:"A5",group:"A",home:"מקסיקו",away:"צ'כיה",date:"25/06",kickoff:"2026-06-25T00:00:00+03:00"},
  {id:"A6",group:"A",home:"קוריאה",away:"דרום אפריקה",date:"25/06",kickoff:"2026-06-25T00:00:00+03:00"},
  {id:"B5",group:"B",home:"קנדה",away:"שוויץ",date:"25/06",kickoff:"2026-06-25T04:00:00+03:00"},
  {id:"B6",group:"B",home:"קטאר",away:"איטליה",date:"25/06",kickoff:"2026-06-25T04:00:00+03:00"},
  {id:"C5",group:"C",home:"ברזיל",away:"סקוטלנד",date:"26/06",kickoff:"2026-06-26T00:00:00+03:00"},
  {id:"C6",group:"C",home:"מרוקו",away:"האיטי",date:"26/06",kickoff:"2026-06-26T00:00:00+03:00"},
  {id:"D5",group:"D",home:'ארה"ב',away:"טורקיה",date:"26/06",kickoff:"2026-06-26T04:00:00+03:00"},
  {id:"D6",group:"D",home:"אוסטרליה",away:"פרגוואי",date:"26/06",kickoff:"2026-06-26T04:00:00+03:00"},
  {id:"E5",group:"E",home:"גרמניה",away:"אקוודור",date:"26/06",kickoff:"2026-06-26T22:00:00+03:00"},
  {id:"E6",group:"E",home:"חוף השנהב",away:"קוראסאו",date:"26/06",kickoff:"2026-06-26T22:00:00+03:00"},
  {id:"F5",group:"F",home:"הולנד",away:"תוניסיה",date:"27/06",kickoff:"2026-06-27T02:00:00+03:00"},
  {id:"F6",group:"F",home:"יפן",away:"אוקראינה",date:"27/06",kickoff:"2026-06-27T02:00:00+03:00"},
  {id:"G5",group:"G",home:"בלגיה",away:"איראן",date:"27/06",kickoff:"2026-06-27T00:00:00+03:00"},
  {id:"G6",group:"G",home:"מצרים",away:"ניו זילנד",date:"27/06",kickoff:"2026-06-27T00:00:00+03:00"},
  {id:"H5",group:"H",home:"ספרד",away:"אורוגוואי",date:"27/06",kickoff:"2026-06-27T04:00:00+03:00"},
  {id:"H6",group:"H",home:"ערב הסעודית",away:"כף ורדה",date:"27/06",kickoff:"2026-06-27T04:00:00+03:00"},
  {id:"I5",group:"I",home:"צרפת",away:"פלייאוף FIFA 2",date:"27/06",kickoff:"2026-06-27T22:00:00+03:00"},
  {id:"I6",group:"I",home:"נורווגיה",away:"סנגל",date:"27/06",kickoff:"2026-06-27T22:00:00+03:00"},
  {id:"J5",group:"J",home:"ארגנטינה",away:"ירדן",date:"28/06",kickoff:"2026-06-28T02:00:00+03:00"},
  {id:"J6",group:"J",home:"אלג'יריה",away:"אוסטריה",date:"28/06",kickoff:"2026-06-28T02:00:00+03:00"},
  {id:"K5",group:"K",home:"פורטוגל",away:"אוזבקיסטן",date:"28/06",kickoff:"2026-06-28T00:00:00+03:00"},
  {id:"K6",group:"K",home:"קולומביה",away:"פלייאוף FIFA 1",date:"28/06",kickoff:"2026-06-28T00:00:00+03:00"},
  {id:"L5",group:"L",home:"אנגליה",away:"פנמה",date:"28/06",kickoff:"2026-06-28T04:00:00+03:00"},
  {id:"L6",group:"L",home:"קרואטיה",away:"גאנה",date:"28/06",kickoff:"2026-06-28T04:00:00+03:00"},
];

const GROUP_LAST_MATCH = {};
Object.keys(GROUPS_2026).forEach(g => {
  const gm = GROUP_MATCHES.filter(m => m.group === g);
  GROUP_LAST_MATCH[g] = gm.reduce((a,b) => new Date(a.kickoff) > new Date(b.kickoff) ? a : b).kickoff;
});
const TOURNAMENT_END = "2026-07-19T23:59:00+03:00";
const LOCK_MS = 5 * 60 * 1000;

function now() { return Date.now(); }

function isMatchLocked(kickoff) { return now() >= new Date(kickoff).getTime() - LOCK_MS; }
function isGlobalLocked() { return isMatchLocked("2026-06-11T22:00:00+03:00"); }
function isGroupRevealed(group) { return now() >= new Date(GROUP_LAST_MATCH[group]).getTime(); }
function isTournamentOver() { return now() >= new Date(TOURNAMENT_END).getTime(); }
function canSeeMatchBet(matchId, viewerUid, ownerUid) {
  if (viewerUid === ownerUid) return true;
  const match = GROUP_MATCHES.find(m => m.id === matchId);
  return match ? isMatchLocked(match.kickoff) : false;
}
function canSeeGroupBet(group, viewerUid, ownerUid) {
  return viewerUid === ownerUid || isGroupRevealed(group);
}
function canSeeSpecialBet(viewerUid, ownerUid) {
  return viewerUid === ownerUid || isTournamentOver();
}


function getDir(h,a){if(+h>+a)return"home";if(+a>+h)return"away";return"draw";}
function calcScore(bets={},results={},allP=[]){
  let t=0;
  Object.keys(GROUPS_2026).forEach(g=>{
    const picks=bets.groups?.[g]||[],correct=results.groups?.[g]||[];
    const hits=picks.filter(x=>correct.includes(x)).length;
    if(hits===1)t+=2;if(hits===2)t+=5;
  });
  GROUP_MATCHES.forEach(m=>{
    const bet=bets.matches?.[m.id],real=results.matches?.[m.id];
    if(!bet||!real||bet.home==null||bet.away==null||real.home==null||real.away==null)return;
    if(getDir(bet.home,bet.away)===getDir(real.home,real.away)){
      t+=1;if(+bet.home===+real.home&&+bet.away===+real.away)t+=3;
    }
  });
  // KO match bets (same scoring as group: 1pt direction + 3pt exact)
  if(bets.koMatches && results.koResults) {
    Object.keys(bets.koMatches).forEach(id=>{
      const bet=bets.koMatches[id];
      const real=results.koResults?.[id.replace("ko_","")];
      if(!bet||!real||bet.home==null||bet.away==null||real.home==null||real.away==null)return;
      if(getDir(bet.home,bet.away)===getDir(real.home,real.away)){
        t+=1;if(+bet.home===+real.home&&+bet.away===+real.away)t+=3;
      }
    });
  }
  if(bets.champion&&bets.champion===results.champion)t+=12;
  if(bets.goldenBoot&&results.goldenBoot&&bets.goldenBoot.trim().toLowerCase()===results.goldenBoot.trim().toLowerCase())t+=12;
  if(bets.totalGoals!=null&&results.totalGoals!=null&&results.totalGoalsBonus!=null){
    const myD=Math.abs(+bets.totalGoals-+results.totalGoals);
    const diffs=allP.map(p=>Math.abs((p.bets?.totalGoals??9999)-+results.totalGoals));
    if(myD===Math.min(...diffs))t+=+results.totalGoalsBonus;
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
      <button disabled={disabled} onClick={()=>onChange(Math.max(min,(value??0)-1))}>−</button>
      <span>{value??'—'}</span>
      <button disabled={disabled} onClick={()=>onChange(Math.min(max,(value??0)+1))}>+</button>
    </div>
  );
}
function Toast({msg}){return msg?<div className="toast">{msg}</div>:null;}

function SignInScreen({onSignIn,loading}){
  return(
    <div className="signin-screen">
      <div style={{fontSize:"4rem",marginBottom:"1rem"}}>⚽</div>
      <h1 className="home-title">מונדיאל<span>BET</span><small>2026</small></h1>
      <p className="home-sub">קנדה · מקסיקו · ארה״ב · 11 יוני – 19 יולי</p>
      <div className="signin-card">
        <p className="signin-desc">כניסה אחת — זוכר אותך לתמיד</p>
        <button className="btn-google" onClick={onSignIn} disabled={loading}>
          {loading?"מתחבר...":<><svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.8 13.5-4.7l-6.2-5.2C29.3 35.6 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7l-6.5 5C9.5 39.5 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.4 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/></svg>התחבר עם Google</>}
        </button>
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
          return(
            <button key={t} className={`team-btn ${idx>=0?"sel":""} ${locked?"locked":""}`} onClick={()=>toggle(t)}>
              {idx===0&&<span className="badge">1</span>}
              {idx===1&&<span className="badge">2</span>}
              {teamNames?.[t]||t}
            </button>
          );
        })}
      </div>
      {!locked&&(picks||[]).length<2&&<div className="hint">בחר {2-(picks||[]).length} עוד</div>}
    </div>
  );
}

function MatchBetRow({match, savedBet, onSave, teamNames}){
  const locked = isMatchLocked(match.kickoff);
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

  const dir = h!=null && a!=null ? getDir(+h,+a) : null;
  return(
    <div className={`match-row ${locked?"locked-row":""} ${saved?"saved-row":""}`}>
      <div className="match-meta">
        {match.date} · בית {match.group}
        {locked ? <span className="lock-badge-sm"> 🔒</span> : <span className="open-badge-sm"> ✏️</span>}
      </div>
      <div className="match-body">
        <div className={`team-name ${dir==="home"?"winner":""}`}>{teamNames?.[match.home]||match.home}</div>
        <div className="score-area">
          <NumStepper value={h} onChange={setH} disabled={locked}/>
          <span className="colon">:</span>
          <NumStepper value={a} onChange={setA} disabled={locked}/>
        </div>
        <div className={`team-name away ${dir==="away"?"winner":""}`}>{teamNames?.[match.away]||match.away}</div>
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
                          {teamNames?.[t]||t}{hit?" ✓":""}
                        </div>
                      );
                    })}
                  </div>
                ):<div className="hidden-block">🔒 יחשף לאחר סיום כל משחקי הבית</div>}
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
                <div className="match-meta">{m.date} · בית {m.group}</div>
                <div className="match-body">
                  <span className="team-name">{teamNames?.[m.home]||m.home}</span>
                  <div className="score-area">
                    {visible&&bet?.home!=null
                      ?<span className={`bet-score ${exact?"exact":correct?"dir-ok":""}`}>{bet.home}:{bet.away}{exact?" 🎯":correct?" ✓":""}</span>
                      :<span className="hidden-score">{visible?"—":"🔒"}</span>
                    }
                  </div>
                  <span className="team-name away">{teamNames?.[m.away]||m.away}</span>
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
            {label:"⚽ ניחוש שערים",key:"totalGoals",can:true},
          ].map(({label,key,can})=>(
            <div key={key} className="special-row">
              <label>{label}</label>
              <div className={`special-val ${!can?"hidden-val":""}`}>{can?(bets[key]||"—"):"🔒 יחשף בסוף הטורניר"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BetForm({user, onSave, onSaveMatch, onSaveKoMatch, koMatchesBet, teamNames}){
  const [bets, setBets] = useState(user.bets||{});
  const [tab, setTab] = useState("groups");
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
          <p className="section-note">⚡ 1נק׳ כיוון · +3נק׳ בול · נעילה 5 דק׳ לפני כל משחק</p>
          {GROUP_MATCHES.map(m=>(
            <MatchBetRow key={m.id} match={m}
              savedBet={user.bets?.matches?.[m.id]}
              onSave={onSaveMatch}
              teamNames={teamNames}/>
          ))}
        </div>
      )}
      {tab==="knockout"&&(
        <div className="scroll-area">
          {(!koMatchesBet||koMatchesBet.length===0)
            ? <div className="nothing-revealed" style={{padding:"2rem",textAlign:"center"}}>
                <div style={{fontSize:"2rem"}}>⏳</div>
                <p style={{color:"var(--muted)"}}>משחקי הנוקאאוט יופיעו כאן ברגע שהקבוצות ידועות</p>
                <p style={{color:"var(--muted)",fontSize:".8rem"}}>ניתן להמר עד 5 דק׳ לפני כל משחק</p>
              </div>
            : <>
                <p className="section-note">⚡ 1נק׳ כיוון · +3נק׳ בול · נעילה 5 דק׳ לפני כל משחק</p>
                {koMatchesBet.map((m,i)=>(
                  <MatchBetRow key={m.id||i} match={m}
                    savedBet={user.bets?.koMatches?.[m.id]}
                    onSave={(id,bet)=>onSaveKoMatch(id,bet)}
                    teamNames={teamNames}/>
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
              {REAL_TEAMS.map(t=><option key={t} value={t}>{teamNames?.[t]||t}</option>)}
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

function ScheduleView({results,teamNames}){
  const [filter,setFilter]=useState("שלב בתים");

  // Knockout matches stored separately from API sync
  const koMatches = results.knockoutMatches || [];

  const STAGES = ["שלב בתים","32 האחרונות","שמינית גמר","רבע גמר","חצי גמר","גמר"];
  const GROUP_FILTERS = Object.keys(GROUPS_2026);

  const renderMatch = (m, idx) => {
    const res = results.matches?.[m.id] || (m.apiId ? results.koResults?.[m.apiId] : null);
    const hasRes = res?.home!=null && res?.away!=null;
    const isLive = res?.live===true;
    const isDone = hasRes && !isLive;
    const locked = m.kickoff ? isMatchLocked(m.kickoff) : true;
    const homeName = teamNames?.[m.home]||m.home||"?";
    const awayName = teamNames?.[m.away]||m.away||"?";
    return(
      <div key={m.id||idx} className={`sched-row ${isLive?"sched-live":""} ${!locked&&!hasRes&&m.kickoff?"sched-open":""}`}>
        <div className="sched-date">
          {m.date&&`${m.date} · `}{m.group?`בית ${m.group}`:m.stage||""}
          {isLive&&<span className="live-badge"> 🔴 חי</span>}
          {isDone&&<span className="done-badge"> ✓ סיים</span>}
          {!locked&&!hasRes&&m.kickoff&&<span className="open-badge-sm"> ✏️ פתוח להימור</span>}
        </div>
        <div className="sched-teams">
          <span className={isDone&&+res.home>+res.away?"sched-winner":isLive&&+res.home>+res.away?"sched-winning":""}>{homeName}</span>
          {hasRes?<span className={`sched-score ${isLive?"sched-score-live":""}`}>{res.home} – {res.away}</span>:<span className="sched-vs">vs</span>}
          <span className={isDone&&+res.away>+res.home?"sched-winner":isLive&&+res.away>+res.home?"sched-winning":""}>{awayName}</span>
        </div>
      </div>
    );
  };

  return(
    <div>
      <div className="filter-row">
        {STAGES.map(s=>(
          <button key={s} className={`filter-btn ${filter===s?"active":""}`} onClick={()=>setFilter(s)}>{s}</button>
        ))}
        <span className="filter-sep">|</span>
        {GROUP_FILTERS.map(g=>(
          <button key={g} className={`filter-btn ${filter===g?"active":""}`} onClick={()=>setFilter(g)}>{`בית ${g}`}</button>
        ))}
      </div>
      <div className="scroll-area">
        {filter==="שלב בתים"&&GROUP_MATCHES.map((m,i)=>renderMatch(m,i))}
        {GROUP_FILTERS.includes(filter)&&GROUP_MATCHES.filter(m=>m.group===filter).map((m,i)=>renderMatch(m,i))}
        {["32 האחרונות","שמינית גמר","רבע גמר","חצי גמר","גמר"].includes(filter)&&(
          koMatches.filter(m=>m.stage===filter).length > 0
            ? koMatches.filter(m=>m.stage===filter).map((m,i)=>renderMatch(m,i))
            : <div className="empty-msg">⏳ השלב טרם החל</div>
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
          <span className="rev-count">{revealedMatches.length} / {GROUP_MATCHES.length}</span>
        </div>
        <div className="revealed-item">
          <span className="rev-label">🏠 בתים גלויים</span>
          <span className="rev-count">{revealedGroups.length} / 12</span>
        </div>
        <div className="revealed-item">
          <span className="rev-label">🏆 אלופה ומלך שערים</span>
          <span className={`rev-count ${specialRevealed?"green":""}`}>{specialRevealed?"✓ גלוי":"🔒 נעול"}</span>
        </div>
      </div>

      {nothingRevealed ? (
        <div className="nothing-revealed">
          <div style={{fontSize:"2.5rem"}}>🔒</div>
          <p>עדיין לא הסתיים אף משחק</p>
          <p className="section-note">הימורים ייחשפו אוטומטית אחרי כל משחק</p>
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
              {revealedMatches.length===0&&<div className="empty-msg">עדיין אין משחקים שהסתיימו</div>}
              {revealedMatches.map(m=>{
                const real=results.matches?.[m.id];
                const hasReal=real?.home!=null&&real?.away!=null;
                return(
                  <div key={m.id} className="revealed-match-block">
                    <div className="rev-match-header">
                      <span>{teamNames?.[m.home]||m.home}</span>
                      {hasReal?<span className="sched-score">{real.home} – {real.away}</span>:<span className="sched-vs">vs</span>}
                      <span>{teamNames?.[m.away]||m.away}</span>
                    </div>
                    <div className="rev-bets-row">
                      {participants.map(p=>{
                        const bet=p.bets?.matches?.[m.id];
                        if(!bet||bet.home==null)return null;
                        const correct=hasReal&&getDir(+bet.home,+bet.away)===getDir(+real.home,+real.away);
                        const exact=correct&&+bet.home===+real.home&&+bet.away===+real.away;
                        return(
                          <div key={p.uid} className={`rev-bet-chip ${exact?"exact":correct?"correct":hasReal?"wrong":""}`}>
                            <span className="chip-name">{p.name.split(" ")[0]}</span>
                            <span className="chip-score">{bet.home}:{bet.away}</span>
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
                      {correct.length>0&&<span style={{color:"var(--green)",marginRight:".5rem"}}>עלו: {correct.map(t=>teamNames?.[t]||t).join(", ")}</span>}
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
                            <span className="chip-score">{picks.map(t=>teamNames?.[t]||t).join(", ")}</span>
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

export default function App(){
  const [authUser,setAuthUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [signingIn,setSigningIn]=useState(false);
  const [game,setGame]=useState({joinCode:"",results:{},playoffNames:{}});
  const [participants,setParticipants]=useState([]);
  const [gameLoading,setGameLoading]=useState(true);
  const [tab,setTab]=useState("lb");
  const [selectedPlayer,setSelectedPlayer]=useState(null);
  const [toast,setToast]=useState(null);
  const toastRef=useRef(null);
  const showToast=msg=>{setToast(msg);clearTimeout(toastRef.current);toastRef.current=setTimeout(()=>setToast(null),2800);};

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
      "Canada":"קנדה","Switzerland":"שוויץ","Qatar":"קטאר","Italy":"איטליה",
      "Brazil":"ברזיל","Morocco":"מרוקו","Scotland":"סקוטלנד","Haiti":"האיטי",
      "USA":"ארה\"ב","United States":"ארה\"ב","Australia":"אוסטרליה","Paraguay":"פרגוואי","Turkey":"טורקיה","Türkiye":"טורקיה",
      "Germany":"גרמניה","Ecuador":"אקוודור","Ivory Coast":"חוף השנהב","Cote d'Ivoire":"חוף השנהב","Curacao":"קוראסאו","Curaçao":"קוראסאו",
      "Netherlands":"הולנד","Japan":"יפן","Tunisia":"תוניסיה","Ukraine":"אוקראינה",
      "Spain":"ספרד","Saudi Arabia":"ערב הסעודית","Uruguay":"אורוגוואי","Cape Verde":"כף ורדה",
      "Belgium":"בלגיה","Iran":"איראן","Egypt":"מצרים","New Zealand":"ניו זילנד",
      "France":"צרפת","Senegal":"סנגל","Norway":"נורווגיה",
      "Argentina":"ארגנטינה","Algeria":"אלג'יריה","Austria":"אוסטריה","Jordan":"ירדן",
      "Portugal":"פורטוגל","Uzbekistan":"אוזבקיסטן","Colombia":"קולומביה",
      "England":"אנגליה","Croatia":"קרואטיה","Ghana":"גאנה","Panama":"פנמה",
    };
    const heb = n => TEAM_MAP[n]||n;

    const syncScores = async (uid) => {
      try {
        // ── LEADER LOCK: only one user syncs at a time ──────────────
        // Check if another client synced recently (within last 90 seconds)
        const syncSnap = await getDoc(doc(db,"mundial2026","sync"));
        const syncData = syncSnap.exists() ? syncSnap.data() : {};
        const lastSync = syncData.lastSync ? new Date(syncData.lastSync).getTime() : 0;
        const secondsSinceLast = (Date.now() - lastSync) / 1000;

        // If synced less than 90s ago by someone else, skip — read from Firebase instead
        if (secondsSinceLast < 90 && syncData.syncedBy !== uid) return;

        // Claim the sync slot
        await setDoc(doc(db,"mundial2026","sync"), {
          lastSync: new Date().toISOString(),
          syncedBy: uid,
        });

        // 1. Fetch fixtures (scores)
        const res = await fetch(
          "https://v3.football.api-sports.io/fixtures?league=1&season=2026",
          { headers: { "x-apisports-key": "2150fd15cbccf603f549914910637735" } }
        );
        const data = await res.json();
        const fixtures = data.response || [];
        if (!fixtures.length) return;

        // 2. Fetch standings (group qualifiers + playoff names)
        const res2 = await fetch(
          "https://v3.football.api-sports.io/standings?league=1&season=2026",
          { headers: { "x-apisports-key": "2150fd15cbccf603f549914910637735" } }
        );
        const standingsData = await res2.json();

        const gameSnap = await getDoc(doc(db,"mundial2026","game"));
        const cur = gameSnap.exists() ? gameSnap.data() : {};

        // ── MATCHES ────────────────────────────────────────────────
        const byKey = {};
        for (const f of fixtures) {
          const {fixture:fi, teams, goals} = f;
          const status = fi.status.short;
          const isFinished = ["FT","AET","PEN"].includes(status);
          const isLive = ["1H","2H","HT","ET","BT","P","SUSP","INT","LIVE"].includes(status);
          if ((isFinished||isLive) && goals.home!=null && goals.away!=null) {
            byKey[`${heb(teams.home.name)}_${heb(teams.away.name)}`] = {home:goals.home,away:goals.away,status,live:isLive};
          }
        }
        const curMatches = cur.results?.matches || {};
        const updatedMatches = {...curMatches};
        let matchChanged = false;
        for (const m of GROUP_MATCHES) {
          const key = `${m.home}_${m.away}`;
          if (byKey[key]) {
            const prev = curMatches[m.id], next = byKey[key];
            if (!prev || prev.home!==next.home || prev.away!==next.away || prev.live!==next.live) {
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
    const poll = setInterval(()=>syncScores(auth.currentUser?.uid||"anon"), 2 * 60 * 1000);
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
  if(!authUser)return(<div className="app"><SignInScreen onSignIn={handleSignIn} loading={signingIn}/></div>);

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
          <span className="header-title">⚽ מונדיאל BET 2026</span>
          <button className="btn-signout" onClick={()=>signOut(auth)}>יציאה</button>
        </div>
        <div className="main-tabs">
          {[["lb","🏆 דירוג"],["schedule","📅 לוח"],["mybets","🎯 שלי"],["revealed","👁️ גלויים"],["rules","📜 חוקים"]].map(([k,l])=>(
            <button key={k} className={`main-tab ${tab===k?"active":""}`} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>
        <div className="main-body">
          {tab==="lb"&&(
            <div className="section">
              <div className="section-header">
                <h2>🏆 טבלת דירוג</h2>
                <div className="prizes-row">
                  <span>👥 {n} שחקנים</span><span>💰 {n*50} ₪ בקופה</span>
                  <span>🥇 {n*50} ₪ למקום ראשון</span><span>🥈 מקום אחרון משלם 50₪ למקום שני</span>
                </div>
                <p className="section-note">לחץ על שחקן לראות את ההימורים שלו</p>
              </div>
              <Leaderboard participants={participants} results={game.results||{}} onSelectPlayer={setSelectedPlayer}/>
            </div>
          )}
          {tab==="schedule"&&(
            <div className="section">
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <h2>📅 לוח משחקים</h2>
                <span className="sync-badge">🔄 מתעדכן אוטומטית</span>
              </div>
              <ScheduleView results={game.results||{}} teamNames={teamNames}/>
            </div>
          )}
          {tab==="mybets"&&(
            <div className="section">
              <h2>🎯 ההימורים שלי</h2>
              {me?<BetForm user={me} onSave={handleSaveBets} onSaveMatch={handleSaveMatchBet} onSaveKoMatch={handleSaveKoMatchBet} koMatchesBet={game.results?.knockoutMatches||[]} teamNames={teamNames}/>:<p className="section-note">טוען...</p>}
            </div>
          )}

          {tab==="revealed"&&(
            <RevealedBetsView
              participants={participants}
              viewerUid={authUser.uid}
              results={game.results||{}}
              teamNames={teamNames}
            />
          )}

          {tab==="rules"&&(
            <div className="section rules-section">
              <h2>📜 ספר חוקים</h2>
              {[
                ["💰 קופה","כל משתתף שם 50 ₪"],["🥇 מקום ראשון","מקבל את כל הקופה"],
                ["🥈 מקום שני","מקבל 50 ₪ ממי שסיים אחרון"],
                ["🔒 נעילת הימורים","5 דקות לפני כל משחק"],
                ["🙈 סודיות תוצאות","ניחוש משחק — נסתר עד שהמשחק מתחיל"],
                ["🙈 סודיות בתים","מנצחת/סגנית — נחשפת רק אחרי סיום כל משחקי הבית"],
                ["🙈 סודיות אלופה","אלופה + מלך שערים — נחשפים רק בסוף הטורניר"],
                ["🏠 בתים","2נק׳ לקבוצה נכונה · 5נק׳ לשתיים"],
                ["⚽ כיוון משחק","1נק׳"],["✅ תוצאה מדויקת","3נק׳ בונוס"],
                
                ["🏆 אלופה","12 נק׳"],["👟 מלך שערים","12 נק׳"],
                ["⚽ סה״כ שערים","הקרוב ביותר מנצח — הניקוד נקבע לפני הגמר (6–10 נק׳)"],["🏆 נוקאאוט","1נק׳ כיוון · +3נק׳ תוצאה מדויקת (כמו שלב בתים)"],
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
  .loading-screen,.signin-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:1.2rem;padding:2rem;text-align:center}
  .loading-ball{font-size:3rem;animation:sway 1s ease-in-out infinite}
  .loading-screen p{color:var(--muted)}
  @keyframes sway{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(12deg)}}
  .home-title{font-size:2.8rem;font-weight:900;letter-spacing:-1px;line-height:1}
  .home-title span{color:var(--green)}
  .home-title small{display:block;font-size:1.1rem;color:var(--gold);font-weight:700;letter-spacing:2px;margin-top:.2rem}
  .home-sub{color:var(--muted);font-size:.95rem}
  .signin-card{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:1.5rem 2rem;display:flex;flex-direction:column;gap:1rem;align-items:center;width:100%;max-width:320px}
  .signin-desc{color:var(--muted);font-size:.9rem}
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
  .header-title{flex:1;font-weight:800;font-size:.9rem;text-align:center}
  .back-btn{background:none;border:none;color:var(--muted);font-size:1.3rem;cursor:pointer;padding:.2rem .5rem}
  .btn-signout{background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:.3rem .7rem;font-size:.75rem;cursor:pointer;font-family:'Heebo',sans-serif;white-space:nowrap}
  .btn-signout:hover{color:var(--red);border-color:var(--red)}
  .main-tabs{display:flex;overflow-x:auto;background:var(--card);border-bottom:1px solid var(--border);padding:0 .5rem;flex-shrink:0;scrollbar-width:none}
  .main-tabs::-webkit-scrollbar{display:none}
  .main-tab{background:none;border:none;color:var(--muted);font-family:'Heebo',sans-serif;font-size:.83rem;font-weight:600;padding:.7rem .75rem;cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap;transition:all .2s}
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
  .team-btn.correct{background:rgba(0,216,127,.2);border-color:var(--green);color:var(--green)}
  .badge{position:absolute;top:2px;left:4px;font-size:.58rem;color:var(--gold);font-weight:900}
  .hint{font-size:.72rem;color:var(--muted);margin-top:.4rem}
  .hidden-block{background:rgba(90,123,160,.1);border:1px dashed var(--border);border-radius:10px;padding:.6rem;text-align:center;color:var(--muted);font-size:.82rem}
  .match-row{background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:.65rem .9rem;margin-bottom:.45rem}
  .match-row.locked-row{opacity:.75}
  .match-row.correct-row{border-right:3px solid var(--green)}
  .match-row.hidden-row{opacity:.6}
  .match-meta{font-size:.7rem;color:var(--muted);margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
  .match-body{display:flex;align-items:center;gap:.5rem}
  .team-name{font-size:.8rem;font-weight:600;flex:1;text-align:right}
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
  .sched-date{font-size:.68rem;color:var(--muted);margin-bottom:.28rem}
  .sched-teams{display:flex;align-items:center;gap:.5rem;font-size:.85rem;font-weight:600}
  .sched-teams>span:first-child,.sched-teams>span:last-child{flex:1;text-align:right}
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
  .rev-count{font-weight:800;font-size:.95rem}
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
  .btn-back-sm{background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:.3rem .8rem;font-size:.85rem;font-family:'Heebo',sans-serif;cursor:pointer;margin-bottom:.5rem}
  .btn-back-sm:hover{color:var(--text);border-color:var(--text)}
  .toast{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:var(--green);color:#060e1a;font-weight:800;border-radius:100px;padding:.65rem 1.6rem;font-size:.92rem;z-index:999;box-shadow:0 8px 30px rgba(0,216,127,.4);animation:fadeUp .3s ease}
  @keyframes fadeUp{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
`;

import { useState, useEffect, useRef } from "react";
import { GROUP_MATCHES, GROUPS_2026, FLAG_MAP, KO_POINTS } from "../constants/tournament.js";
import {
  isGlobalLocked, isTournamentOver, withFlag, withStrikerFlag, hePlayer,
  calcScore, calcScoreBreakdown, rankSymbol, getDir, isChatLocked, getCardCounts, isStillLive, buildKnockoutSchedule
} from "../utils/helpers.js";
import { NumStepper, MatchRow, MatchChat } from "./common.jsx";
import { ALL_MATCH_DATES } from "../constants/tournament.js";

// ─── WINNER ANNOUNCEMENT ──────────────────────────────────────────────────────
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

export function WinnerAnnouncement({ winner, isFinal, onClose }) {
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="wa-overlay" onClick={onClose}>
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

// ─── DAILY RANK ANIMATION ─────────────────────────────────────────────────────
const DAILY_ANIM_PRESETS = {
  first: [
    {emoji:"🥇",particles:["🎉","🎊","🌟","✨","💛"],bg:"linear-gradient(135deg,#FFD700 0%,#FF8C00 100%)",title:"מקום ראשון! 🏆",sub:"פשוט קטלת את כולם היום 👑"},
    {emoji:"🎆",particles:["🎇","⭐","💥","🌠","💫"],bg:"linear-gradient(135deg,#0d0d2b 0%,#1a1a6e 100%)",title:"מוביל! 👑",sub:"הזיקוקים בשמיים בשבילך 🎆"},
    {emoji:"👑",particles:["💰","🪙","💎","✨","🏅"],bg:"linear-gradient(135deg,#7B5E00 0%,#FFD700 100%)",title:"אלוף היום! 🥇",sub:"מלך/מלכת ההימורים 👑"},
  ],
  second: [
    {emoji:"🥈",particles:["⚡","💨","❄️","🌊","🔷"],bg:"linear-gradient(135deg,#5a5a5a 0%,#C0C0C0 100%)",title:"מקום שני 🥈",sub:"כמעט — אבל לא ממש 😏"},
    {emoji:"😤",particles:["💪","🔥","⚡","🎯","🏋️"],bg:"linear-gradient(135deg,#2d0057 0%,#7B2FBE 100%)",title:"מקום שני 🥈",sub:"מחר תחטוף מהם את הראשון! 💪"},
    {emoji:"🎯",particles:["🌈","💫","✨","⭐","🎪"],bg:"linear-gradient(135deg,#003d5c 0%,#006994 100%)",title:"כמעט ראשון! 🥈",sub:"עוד צעד קטן לפסגה"},
  ],
  third: [
    {emoji:"🥉",particles:["🔶","🟠","✨","🍊","💥"],bg:"linear-gradient(135deg,#5C3317 0%,#CD7F32 100%)",title:"מקום שלישי 🥉",sub:"פודיום! לא כולם מגיעים לכאן"},
    {emoji:"🎪",particles:["🎭","🎠","🎡","🎊","🎉"],bg:"linear-gradient(135deg,#7a0000 0%,#FF4500 100%)",title:"מקום שלישי 🥉",sub:"עוד לא אמרת את המילה האחרונה!"},
    {emoji:"💥",particles:["⚡","🔥","💫","🌟","💢"],bg:"linear-gradient(135deg,#0a3d00 0%,#1e7e00 100%)",title:"מקום שלישי! 🥉",sub:"הקרב על הפודיום נמשך 🔥"},
  ],
  last: [
    {emoji:"🗑️",particles:["💩","🙈","😬","😅","🤦"],bg:"linear-gradient(135deg,#0a0a0a 0%,#2d0000 100%)",title:"מקום אחרון 🗑️",sub:"...ממש לא הלך היום, חבל"},
    {emoji:"💩",particles:["😭","🤦","😩","🙈","💀"],bg:"linear-gradient(135deg,#1a0800 0%,#4a1500 100%)",title:"הפח שלך מחכה 🗑️",sub:"לפחות אי אפשר להיות יותר גרוע 😅"},
    {emoji:"😭",particles:["💧","🌧️","☔","😢","🥶"],bg:"linear-gradient(135deg,#001433 0%,#003080 100%)",title:"מקום אחרון... 🗑️",sub:"הבאים יהיו טובים יותר! (בטח) 💧"},
  ],
  middle: [
    {emoji:"😐",particles:["🤷","💭","🎯","⚽","📊"],bg:"linear-gradient(135deg,#0d2d00 0%,#1b5e20 100%)",title:"באמצע הטבלה 🎯",sub:"לא רע — אבל יש לאן לצמוח"},
    {emoji:"💪",particles:["🔥","⚡","💥","🚀","🏃"],bg:"linear-gradient(135deg,#002147 0%,#003580 100%)",title:"עוד לא נגמר! 💪",sub:"הכל עדיין פתוח — בוא נעשן אותם"},
    {emoji:"🚀",particles:["⭐","🌟","💫","✨","🛸"],bg:"linear-gradient(135deg,#1a0030 0%,#4a0080 100%)",title:"טסים למעלה 🚀",sub:"עוד לא אמרנו את המילה האחרונה!"},
  ],
};

const DAILY_PARTICLES = Array.from({length:24},(_,i)=>({
  left: ((i*137.508)%100).toFixed(1)+"%",
  top:  "-60px",
  delay: ((i*0.18)%2.8).toFixed(2)+"s",
  dur:   (2.8+(i*0.15)%2).toFixed(2)+"s",
  size:  22+(i%4)*7,
  rotate:(i*47)%360,
}));

const TENOR_KEY="LIVDSRZULELA";
const GIF_TAGS={
  first:["celebration","winner","champion","trophy"],
  second:["applause","almost","runner up"],
  third:["bronze","podium","third place"],
  last:["fail","loser","sad funny","epic fail"],
  middle:["shrug","meh","whatever"],
};

export function DailyRankAnimation({data,onClose}){
  const {date,sym,score,rank,isTest}=data;
  const dayVariant=useRef(isTest?Math.floor(Math.random()*3):ALL_MATCH_DATES.indexOf(date)%3).current;
  const tagRoll=useRef(Math.random()).current;
  let presetGroup,tagGroup;
  if(sym==="🥇"){presetGroup=DAILY_ANIM_PRESETS.first;tagGroup="first";}
  else if(sym==="🥈"){presetGroup=DAILY_ANIM_PRESETS.second;tagGroup="second";}
  else if(sym==="🥉"){presetGroup=DAILY_ANIM_PRESETS.third;tagGroup="third";}
  else if(sym==="🗑️"){presetGroup=DAILY_ANIM_PRESETS.last;tagGroup="last";}
  else{presetGroup=DAILY_ANIM_PRESETS.middle;tagGroup="middle";}
  const p=presetGroup[dayVariant];
  const tagList=GIF_TAGS[tagGroup];
  const tag=tagList[Math.floor(tagRoll*tagList.length)];

  const [gifUrl,setGifUrl]=useState(null);
  useEffect(()=>{
    let cancelled=false;
    async function fetchGif(){
      try{
        const r=await fetch(`https://api.tenor.com/v1/search?q=${encodeURIComponent(tag)}&key=${TENOR_KEY}&limit=30&media_filter=minimal`);
        const j=await r.json();
        const results=j?.results||[];
        if(results.length&&!cancelled){
          const item=results[Math.floor(Math.random()*results.length)];
          const url=item?.media?.[0]?.gif?.url||item?.media?.[0]?.mediumgif?.url;
          if(url)setGifUrl(url);
        }
      }catch(e){/* show emoji fallback */}
    }
    fetchGif();
    return()=>{cancelled=true;};
  },[]);

  useEffect(()=>{const t=setTimeout(onClose,9000);return()=>clearTimeout(t);},[]);

  return(
    <div className="dra-overlay" style={{background:p.bg}} onClick={onClose}>
      <div className="dra-particles" aria-hidden="true">
        {DAILY_PARTICLES.map((pt,i)=>(
          <span key={i} className="dra-particle" style={{
            left:pt.left,top:pt.top,
            animationDelay:pt.delay,animationDuration:pt.dur,
            fontSize:pt.size+"px",
          }}>{p.particles[i%p.particles.length]}</span>
        ))}
      </div>
      <div className="dra-card" onClick={e=>e.stopPropagation()}>
        {gifUrl
          ? <img src={gifUrl} alt="" className="dra-gif"/>
          : <div className="dra-main-emoji">{p.emoji}</div>
        }
        <div className="dra-rank-sym">{sym}</div>
        <div className="dra-title">{p.title}</div>
        <div className="dra-score">{score} נק׳</div>
        <div className="dra-date-tag">יום {date}</div>
        <div className="dra-sub">{p.sub}</div>
        <button className="dra-btn" onClick={onClose}>המשך</button>
      </div>
    </div>
  );
}

// ─── SPECIAL BETS CARD ────────────────────────────────────────────────────────
function SpecialBetsCard({participants, results, teamNames, funIran=0, funIsrael=0, onFunIranChange, onFunIsraelChange, onSaveFunBet, funSaving}){
  if(!isGlobalLocked())return null;
  const over=isTournamentOver();
  const [showScorers,setShowScorers]=useState(false);
  const topScorer=results.topScorer;
  const actualGoals=results.actualTotalGoals;
  const champion=results.champion;

  const diffs=participants
    .filter(p=>p.bets?.totalGoals!=null&&p.bets.totalGoals!=="")
    .map(p=>Math.abs(+p.bets.totalGoals-(actualGoals??0)));
  const minDiff=diffs.length?Math.min(...diffs):null;

  return(
    <div className="home-card">
      <div className="home-card-title">⭐ הימורים מיוחדים</div>
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
      <div className="sp-section">
        <div className="sp-label" style={{cursor:"pointer"}} onClick={()=>setShowScorers(s=>!s)}>
          👟 מלך שערים
          {topScorer&&<span className="sp-live-val">{topScorer.team&&FLAG_MAP[topScorer.team]?`${FLAG_MAP[topScorer.team]} ${hePlayer(topScorer.name)}`:withStrikerFlag(hePlayer(topScorer.name))} ({topScorer.goals}⚽) ›</span>}
          {!topScorer&&<span className="sp-pending">ממתין לנתונים</span>}
        </div>
        {showScorers&&results.topScorers?.length?(
          <div className="scorers-list">
            {results.topScorers.map((s,i)=>(
              <div key={i} className="scorers-row">
                <span className="scorers-rank">{i+1}</span>
                <span className="scorers-flag">{FLAG_MAP[s.team]||""}</span>
                <span className="scorers-name">{s.name}</span>
                <span className="scorers-goals">{s.goals}⚽</span>
              </div>
            ))}
          </div>
        ):null}
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
                {isWinner&&<span className="sp-pts">+10נק׳</span>}
              </div>
            );
          })}
        </div>
      </div>
      {!results.funHidden&&<div className="sp-section fun-bet-section">
        <div className="sp-label">
          🚀 איראן – ישראל
          {results.funResult
            ?<span className="sp-live-val">🇮🇷 {results.funResult.iran} – {results.funResult.israel} 🇮🇱</span>
            :<span className="sp-pending">ממתין לתוצאה</span>}
        </div>
        <p className="fun-bet-subtitle" style={{margin:".2rem 0 .6rem",fontSize:".75rem",color:"var(--muted)"}}>כמה טילים כל מדינה תירה?</p>
        {results.funLocked
          ?<div className="fun-bet-hidden">🔒 ההימור ננעל</div>
          :<>
            <div className="fun-bet-scoreline">
              <div className="fun-bet-team-col">
                <span className="fun-bet-flag">🇮🇷</span>
                <span className="fun-bet-tname">איראן</span>
                <NumStepper value={funIran} onChange={onFunIranChange} max={9999}/>
              </div>
              <span className="fun-bet-dash">–</span>
              <div className="fun-bet-team-col">
                <span className="fun-bet-flag">🇮🇱</span>
                <span className="fun-bet-tname">ישראל</span>
                <NumStepper value={funIsrael} onChange={onFunIsraelChange} max={9999}/>
              </div>
            </div>
            <button className="btn-green" style={{marginTop:".6rem",width:"100%"}} onClick={onSaveFunBet} disabled={funSaving}>
              {funSaving?"שומר...":"💾 שמור"}
            </button>
          </>
        }
        {results.funRevealed
          ?<div className="sp-chips" style={{marginTop:".6rem"}}>
            {participants.map(p=>{
              const bet=p.bets?.funBet;
              if(!bet||typeof bet!=="object"||bet.iran==null)return null;
              return(
                <div key={p.uid} className="sp-chip">
                  <span className="sp-chip-name">{p.name.split(" ")[0]}</span>
                  <span className="sp-chip-val">🇮🇷 {bet.iran} – {bet.israel} 🇮🇱</span>
                </div>
              );
            })}
          </div>
          :<div className="fun-bet-hidden" style={{marginTop:".5rem"}}>🔒 הימורי האחרים יחשפו ע״י המנהל</div>
        }
      </div>}
    </div>
  );
}

// ─── HOME VIEW ────────────────────────────────────────────────────────────────
export default function HomeView({me, participants, results, teamNames, odds, liveStats, onMatchClick, onSelectPlayer, onSaveBets, onGoToGroups, showWinner, setShowWinner}){
  const myBets=me?.bets||{};
  const globalLocked=isGlobalLocked();
  const [champion,setChampion]=useState(myBets.champion||"");
  const [goldenBoot,setGoldenBoot]=useState(myBets.goldenBoot||"");
  const [totalGoals,setTotalGoals]=useState(myBets.totalGoals||"");
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const existingFunBet=typeof myBets.funBet==="object"?myBets.funBet:null;
  const [funIran,setFunIran]=useState(existingFunBet?.iran??0);
  const [funIsrael,setFunIsrael]=useState(existingFunBet?.israel??0);
  const [funSaving,setFunSaving]=useState(false);
  const [zoomedPhoto,setZoomedPhoto]=useState(null);
  useEffect(()=>{
    setChampion(myBets.champion||"");
    setGoldenBoot(myBets.goldenBoot||"");
    setTotalGoals(myBets.totalGoals||"");
    const fb=typeof myBets.funBet==="object"?myBets.funBet:null;
    setFunIran(fb?.iran??0);
    setFunIsrael(fb?.israel??0);
  },[myBets.champion,myBets.goldenBoot,myBets.totalGoals,JSON.stringify(myBets.funBet)]);
  const handleSaveSpecial=async()=>{
    setSaving(true);
    await onSaveBets({...myBets,champion,goldenBoot,totalGoals});
    setSaving(false);setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  };
  const handleSaveFunBet=async()=>{
    setFunSaving(true);
    await onSaveBets({...myBets,funBet:{iran:funIran,israel:funIsrael}});
    setFunSaving(false);
  };
  const nowTs=Date.now();
  const koSched=buildKnockoutSchedule(results, teamNames);
  // A match stays on the home card while it's live AND for 30 min after it ends, so
  // everyone can see the final score and how it scored before it drops off.
  const DONE_GRACE_MS=30*60*1000;
  const recentlyDone=(m,res,ko)=>{
    if(!res||res.home==null||res.live) return false;
    const end=res.endedAt || (m.kickoff ? new Date(m.kickoff).getTime()+(ko?2.5:2)*60*60*1000 : null);
    return end!=null && nowTs < end + DONE_GRACE_MS;
  };
  // Current = live or just-finished, across group + knockout, soonest kickoff first.
  const currentMatches=[
    ...GROUP_MATCHES.map(m=>({m,res:results.matches?.[m.id],ko:false})),
    ...koSched.map(m=>({m,res:m.res,ko:true})),
  ].filter(({m,res,ko})=>isStillLive(m.id,res,m.kickoff)||recentlyDone(m,res,ko))
   .sort((a,b)=>new Date(a.m.kickoff||0).getTime()-new Date(b.m.kickoff||0).getTime());
  // Upcoming fixtures (group + knockout) that haven't started, soonest first.
  const upcoming=[
    ...GROUP_MATCHES.filter(m=>m.kickoff && results.matches?.[m.id]?.home==null),
    ...koSched.filter(m=>m.kickoff && m.res?.home==null),
  ].sort((a,b)=>new Date(a.kickoff).getTime()-new Date(b.kickoff).getTime());
  // Show every match that kicks off at the same (soonest) time, not just one.
  const nextTs=upcoming[0]?.kickoff ? new Date(upcoming[0].kickoff).getTime() : null;
  const nextMatches=currentMatches.length===0 && nextTs!=null
    ? upcoming.filter(m=>new Date(m.kickoff).getTime()===nextTs)
    : [];
  const resFor=m=>m.res!==undefined?m.res:results.matches?.[m.id];
  const groupsPickedCount=Object.keys(GROUPS_2026).filter(g=>(myBets.groups?.[g]||[]).length===2).length;
  const ranked=[...participants].map(p=>({...p,score:calcScore(p.bets||{},results,participants)})).sort((a,b)=>b.score-a.score);
  const medals=["🥇","🥈","🥉"];
  const tournamentOver=isTournamentOver();
  const leader=ranked[0]||null;

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
      {currentMatches.length>0?(
        <div className="home-card">
          <div className="home-card-title">🔴 משחקים חיים</div>
          {currentMatches.map(({m,res,ko})=>{
            const real=res;
            const hasReal=real?.home!=null&&real?.away!=null;
            const kp=ko?(KO_POINTS[m.stage]||{dir:2,exact:5}):null;
            return(
              <div key={m.id} className="results-match-block">
                <MatchRow m={m} res={real} teamNames={teamNames} onClick={()=>onMatchClick(m,real)}/>
                <div className="rev-bets-row">
                  {participants.map(p=>{
                    const bet=ko?p.bets?.koMatches?.[m.id]:p.bets?.matches?.[m.id];
                    if(!bet||bet.home==null)return null;
                    const correct=hasReal&&getDir(+bet.home,+bet.away)===getDir(+real.home,+real.away);
                    const exact=correct&&+bet.home===+real.home&&+bet.away===+real.away;
                    const pts=hasReal?(ko?(exact?kp.exact:correct?kp.dir:0):(exact?3:correct?1:0)):null;
                    return(
                      <div key={p.uid} className={`rev-bet-chip ${exact?"exact":correct?"correct":hasReal?"wrong":""}`}>
                        <span className="chip-name">{p.name.split(" ")[0]}</span>
                        <span className="chip-score">{bet.away}:{bet.home}</span>
                        {bet.auto&&<span title="אוטומטי">🎲</span>}
                        {bet.adminEdited&&<span className="var-badge" title="שונה ע״י מנהל">📺VAR</span>}
                        {pts!==null&&<span className="chip-pts">{pts>0?`+${pts}נק׳`:"✗"}</span>}
                        {exact&&<span>🎯</span>}
                        {!exact&&correct&&<span>✓</span>}
                      </div>
                    );
                  })}
                </div>
                <MatchChat matchId={m.id} locked={isChatLocked(m.id,real)} me={me}/>
              </div>
            );
          })}
        </div>
      ):nextMatches.length>0&&(
        <div className="home-card">
          <div className="home-card-title">⏰ {nextMatches.length>1?"המשחקים הבאים":"המשחק הבא"}</div>
          {nextMatches.map((nm,i)=>(
            <div key={nm.id} className={i>0?"results-match-block":""}>
              <MatchRow m={nm} res={resFor(nm)} teamNames={teamNames} odds={odds} onClick={()=>onMatchClick(nm,resFor(nm))}/>
              <MatchChat matchId={nm.id} locked={isChatLocked(nm.id,resFor(nm))} me={me}/>
            </div>
          ))}
        </div>
      )}
      <div className="home-card">
        <div className="home-card-title">🏆 טבלת דירוג</div>
        <div className="prizes-row" style={{marginBottom:".6rem"}}>
          <span>👥 {participants.filter(p=>!p.isBot).length} שחקנים</span>
          <span>💰 {participants.filter(p=>!p.isBot).length*50} ₪ בקופה</span>
          <span>🥇 {participants.filter(p=>!p.isBot).length*50} ₪ ראשון</span>
          <span>🥈 מקום אחרון משלם 50₪</span>
        </div>
        <div className="lb-header">
          <span/><span/>
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
            const isLast=i===ranked.length-1&&ranked.length>1;
            const stripeColor=i===0?"#ffd700":i===1?"#4a9eff":isLast?"#ff4040":null;
            return(
              <div key={p.uid} className={`lb-row rank-${i+1}`} style={{position:'relative',borderTop:isLast?'2px dashed #5a7ba0':undefined}} onClick={()=>onSelectPlayer({...p,rank:i+1})}>
                {stripeColor&&<span style={{position:'absolute',right:0,top:0,bottom:0,width:'4px',background:stripeColor,borderRadius:'0 13px 13px 0'}}/>}
                <span className="lb-rank">{rankSymbol(ranked,i)}</span>
                <div className="lb-name-col">
                  {p.photoURL
                    ?<img src={p.photoURL} className="lb-avatar" alt="" style={{cursor:"zoom-in"}} onClick={e=>{e.stopPropagation();setZoomedPhoto(p.photoURL);}}/>
                    :<div className="lb-avatar-ph">{p.name[0]}</div>}
                  {(()=>{const {red,yellow}=getCardCounts(p,results);return(
                  <span className="lb-name">{p.name}
                    {Array.from({length:Math.min(red,5)}).map((_,idx)=><span key={"r"+idx} className="redcard" style={{marginRight:"3px",display:"inline-block"}}/>)}
                    {Array.from({length:Math.min(yellow,5)}).map((_,idx)=><span key={"y"+idx} className="yellowcard" style={{marginRight:"3px",display:"inline-block"}}/>)}
                  </span>
                  );})()}
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
                <span className="lb-score">
                  {p.score>0&&(()=>{const bd=calcScoreBreakdown(p.bets||{},results);return(<span className="lb-score-detail">🏠{bd.groups}·⚽{bd.matches}</span>);})()}
                  <span>{p.score>0?`${p.score} נק׳`:"—"}</span>
                </span>
              </div>
            );
          })}
          {ranked.length===0&&<div className="empty-msg">עדיין אין משתתפים</div>}
        </div>
        <div className="st-legend">
          <span className="st-legend-item"><span className="st-line-ind" style={{background:"#ffd700"}}/> מוק׳ ליגת האלופות</span>
          <span className="st-legend-item"><span className="st-line-ind" style={{background:"#4a9eff"}}/> מוק׳ קורנפלקס ליג</span>
          <span className="st-legend-item"><span className="st-line-ind" style={{background:"#ff4040"}}/> ירידה</span>
        </div>
      </div>
      <SpecialBetsCard participants={participants} results={results} teamNames={teamNames}
        funIran={funIran} funIsrael={funIsrael}
        onFunIranChange={setFunIran} onFunIsraelChange={setFunIsrael}
        onSaveFunBet={handleSaveFunBet} funSaving={funSaving}/>
      {zoomedPhoto&&(
        <div onClick={()=>setZoomedPhoto(null)} style={{
          position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",
          display:"flex",alignItems:"center",justifyContent:"center",
          zIndex:9999,cursor:"zoom-out",
        }}>
          <img src={zoomedPhoto} alt="" style={{width:"min(85vw,85vh)",height:"min(85vw,85vh)",borderRadius:"50%",objectFit:"cover",boxShadow:"0 0 40px rgba(0,0,0,.8)"}}/>
        </div>
      )}
    </div>
  );
}

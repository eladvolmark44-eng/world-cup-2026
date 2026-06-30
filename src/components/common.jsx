import { useState, useEffect, useRef } from "react";
import { collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";
import { GROUP_MATCHES, ALL_MATCH_DATES, MATCH_VENUE } from "../constants/tournament.js";
import { withFlag, isMatchLocked, formatKickoffTime, groupLabel, isStillLive } from "../utils/helpers.js";

export function MatchChat({matchId, locked, me}){
  const [messages,setMessages]=useState([]);
  const [text,setText]=useState("");
  const [sending,setSending]=useState(false);
  const listRef=useRef(null);

  useEffect(()=>{
    const q=query(collection(db,"mundial2026","game","matchChats",matchId,"messages"),orderBy("ts","asc"));
    return onSnapshot(q,snap=>setMessages(snap.docs.map(d=>({id:d.id,...d.data()}))));
  },[matchId]);

  useEffect(()=>{
    if(listRef.current) listRef.current.scrollTop=listRef.current.scrollHeight;
  },[messages.length]);

  const send=async()=>{
    const t=text.trim();
    if(!t||sending||!me?.uid)return;
    setSending(true);
    try{
      await addDoc(collection(db,"mundial2026","game","matchChats",matchId,"messages"),{
        uid:me.uid, name:me.name||"", photoURL:me.photoURL||null, text:t, ts:Date.now(),
      });
      setText("");
    }catch(e){/* ignore */}
    setSending(false);
  };

  return(
    <div className="match-chat">
      <div className="match-chat-hdr">💬 צ׳אט המשחק{locked&&<span className="match-chat-locked-tag">🔒 נעול</span>}</div>
      <div className="match-chat-list" ref={listRef}>
        {messages.map(m=>(
          <div key={m.id} className="match-chat-msg">
            {m.photoURL
              ?<img src={m.photoURL} className="match-chat-avatar" alt=""/>
              :<div className="match-chat-avatar-ph">{(m.name||"?")[0]}</div>}
            <div className="match-chat-body">
              <span className="match-chat-name">{m.name}{m.ts&&<span className="match-chat-time">{new Date(m.ts).toLocaleTimeString("he-IL",{hour:"2-digit",minute:"2-digit"})}</span>}</span>
              <span className="match-chat-text">{m.text}</span>
            </div>
          </div>
        ))}
        {!messages.length&&<div className="match-chat-empty">אין הודעות עדיין — היו הראשונים להגיב!</div>}
      </div>
      {!locked&&(
        <div className="match-chat-input-row">
          <input className="match-chat-input" value={text} placeholder="כתבו הודעה..."
            onChange={e=>setText(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter")send();}}/>
          <button className="match-chat-send" onClick={send} disabled={sending||!text.trim()}>➤</button>
        </div>
      )}
    </div>
  );
}

export function NumStepper({value,onChange,min=0,max=99,disabled=false}){
  return(
    <div className="stepper">
      <button disabled={disabled||value===null} onClick={()=>onChange(Math.max(min,(value??0)-1))}>−</button>
      <span>{value??'—'}</span>
      <button disabled={disabled} onClick={()=>onChange(value===null ? 0 : Math.min(max,value+1))}>+</button>
    </div>
  );
}

export function Toast({msg}){return msg?<div className="toast">{msg}</div>:null;}

export function SignInScreen({onSignIn,loading}){
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

export function DateNav({selectedDate,onChange,dates=ALL_MATCH_DATES}){
  const MONTHS=["","ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  const parseDate=s=>{const [d,m]=s.split('/');return new Date(2026,parseInt(m)-1,parseInt(d)).getTime();};
  const selMs=selectedDate?parseDate(selectedDate):0;
  const prevDate=dates.filter(d=>parseDate(d)<selMs).at(-1)||null;
  const nextDate=dates.find(d=>parseDate(d)>selMs)||null;
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

// External score APIs (ESPN/SofaScore/TheSportsDB/API-Football) have repeatedly failed to
// supply a usable live clock for this fixture set, even after fixing their parsing bugs —
// so once a match is live, fall back to a minute estimated from kickoff time rather than
// leaving the badge stuck on a bare "חי" indefinitely. Real data (res.minute) wins when present.
function estimateMinute(m, res){
  if(res?.minute) return `${res.minute}'`;
  if(!m?.kickoff) return null;
  const elapsed = Math.floor((Date.now() - new Date(m.kickoff).getTime()) / 60000);
  if(elapsed < 0) return null;
  return elapsed >= 90 ? "90+'" : `${Math.max(elapsed,1)}'`;
}

// Re-renders periodically so the kickoff-based minute estimate keeps ticking forward
// even when no new Firestore snapshot arrives.
function useLiveTick(active){
  const [,setTick]=useState(0);
  useEffect(()=>{
    if(!active)return;
    const id=setInterval(()=>setTick(t=>t+1), 30000);
    return ()=>clearInterval(id);
  },[active]);
}

export function MatchRow({m, res, teamNames, odds, onClick}){
  const hasRes = res?.home!=null && res?.away!=null;
  const isLive = isStillLive(m.id, res, m.kickoff);
  useLiveTick(isLive);
  const isDone = hasRes && !isLive;
  // Penalty shootout: when regulation is level, the winner is whoever has more pens.
  const penWin = res?.pens && +res.home===+res.away
    ? (+res.pens.home>+res.pens.away?"home":+res.pens.away>+res.pens.home?"away":null) : null;
  const homeWon = isDone && (+res?.home>+res?.away || penWin==="home");
  const awayWon = isDone && (+res?.away>+res?.home || penWin==="away");
  const locked = isMatchLocked(m.id, res);
  const homeName = m.home ? (teamNames?.[m.home]||m.home) : null;
  const awayName = m.away ? (teamNames?.[m.away]||m.away) : null;
  const matchOdds = !locked && !hasRes && odds ? odds[`${m.home}_${m.away}`] : null;
  const venue = MATCH_VENUE[m.id] || m.venue || null;
  return(
    <div className={`sched-row ${isLive?"sched-live":""} ${!locked&&!hasRes&&m.kickoff?"sched-open":""} ${onClick?"sched-clickable":""}`} onClick={onClick}>
      <div className="sched-date">
        {m.date&&`${m.date}${m.kickoff?` ${formatKickoffTime(m.kickoff)}`:""} · `}{m.group?groupLabel(m.group):m.stage||""}
        {isLive&&<span className="live-badge"> 🔴 {estimateMinute(m,res) || 'חי'}</span>}
        {isDone&&<span className="done-badge"> ✓ הסתיים</span>}
        {!locked&&!hasRes&&m.kickoff&&<span className="open-badge-sm"> ✏️ פתוח להימור</span>}
      </div>
      <div className="sched-teams">
        <span className={homeWon?"sched-winner":isLive&&+res.home>+res.away?"sched-winning":""}>{homeName?withFlag(homeName):<span className="sched-tbd">{m.homeLabel||"?"}</span>}{isLive&&res?.reds?.home>0&&<span className="rc-badge">{Array.from({length:Math.min(res.reds.home,3)}).map((_,i)=><span key={i} className="redcard"/>)}</span>}</span>
        {hasRes?<span dir="ltr" className={`sched-score ${isLive?"sched-score-live":""}`}>{res.away} – {res.home}</span>:<span className="sched-vs">vs</span>}
        <span className={awayWon?"sched-winner":isLive&&+res.away>+res.home?"sched-winning":""}>{isLive&&res?.reds?.away>0&&<span className="rc-badge">{Array.from({length:Math.min(res.reds.away,3)}).map((_,i)=><span key={i} className="redcard"/>)}</span>}{awayName?withFlag(awayName):<span className="sched-tbd">{m.awayLabel||"?"}</span>}</span>
      </div>
      {res?.pens&&<div className="sched-pens" dir="ltr">⚽ פנדלים {res.pens.away} – {res.pens.home}</div>}
      {venue&&<div className="sched-venue">🏟️ {venue}</div>}
      {matchOdds&&(
        <div className="match-odds" style={{marginTop:".3rem",marginBottom:0}}>
          <span className="odds-cell"><span className="odds-label">בית</span><span className="odds-val">{matchOdds.home}</span></span>
          <span className="odds-cell"><span className="odds-label">תיקו</span><span className="odds-val">{matchOdds.draw}</span></span>
          <span className="odds-cell"><span className="odds-label">חוץ</span><span className="odds-val">{matchOdds.away}</span></span>
          {matchOdds.ts&&<span className="odds-ts">עודכן {new Date(matchOdds.ts).toLocaleTimeString("he-IL",{hour:"2-digit",minute:"2-digit"})}</span>}
        </div>
      )}
    </div>
  );
}

// ─── LIVE BAR ─────────────────────────────────────────────────────────────────
export function LiveBar({results, teamNames}){
  const live=GROUP_MATCHES.filter(m=>isStillLive(m.id, results.matches?.[m.id]));
  useLiveTick(live.length>0);
  if(!live.length)return null;
  return(
    <div className="live-now-bar">
      {live.map(m=>{
        const res=results.matches[m.id];
        const minLabel=estimateMinute(m,res);
        return(
          <span key={m.id} className="live-now-item">
            🔴 {withFlag(teamNames?.[m.home]||m.home)} <b><span dir="ltr">{res.away}:{res.home}</span></b> {withFlag(teamNames?.[m.away]||m.away)}
            {minLabel?<span className="live-min"> {minLabel}</span>:null}
          </span>
        );
      })}
    </div>
  );
}

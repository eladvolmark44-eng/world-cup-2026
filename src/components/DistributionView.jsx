import { useState, useMemo } from "react";
import { GROUP_MATCHES } from "../constants/tournament.js";
import { getDir, isMatchLocked, buildKnockoutSchedule } from "../utils/helpers.js";

// Collect every REVEALED bet (match already locked + has a real result) as a flat list of
// {uid, name, isBot, betH, betA, realH, realA}. Unrevealed bets are excluded so this page
// never leaks a prediction before its match kicks off.
function collectRows(participants, results, teamNames){
  const koSched = buildKnockoutSchedule(results||{}, teamNames||{});
  const rows = [];
  for(const p of participants){
    for(const m of GROUP_MATCHES){
      const real = results.matches?.[m.id];
      if(!real || real.home==null || real.away==null) continue;
      if(!isMatchLocked(m.id, real)) continue;
      const bet = p.bets?.matches?.[m.id];
      if(!bet || bet.home==null || bet.away==null) continue;
      rows.push({uid:p.uid, name:p.name, isBot:!!p.isBot, betH:+bet.home, betA:+bet.away, realH:+real.home, realA:+real.away});
    }
    for(const k of koSched){
      if(!k.home || !k.away) continue;
      const real = k.res;
      if(!real || real.home==null || real.away==null) continue;
      if(!isMatchLocked(k.id, real, k.kickoff)) continue;
      const bet = p.bets?.koMatches?.[k.id];
      if(!bet || bet.home==null || bet.away==null) continue;
      rows.push({uid:p.uid, name:p.name, isBot:!!p.isBot, betH:+bet.home, betA:+bet.away, realH:+real.home, realA:+real.away});
    }
  }
  return rows;
}

const pct = (n,d)=> d>0 ? Math.round(n/d*100) : 0;

function StatBar({exact, dirOnly, miss}){
  const total = exact+dirOnly+miss || 1;
  return(
    <div className="dist-bar">
      {exact>0&&<div className="dist-seg seg-exact" style={{width:`${exact/total*100}%`}}/>}
      {dirOnly>0&&<div className="dist-seg seg-dir" style={{width:`${dirOnly/total*100}%`}}/>}
      {miss>0&&<div className="dist-seg seg-miss" style={{width:`${miss/total*100}%`}}/>}
    </div>
  );
}

export default function DistributionView({participants, results, teamNames}){
  const [tab, setTab] = useState("general");
  const rows = useMemo(()=>collectRows(participants, results, teamNames), [participants, results, teamNames]);

  const general = useMemo(()=>{
    let exact=0, dirOnly=0, miss=0;
    const dir = {home:{n:0,hit:0}, draw:{n:0,hit:0}, away:{n:0,hit:0}};
    const scoreMap = {}; // "h:a" -> {n, hit}
    for(const r of rows){
      const bd = getDir(r.betH, r.betA), rd = getDir(r.realH, r.realA);
      dir[bd].n++;
      if(bd===rd){ dir[bd].hit++; if(r.betH===r.realH && r.betA===r.realA) exact++; else dirOnly++; }
      else miss++;
      const key = `${r.betH}:${r.betA}`;
      const s = scoreMap[key] || (scoreMap[key]={n:0,hit:0});
      s.n++;
      if(r.betH===r.realH && r.betA===r.realA) s.hit++;
    }
    const scores = Object.entries(scoreMap).map(([k,v])=>({score:k,...v})).sort((a,b)=>b.n-a.n);
    return {total:rows.length, exact, dirOnly, miss, dir, scores};
  }, [rows]);

  const perPlayer = useMemo(()=>{
    const byUid = {};
    for(const r of rows){
      const s = byUid[r.uid] || (byUid[r.uid]={uid:r.uid, name:r.name, isBot:r.isBot, total:0, exact:0, dirOnly:0, miss:0});
      s.total++;
      const bd=getDir(r.betH,r.betA), rd=getDir(r.realH,r.realA);
      if(bd===rd){ if(r.betH===r.realH && r.betA===r.realA) s.exact++; else s.dirOnly++; }
      else s.miss++;
    }
    return Object.values(byUid).sort((a,b)=> (b.exact+b.dirOnly)/(b.total||1) - (a.exact+a.dirOnly)/(a.total||1));
  }, [rows]);

  if(rows.length===0) return(
    <div className="section">
      <h2>📊 התפלגות ניחושים</h2>
      <div className="nothing-revealed">
        <div style={{fontSize:"2.5rem"}}>📊</div>
        <p>עדיין אין ניחושים גלויים לניתוח</p>
        <p className="section-note">ההתפלגות תיחשף ככל שמשחקים מתחילים ומסתיימים</p>
      </div>
    </div>
  );

  const dirRow = (label, emoji, d)=>(
    <div className="dist-dir-row">
      <span className="dist-dir-label">{emoji} {label}</span>
      <div className="dist-linebar"><div className="dist-linebar-fill" style={{width:`${pct(d.n,general.total)}%`}}/></div>
      <span className="dist-dir-nums">{d.n} ({pct(d.n,general.total)}%) · {d.hit} פגעו</span>
    </div>
  );

  return(
    <div className="section">
      <h2>📊 התפלגות ניחושים</h2>
      <div className="sub-tabs">
        {[["general","🌍 כללי"],["players","👤 לפי שחקן"]].map(([k,l])=>(
          <button key={k} className={`sub-tab ${tab===k?"active":""}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {tab==="general"&&(
        <div className="scroll-area">
          <div className="dist-summary">
            <div className="dist-tile"><div className="dist-tile-num">{general.total}</div><div className="dist-tile-lbl">סה״כ ניחושים</div></div>
            <div className="dist-tile"><div className="dist-tile-num" style={{color:"var(--gold)"}}>{general.exact} <small>({pct(general.exact,general.total)}%)</small></div><div className="dist-tile-lbl">🎯 בול</div></div>
            <div className="dist-tile"><div className="dist-tile-num" style={{color:"var(--green)"}}>{general.dirOnly} <small>({pct(general.dirOnly,general.total)}%)</small></div><div className="dist-tile-lbl">✓ כיוון</div></div>
            <div className="dist-tile"><div className="dist-tile-num" style={{color:"var(--red)"}}>{general.miss} <small>({pct(general.miss,general.total)}%)</small></div><div className="dist-tile-lbl">✗ החטאה</div></div>
          </div>

          <div className="dist-block">
            <div className="dist-block-title">לפי כיוון</div>
            {dirRow("ניצחון בית","🏠",general.dir.home)}
            {dirRow("תיקו","🤝",general.dir.draw)}
            {dirRow("ניצחון חוץ","✈️",general.dir.away)}
          </div>

          <div className="dist-block">
            <div className="dist-block-title">תוצאות שהומרו הכי הרבה</div>
            {general.scores.slice(0,12).map(s=>(
              <div key={s.score} className="dist-score-row">
                <span className="dist-score-val" dir="ltr">{s.score}</span>
                <div className="dist-linebar"><div className="dist-linebar-fill" style={{width:`${pct(s.n,general.total)}%`}}/></div>
                <span className="dist-score-nums">{s.n} ({pct(s.n,general.total)}%) · {s.hit} פגעו</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="players"&&(
        <div className="scroll-area">
          <p className="section-note">ירוק = בול · צהוב = כיוון · אדום = החטאה. ממוין לפי אחוז פגיעה.</p>
          {perPlayer.map(s=>{
            const hits=s.exact+s.dirOnly;
            return(
              <div key={s.uid} className="dist-player-card">
                <div className="dist-player-head">
                  <span className="dist-player-name">{s.name}{s.isBot&&" 🤖"}</span>
                  <span className="dist-player-rate">{pct(hits,s.total)}% פגיעה</span>
                </div>
                <StatBar exact={s.exact} dirOnly={s.dirOnly} miss={s.miss}/>
                <div className="dist-player-nums">
                  <span>🎯 {s.exact} בול</span>
                  <span>✓ {s.dirOnly} כיוון</span>
                  <span>✗ {s.miss} החטאה</span>
                  <span className="dist-player-total">{s.total} ניחושים</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

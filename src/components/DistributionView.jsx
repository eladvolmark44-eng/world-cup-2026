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
    const scoreMap = {}; // "h:a" -> {n, hit}
    for(const r of rows){
      const bd = getDir(r.betH, r.betA), rd = getDir(r.realH, r.realA);
      const isExact = r.betH===r.realH && r.betA===r.realA;
      if(bd===rd){ if(isExact) exact++; else dirOnly++; }
      else miss++;
      const key = `${r.betH}:${r.betA}`;
      const s = scoreMap[key] || (scoreMap[key]={n:0,hit:0});
      s.n++;
      if(isExact) s.hit++;
    }
    const scores = Object.entries(scoreMap).map(([k,v])=>({score:k,...v})).sort((a,b)=>b.n-a.n);
    return {total:rows.length, exact, dirOnly, miss, scores};
  }, [rows]);

  const perPlayer = useMemo(()=>{
    const byUid = {};
    for(const r of rows){
      const s = byUid[r.uid] || (byUid[r.uid]={uid:r.uid, name:r.name, isBot:r.isBot, total:0, exact:0, dirOnly:0, miss:0, scores:{}});
      s.total++;
      const bd=getDir(r.betH,r.betA), rd=getDir(r.realH,r.realA);
      const isExact = r.betH===r.realH && r.betA===r.realA;
      if(bd===rd){ if(isExact) s.exact++; else s.dirOnly++; }
      else s.miss++;
      const key=`${r.betH}:${r.betA}`;
      const sc = s.scores[key] || (s.scores[key]={n:0,hit:0});
      sc.n++; if(isExact) sc.hit++;
    }
    return Object.values(byUid)
      .map(s=>({...s, scoreList:Object.entries(s.scores).map(([k,v])=>({score:k,...v})).sort((a,b)=>b.n-a.n)}))
      .sort((a,b)=> (b.exact+b.dirOnly)/(b.total||1) - (a.exact+a.dirOnly)/(a.total||1));
  }, [rows]);

  // Matrix: scoreline (rows, popularity-sorted) × player (columns) → how many times that
  // player predicted that scoreline. Shows at a glance who bets what.
  const matrix = useMemo(()=>{
    const players = perPlayer.map(p=>({uid:p.uid, name:p.name, isBot:p.isBot, total:p.total}));
    const cell = {}; let maxCell = 0;
    for(const r of rows){
      const ck = `${r.betH}:${r.betA}|${r.uid}`;
      cell[ck] = (cell[ck]||0)+1;
      if(cell[ck]>maxCell) maxCell = cell[ck];
    }
    return {players, cell, scores: general.scores, maxCell};
  }, [rows, perPlayer, general.scores]);

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

  return(
    <div className="section">
      <h2>📊 התפלגות ניחושים</h2>
      <div className="sub-tabs">
        {[["general","🌍 כללי"],["players","👤 לפי שחקן"],["matrix","🔢 מי הימר מה"]].map(([k,l])=>(
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
            <div className="dist-block-title">כל התוצאות שהומרו · {general.scores.length} תוצאות שונות</div>
            {general.scores.map(s=>(
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
                <div className="dist-pscores-title">כמה הימר מכל תוצאה (וכמה פגע):</div>
                <div className="dist-pscores">
                  {s.scoreList.map(sc=>(
                    <span key={sc.score} className={`dist-pscore-chip ${sc.hit>0?"has-hit":""}`}>
                      <b dir="ltr">{sc.score}</b> ×{sc.n}{sc.hit>0&&<span className="dist-pscore-hit"> · {sc.hit}🎯</span>}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab==="matrix"&&(
        <div className="scroll-area">
          <p className="section-note">כמה פעמים כל שחקן הימר כל תוצאה. ככל שהתא כהה/ירוק יותר — הימר אותה יותר.</p>
          <div className="dist-matrix-wrap">
            <table className="dist-matrix">
              <thead>
                <tr>
                  <th className="dist-mx-corner">תוצאה</th>
                  {matrix.players.map(p=>(
                    <th key={p.uid} className="dist-mx-phead" title={p.name}>{p.isBot?"🐒":p.name.split(" ")[0]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.scores.map(s=>(
                  <tr key={s.score}>
                    <td className="dist-mx-score" dir="ltr">{s.score}</td>
                    {matrix.players.map(p=>{
                      const n = matrix.cell[`${s.score}|${p.uid}`]||0;
                      const op = n>0 ? 0.18 + 0.82*(n/matrix.maxCell) : 0;
                      return(
                        <td key={p.uid} className="dist-mx-cell">
                          {n>0&&<span className="dist-mx-dot" style={{background:`rgba(0,216,127,${op})`}}>{n}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

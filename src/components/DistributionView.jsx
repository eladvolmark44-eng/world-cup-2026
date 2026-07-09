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
      rows.push({uid:p.uid, name:p.name, isBot:!!p.isBot, betH:+bet.home, betA:+bet.away, realH:+real.home, realA:+real.away, label:`${m.home} – ${m.away}`});
    }
    for(const k of koSched){
      if(!k.home || !k.away) continue;
      const real = k.res;
      if(!real || real.home==null || real.away==null) continue;
      if(!isMatchLocked(k.id, real, k.kickoff)) continue;
      const bet = p.bets?.koMatches?.[k.id];
      if(!bet || bet.home==null || bet.away==null) continue;
      rows.push({uid:p.uid, name:p.name, isBot:!!p.isBot, betH:+bet.home, betA:+bet.away, realH:+real.home, realA:+real.away, label:`${k.home} – ${k.away}`});
    }
  }
  return rows;
}

const pct = (n,d)=> d>0 ? Math.round(n/d*100) : 0;
// Order-independent scoreline key: 3:2 and 2:3 are the same result (home/away side doesn't
// matter for the distribution). Always higher:lower. "Hit" is still judged orientation-aware.
const scoreKey = (h,a)=> `${Math.max(h,a)}:${Math.min(h,a)}`;

export default function DistributionView({participants, results, teamNames}){
  const [tab, setTab] = useState("general");
  const [openScore, setOpenScore] = useState(null);
  const rows = useMemo(()=>collectRows(participants, results, teamNames), [participants, results, teamNames]);

  const general = useMemo(()=>{
    let exact=0, dirOnly=0, miss=0;
    const scoreMap = {}; // "h:a" -> {n, hit}
    for(const r of rows){
      const bd = getDir(r.betH, r.betA), rd = getDir(r.realH, r.realA);
      const isExact = r.betH===r.realH && r.betA===r.realA;
      if(bd===rd){ if(isExact) exact++; else dirOnly++; }
      else miss++;
      const key = scoreKey(r.betH, r.betA);
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
      const key=scoreKey(r.betH, r.betA);
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
    const cell = {}, cellHit = {}; let maxCell = 0;
    for(const r of rows){
      const ck = `${scoreKey(r.betH, r.betA)}|${r.uid}`;
      cell[ck] = (cell[ck]||0)+1;
      if(r.betH===r.realH && r.betA===r.realA) cellHit[ck] = (cellHit[ck]||0)+1;
      if(cell[ck]>maxCell) maxCell = cell[ck];
    }
    return {players, cell, cellHit, scores: general.scores, maxCell};
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
        {[["general","🌍 כללי"],["matrix","🔢 מי הימר מה"]].map(([k,l])=>(
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
            <p className="section-note" style={{marginTop:0}}>לחץ על תוצאה כדי לראות מי הימר אותה ובאיזה משחק</p>
            {general.scores.map(s=>{
              const open = openScore===s.score;
              const detail = open ? rows.filter(r=>scoreKey(r.betH,r.betA)===s.score) : [];
              return(
                <div key={s.score}>
                  <button className={`dist-score-row dist-score-btn ${open?"open":""}`} onClick={()=>setOpenScore(open?null:s.score)}>
                    <span className="dist-score-val" dir="ltr">{s.score}</span>
                    <div className="dist-linebar"><div className="dist-linebar-fill" style={{width:`${pct(s.n,general.total)}%`}}/></div>
                    <span className="dist-score-nums">{s.n} ({pct(s.n,general.total)}%) · {s.hit} פגעו</span>
                  </button>
                  {open&&(
                    <div className="dist-score-detail">
                      {detail.map((r,i)=>{
                        const exact = r.betH===r.realH && r.betA===r.realA;
                        return(
                          <div key={i} className="dist-detail-row">
                            <span className="dist-detail-name">{r.name}{r.isBot&&" 🐒"}</span>
                            <span className="dist-detail-match">{r.label}</span>
                            <span className="dist-detail-bet" dir="ltr">ניחש {r.betH}:{r.betA} · תוצאה {r.realH}:{r.realA}</span>
                            <span className={`dist-detail-mark ${exact?"ok":"no"}`}>{exact?"🎯":"✗"}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab==="matrix"&&(
        <div className="scroll-area">
          <p className="section-note">כל תא: <b>פגעו/הימרו</b> — המספר הבהיר משמאל = כמה בול, מתוך כמה שהימר. ככל שהתא ירוק יותר — הימר אותה יותר.</p>
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
                      const hit = matrix.cellHit[`${s.score}|${p.uid}`]||0;
                      const op = n>0 ? 0.18 + 0.82*(n/matrix.maxCell) : 0;
                      return(
                        <td key={p.uid} className="dist-mx-cell">
                          {n>0&&<span dir="ltr" className="dist-mx-dot" style={{background:`rgba(0,216,127,${op})`}}><b className={hit>0?"mx-hit":"mx-hit0"}>{hit}</b><span className="mx-slash">/{n}</span></span>}
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

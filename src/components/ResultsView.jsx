import { useState, useEffect, useMemo } from "react";
import { GROUPS_2026, GROUP_MATCHES, KO_POINTS, ALL_MATCH_DATES } from "../constants/tournament.js";
import {
  isGlobalLocked, isMatchLocked, getDir, withFlag, getDefaultMatchDate,
  computeGroupStandings, calcScore, canSeeMatchBet, canSeeGroupBet, canSeeSpecialBet, buildKnockoutSchedule
} from "../utils/helpers.js";
import { DateNav, MatchRow, LiveBar } from "./common.jsx";
import { MatchBetRow, PlayerBetsView } from "./BetForm.jsx";
import { KnockoutBracketView } from "./StandingsViews.jsx";

export function RevealedBetsView({participants, viewerUid, results, teamNames}){
  const [activePlayer, setActivePlayer] = useState(null);
  const [subTab, setSubTab] = useState("matches");
  const [revDate,setRevDate]=useState(getDefaultMatchDate);

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
                            {bet.auto&&<span title="אוטומטי">🎲</span>}
                            {bet.adminEdited&&<span className="var-badge" title="שונה ע״י מנהל">📺VAR</span>}
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
                        const hits=(picks[0]===correct[0]?1:0)+(picks[1]===correct[1]?1:0);
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

export default function ResultsView({participants, viewerUid, results, teamNames, me, onSaveMatch, onSaveKoMatch, onSaveBets, odds, subTab, setSubTab, onMatchClick}){
  const [revDate,setRevDate]=useState(getDefaultMatchDate);
  const [groupBets,setGroupBets]=useState(me?.bets?.groups||{});
  useEffect(()=>{setGroupBets(me?.bets?.groups||{});},[JSON.stringify(me?.bets?.groups)]);
  const globalLocked=isGlobalLocked();
  const dateMatches=GROUP_MATCHES.filter(m=>m.date===revDate);
  // Full knockout bracket — built once, then filtered to the selected day. Every fixture
  // shows (with TBD slots until its teams are known) and opens for betting once seated.
  const koSched=useMemo(()=>buildKnockoutSchedule(results, teamNames),[results, teamNames]);
  const koDateMatches=koSched.filter(m=>m.date===revDate);
  // Knockout kickoffs are bucketed in Israel time, which can roll a match onto a day not
  // in the static list — fold the actual fixture dates in so navigation never loses a match.
  const navDates=useMemo(()=>{
    const parse=s=>{const [d,m]=s.split('/');return new Date(2026,+m-1,+d).getTime();};
    const set=new Set(ALL_MATCH_DATES);
    koSched.forEach(m=>{ if(m.date) set.add(m.date); });
    return [...set].sort((a,b)=>parse(a)-parse(b));
  },[koSched]);
  const renderGroupMatch=(m)=>{
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
        <MatchRow m={m} res={real} teamNames={teamNames} onClick={onMatchClick?()=>onMatchClick(m,real):undefined}/>
        <div className="rev-bets-row">
          {participants.map(p=>{
            const bet=p.bets?.matches?.[m.id];
            if(!bet||bet.home==null)return null;
            const correct=hasReal&&getDir(+bet.home,+bet.away)===getDir(+real.home,+real.away);
            const exact=correct&&+bet.home===+real.home&&+bet.away===+real.away;
            const pts=hasReal?(exact?3:correct?1:0):null;
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
      </div>
    );
  };
  const renderKoMatch=(m)=>{
    const real=m.res;
    const hasReal=real?.home!=null&&real?.away!=null;
    const bothKnown=!!(m.home&&m.away);
    const started=m.kickoff?Date.now()>=new Date(m.kickoff).getTime():false;
    const locked=hasReal||real?.live||started;
    const pts=KO_POINTS[m.stage]||{dir:2,exact:5};
    if(!bothKnown){
      return(
        <div key={m.id} className="results-match-block">
          <MatchRow m={m} res={real} teamNames={teamNames}/>
        </div>
      );
    }
    if(!locked){
      return(
        <div key={m.id} className="results-match-block">
          <MatchBetRow match={m} savedBet={me?.bets?.koMatches?.[m.id]} onSave={onSaveKoMatch} teamNames={teamNames} odds={odds} res={real}/>
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
        <MatchRow m={m} res={real} teamNames={teamNames} onClick={onMatchClick?()=>onMatchClick(m,real):undefined}/>
        <div className="rev-bets-row">
          {participants.map(p=>{
            const bet=p.bets?.koMatches?.[m.id];
            if(!bet||bet.home==null)return null;
            const correct=hasReal&&getDir(+bet.home,+bet.away)===getDir(+real.home,+real.away);
            const exact=correct&&+bet.home===+real.home&&+bet.away===+real.away;
            const gained=hasReal?(exact?pts.exact:correct?pts.dir:0):null;
            return(
              <div key={p.uid} className={`rev-bet-chip ${exact?"exact":correct?"correct":hasReal?"wrong":""}`}>
                <span className="chip-name">{p.name.split(" ")[0]}</span>
                <span className="chip-score">{bet.away}:{bet.home}</span>
                {gained!==null&&<span className="chip-pts">{gained>0?`+${gained}נק׳`:"✗"}</span>}
                {exact&&<span>🎯</span>}
                {!exact&&correct&&<span>✓</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  // All matches for the selected day (group + knockout) interleaved and sorted by kickoff,
  // so e.g. a 20:00 game shows above a 23:30 one regardless of bracket order. Fixtures
  // without a known kickoff time yet sort to the end.
  const dayMatches=[
    ...dateMatches.map(m=>({m,type:"group"})),
    ...koDateMatches.map(m=>({m,type:"ko"})),
  ].sort((a,b)=>{
    const ta=a.m.kickoff?new Date(a.m.kickoff).getTime():Infinity;
    const tb=b.m.kickoff?new Date(b.m.kickoff).getTime():Infinity;
    return ta-tb;
  });
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
          <DateNav selectedDate={revDate} onChange={setRevDate} dates={navDates}/>
          {dayMatches.map(({m,type})=> type==="group"?renderGroupMatch(m):renderKoMatch(m))}
          {dayMatches.length===0&&<div className="empty-msg">No games on this date</div>}
        </>
      )}
      {subTab==="groups"&&(
        <div className="cg-grid">
          {!globalLocked&&<p className="section-note" style={{gridColumn:'1/-1'}}>בחר 2 קבוצות לכל בית · 2נק׳ למיקום מדויק | 5נק׳ לשני המיקומים המדויקים</p>}
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
                      const isLast=i===sorted.length-1;
                      return(
                        <tr key={t} className={`${q?'st-q':''} ${isLast?'st-relegate':''}`}>
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
                          const hits=(picks[0]===qualified[0]?1:0)+(picks[1]===qualified[1]?1:0);
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
      {subTab==="knockout"&&(
        <KnockoutBracketView results={results} teamNames={teamNames}/>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { GROUPS_2026, GROUP_MATCHES, REAL_TEAMS, MATCH_VENUE } from "../constants/tournament.js";
import { STRIKERS, STRIKER_FLAGS } from "../constants/players.js";
import {
  isMatchLocked, isGlobalLocked, getDir, withFlag, withStrikerFlag,
  formatKickoffTime, groupLabel, calcScore, canSeeGroupBet, canSeeMatchBet,
  canSeeSpecialBet, getDefaultMatchDate
} from "../utils/helpers.js";
import { NumStepper, DateNav } from "./common.jsx";

function GroupPicker({groupId,teams,picks,onChange,locked,teamNames}){
  const cur=picks||[];
  const toggle=t=>{
    if(locked)return;
    const count=cur.filter(x=>x===t).length;
    if(count===0&&cur.length<2)onChange([...cur,t]);
    else if(count===1&&cur.length<2)onChange([...cur,t]);
    else if(count===2)onChange([]);
    else onChange(cur.filter(x=>x!==t));
  };
  return(
    <div className="group-box">
      <div className="group-label">בית {groupId}</div>
      <div className="team-grid">
        {teams.map(t=>{
          const count=cur.filter(x=>x===t).length;
          const firstIdx=cur.indexOf(t);
          const resolved=teamNames?.[t]||t;
          const isUnknownPlayoff=resolved.startsWith("פלייאוף");
          const maxReached=cur.length>=2&&count===0;
          return(
            <button key={t} className={`team-btn ${count>0?"sel":""} ${locked||isUnknownPlayoff||maxReached?"locked":""} ${isUnknownPlayoff?"playoff-tbd":""}`} onClick={()=>toggle(t)} disabled={isUnknownPlayoff||maxReached}>
              {count===2&&<span className="badge">1+2</span>}
              {count===1&&firstIdx===0&&<span className="badge">1</span>}
              {count===1&&firstIdx===1&&<span className="badge">2</span>}
              {withFlag(resolved)}
            </button>
          );
        })}
      </div>
      {!locked&&cur.length<2&&<div className="hint">בחר {2-cur.length} עוד</div>}
    </div>
  );
}

export function MatchBetRow({match, savedBet, onSave, teamNames, odds, res}){
  const locked = isMatchLocked(match.id, res);
  const matchOdds = !locked && odds?.[`${match.home}_${match.away}`];
  const [h, setH] = useState(savedBet?.home ?? null);
  const [a, setA] = useState(savedBet?.away ?? null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
  const venue = MATCH_VENUE[match.id] || match.venue || null;
  return(
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
          {matchOdds.ts&&<span className="odds-ts">עודכן {new Date(matchOdds.ts).toLocaleTimeString("he-IL",{hour:"2-digit",minute:"2-digit"})}</span>}
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
      {venue&&<div className="sched-venue">🏟️ {venue}</div>}
    </div>
  );
}

export function PlayerBetsView({player,viewerUid,results,teamNames}){
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
        <div className="pbv-name">{player.name}{player.isBot&&<span className="bot-badge"> 🤖</span>}</div>
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
      {tab==="special"&&(()=>{
        const finished=GROUP_MATCHES.filter(m=>{
          const r=results.matches?.[m.id];
          return r?.home!=null&&r?.away!=null&&!r?.live;
        });
        let tot=0,nExact=0,nDir=0,nWrong=0,nMissed=0;
        for(const m of finished){
          const bet=bets.matches?.[m.id];
          const real=results.matches[m.id];
          if(!bet||bet.home==null){nMissed++;continue;}
          tot++;
          const isDir=getDir(+bet.home,+bet.away)===getDir(+real.home,+real.away);
          const isExact=isDir&&+bet.home===+real.home&&+bet.away===+real.away;
          if(isExact)nExact++;
          else if(isDir)nDir++;
          else nWrong++;
        }
        const pct=n=>tot>0?Math.round(n/tot*100):0;
        const can=canSeeSpecialBet(viewerUid,player.uid);
        return(
          <div className="scroll-area special-area">
            {finished.length>0&&(
              <div className="bet-stats-card">
                <div className="bet-stats-title">📊 סטטיסטיקת ניחושים</div>
                <div className="bet-stats-grid">
                  <div className="bsg-item bsg-exact">
                    <span className="bsg-num">{nExact}</span>
                    <span className="bsg-label">🎯 מדויק</span>
                    <span className="bsg-pct">{pct(nExact)}%</span>
                  </div>
                  <div className="bsg-item bsg-dir">
                    <span className="bsg-num">{nDir}</span>
                    <span className="bsg-label">✓ כיוון</span>
                    <span className="bsg-pct">{pct(nDir)}%</span>
                  </div>
                  <div className="bsg-item bsg-wrong">
                    <span className="bsg-num">{nWrong}</span>
                    <span className="bsg-label">✗ טעות</span>
                    <span className="bsg-pct">{pct(nWrong)}%</span>
                  </div>
                </div>
                <div className="bsg-bar" dir="ltr">
                  {nExact>0&&<div className="bsg-bar-exact" style={{flex:nExact}}/>}
                  {nDir>0&&<div className="bsg-bar-dir" style={{flex:nDir}}/>}
                  {nWrong>0&&<div className="bsg-bar-wrong" style={{flex:nWrong}}/>}
                </div>
                <div className="bsg-footer">מתוך {tot} ניחושים ({finished.length} משחקים, {nMissed} ללא ניחוש)</div>
              </div>
            )}
            {[
              {label:"🏆 אלופה",key:"champion",can},
              {label:"👟 מלך שערים",key:"goldenBoot",can},
              {label:"⚽ ניחוש שערים",key:"totalGoals",can},
            ].map(({label,key,can})=>(
              <div key={key} className="special-row">
                <label>{label}</label>
                <div className={`special-val ${!can?"hidden-val":""}`}>{can?(key==="goldenBoot"?withStrikerFlag(bets[key]):bets[key]||"—"):"🔒 יחשף בשריקת הפתיחה של המשחק הראשון"}</div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

export default function BetForm({user, onSave, onSaveMatch, onSaveKoMatch, koMatchesBet, teamNames, odds}){
  const [bets, setBets] = useState(user.bets||{});
  const [tab, setTab] = useState("groups");
  const [betDate,setBetDate]=useState(getDefaultMatchDate);
  const globalLocked = isGlobalLocked();

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
          <p className="section-note">⚡ 1נק׳ כיוון · +2נק׳ בול · נעילה בשריקת הפתיחה</p>
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
          <p className="section-note">💡 הקרוב ביותר לסך השערים מקבל 10 נק׳</p>
          {!globalLocked&&<button className="btn-green" onClick={()=>onSave(bets)}>💾 שמור</button>}
        </div>
      )}
    </div>
  );
}

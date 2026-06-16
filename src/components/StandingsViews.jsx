import { useState } from "react";
import { GROUPS_2026, GROUP_MATCHES, ALL_TEAMS, REAL_TEAMS } from "../constants/tournament.js";
import { withFlag, computeGroupStandings, getDefaultMatchDate } from "../utils/helpers.js";
import { DateNav, MatchRow } from "./common.jsx";

// Builds fake bracket data for a private "what would this look like" preview.
// Never written to Firestore — exists only in the caller's local state.
export function buildMockKnockoutPreview(){
  const teams=[...REAL_TEAMS].sort(()=>Math.random()-0.5);
  let p=0;
  const next=()=>teams[p++ % teams.length];
  const mk=(stage,n)=>Array.from({length:n}).map((_,i)=>({
    id:`mock_${stage}_${i}`, apiId:`mock_${stage}_${i}`, stage, home:next(), away:next(),
  }));
  const knockoutMatches=[
    ...mk("32 האחרונות",16), ...mk("שמינית גמר",8), ...mk("רבע גמר",4),
    ...mk("חצי גמר",2), ...mk("גמר",1), ...mk("מקום שלישי",1),
  ];
  const koResults={};
  knockoutMatches.forEach((m,i)=>{
    let home=Math.floor(Math.random()*4), away=Math.floor(Math.random()*4);
    if(home===away) home+=1;
    koResults[m.apiId]={home, away, live:i===1};
  });
  return {knockoutMatches, koResults};
}

export function ScheduleView({results,teamNames,odds}){
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

export function PlayoffEditor({playoffNames,onSave}){
  const [names,setNames]=useState(playoffNames||{});
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

export function GroupStandingsView({results, teamNames}){
  return(
    <>
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
          </div>
        );
      })}
    </div>
    <div className="st-legend">
      <span className="st-legend-item"><span className="st-line-ind" style={{background:"#ffd700"}}/> מוק׳ ליגת האלופות</span>
      <span className="st-legend-item"><span className="st-line-ind" style={{background:"#4a9eff"}}/> מוק׳ קורנפלקס ליג</span>
      <span className="st-legend-item"><span className="st-line-ind" style={{background:"#ff4040"}}/> ירידה</span>
    </div>
    </>
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

export function KnockoutBracketView({results, teamNames}){
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

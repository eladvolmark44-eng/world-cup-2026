import { useState, useEffect, useMemo, Fragment } from "react";
import { fetchMatchStats, fetchMatchDetail } from "../utils/api.js";
import { hePlayer, withFlag, isChatLocked } from "../utils/helpers.js";
import { MatchRow, MatchChat } from "./common.jsx";

const STATS_SECTIONS=[
  {title:"כללי",rows:[
    {key:"possession",label:"החזקת כדור",pct:true},
    {key:"corners",label:"קרנות"},
    {key:"offsides",label:"נבדלים"},
    {key:"bigChances",label:"יצירת מצבים מסוכנים"},
    {key:"attacks",label:"התקפות"},
  ]},
  {title:"בעיטות",rows:[
    {key:"xg",label:"שערים צפויים"},
    {key:"shotsOT",label:"בעיטות למסגרת"},
    {key:"shots",label:"בעיטות לשער"},
    {key:"blocked",label:"בעיטות שנעצרו"},
  ]},
  {title:"מסירות",rows:[
    {key:"passes",label:"מסירות שהושלמו"},
    {key:"passAcc",label:"דיוק מסירות",pct:true},
  ]},
  {title:"הגנה",rows:[
    {key:"tackles",label:"חטיפות"},
    {key:"saves",label:"הצלות שוער"},
  ]},
  {title:"עבירות",rows:[
    {key:"fouls",label:"עבירות"},
    {key:"yellows",label:"כרטיסים צהובים"},
    {key:"reds",label:"כרטיסים אדומים",alwaysShow:true},
  ]},
];

const DEMO_STATS={home:{possession:"65",xg:"1.42",shotsOT:"9",shots:"16",blocked:"6",saves:"0",corners:"3",offsides:"2",bigChances:"4",attacks:"150",fouls:"13",yellows:"1",reds:"0",passes:"509",passAcc:"89",tackles:"9"},away:{possession:"35",xg:"0.54",shotsOT:"9",shots:"9",blocked:"1",saves:"3",corners:"1",offsides:"1",bigChances:"1",attacks:"55",fouls:"17",yellows:"5",reds:"0",passes:"232",passAcc:"77",tackles:"10"}};

function StatsPanel({stats}){
  return(
    <div className="stats-panel">
      {STATS_SECTIONS.map(({title,rows})=>{
        const visible=rows.filter(({key})=>{
          const h=stats.home[key],a=stats.away[key];
          return h!=null||a!=null;
        });
        if(!visible.length)return null;
        return(
          <div key={title} className="stats-section">
            <div className="stats-section-title">{title}</div>
            {visible.map(({key,label,pct})=>{
              const hRaw=stats.home[key],aRaw=stats.away[key];
              const hv=parseFloat(hRaw)||0,av=parseFloat(aRaw)||0;
              const fmt=(v,raw)=>pct?`${Math.round(v)}%`:(raw!=null?String(raw):String(Math.round(v)));
              const hWin=hv>av,aWin=av>hv;
              return(
                <div key={key} className="stats-row">
                  <span className={`stats-val${hWin?" stats-val-win":""}`}>{fmt(hv,hRaw)}</span>
                  <span className="stats-label">{label}</span>
                  <span className={`stats-val${aWin?" stats-val-win":""}`}>{fmt(av,aRaw)}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function MatchStatsView({match, res, teamNames}){
  const [stats,setStats]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    fetchMatchStats(match).then(s=>{setStats(s);setLoading(false);});
  },[match.id]);
  const isDemo=!loading&&!stats;
  const displayStats=useMemo(()=>{
    if(loading)return null;
    const base=stats
      ?{home:{...stats.home},away:{...stats.away}}
      :{home:{...DEMO_STATS.home},away:{...DEMO_STATS.away}};
    if(res?.reds){
      base.home.reds=String(res.reds.home||0);
      base.away.reds=String(res.reds.away||0);
    }
    return base;
  },[stats,loading,res?.reds?.home,res?.reds?.away]);
  return(
    <div className="match-stats-page">
      <MatchRow m={match} res={res} teamNames={teamNames}/>
      {loading?(
        <div className="stats-loading">טוען סטטיסטיקות...</div>
      ):displayStats?(
        <>
          {isDemo&&<div className="stats-demo-note">נתונים לדוגמא בלבד</div>}
          <StatsPanel stats={displayStats}/>
        </>
      ):null}
    </div>
  );
}

export function MatchEvents({events,match,res}){
  if(!events.length)return<div className="mde-empty">אין אירועים זמינים</div>;
  const htGoalsHome=events.filter(e=>e.type==="goal"&&e.isHome&&e.time<=45).length;
  const htGoalsAway=events.filter(e=>e.type==="goal"&&!e.isHome&&e.time<=45).length;
  const htLabel=`מחצית ${htGoalsHome} - ${htGoalsAway}`;
  const firstSecondHalfIdx=events.findIndex(e=>e.time>45);
  return(
    <div className="mde-tl">
      {events.map((ev,i)=>{
        const showHT=firstSecondHalfIdx>0&&i===firstSecondHalfIdx;
        const min=ev.addedTime>0?`${ev.time}+${ev.addedTime}′`:`${ev.time}′`;
        const ph=hePlayer(ev.player);
        const poh=ev.playerOut?hePlayer(ev.playerOut):"";
        const ah=ev.assist?hePlayer(ev.assist):"";
        let icon;
        if(ev.type==="goal"){
          if(ev.cls==="ownGoal")icon=<span className="tl-goal-icon tl-og-icon">⚽<sup style={{fontSize:".5em",opacity:.8}}>OG</sup></span>;
          else if(ev.cls==="penalty")icon=<span className="tl-goal-icon tl-pen-icon">⚽<sup style={{fontSize:".5em",opacity:.8}}>P</sup></span>;
          else icon=<span className="tl-goal-icon">⚽</span>;
        }else if(ev.type==="card"){
          icon=<span className={`tl-card tl-card-${ev.cls}`}/>;
        }else if(ev.type==="substitution"){
          icon=<span className="tl-sub-badge"><span className="tl-in-arr">▲</span><span className="tl-out-arr">▼</span></span>;
        }else if(ev.type==="missedPenalty"){
          icon=<span className="tl-badge tl-miss">✕P</span>;
        }
        const makeContent=(isHome)=>{
          if(ev.type==="substitution"){
            const names=<div className="tl-sub-names"><span className="tl-name tl-name-in">{ph}</span>{poh&&<span className="tl-name tl-name-out">{poh}</span>}</div>;
            return isHome
              ?<div className="tl-ev tl-ev-home">{names}{icon}</div>
              :<div className="tl-ev tl-ev-away">{icon}{names}</div>;
          }
          const nameBlock=<div className="tl-name-block"><span className="tl-name">{ph}</span>{ah&&<span className="tl-assist">↳ {ah}</span>}</div>;
          return isHome
            ?<div className="tl-ev tl-ev-home">{nameBlock}{icon}</div>
            :<div className="tl-ev tl-ev-away">{icon}{nameBlock}</div>;
        };
        return(
          <Fragment key={i}>
            {showHT&&<div className="tl-ht"><span className="tl-ht-pill">{htLabel}</span></div>}
            <div className="tl-row">
              <div className="tl-side tl-side-home">{ev.isHome?makeContent(true):null}</div>
              <div className="tl-mid"><span className="tl-min">{min}</span></div>
              <div className="tl-side tl-side-away">{!ev.isHome?makeContent(false):null}</div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

export function MatchLineup({lineup,match,teamNames}){
  if(!lineup)return<div className="mde-empty">הרכב לא זמין עדיין</div>;
  const POS_ORDER={"G":0,"GK":0,"D":1,"DF":1,"M":2,"MF":2,"F":3,"FW":3};
  const sortPs=ps=>[...ps].sort((a,b)=>(POS_ORDER[a.position]??2)-(POS_ORDER[b.position]??2));
  const PlayerList=({players})=>players.map((p,i)=>(
    <div key={i} className="mdl-player">
      <span className="mdl-jersey">{p.jersey}</span>
      <span className="mdl-name">{hePlayer(p.name)}</span>
    </div>
  ));
  const homeS=sortPs(lineup.home?.starters||[]);const awayS=sortPs(lineup.away?.starters||[]);
  const homeSb=lineup.home?.subs||[];const awaySb=lineup.away?.subs||[];
  return(
    <div className="mdl-wrap">
      <div className="mdl-header-row">
        <div className="mdl-team-label">{withFlag(teamNames?.[match.home]||match.home)}</div>
        <div className="mdl-mid-label">הרכב פותח</div>
        <div className="mdl-team-label">{withFlag(teamNames?.[match.away]||match.away)}</div>
      </div>
      {(lineup.home?.formation||lineup.away?.formation)?<div className="mdl-formations"><span>{lineup.home?.formation}</span><span>{lineup.away?.formation}</span></div>:null}
      <div className="mdl-grid">
        <div className="mdl-col mdl-home"><PlayerList players={homeS}/></div>
        <div className="mdl-col mdl-away"><PlayerList players={awayS}/></div>
      </div>
      {(homeSb.length||awaySb.length)?<>
        <div className="mdl-subs-hdr">מחליפים</div>
        <div className="mdl-grid">
          <div className="mdl-col mdl-home"><PlayerList players={homeSb}/></div>
          <div className="mdl-col mdl-away"><PlayerList players={awaySb}/></div>
        </div>
      </>:null}
    </div>
  );
}

export default function MatchDetailView({match,res,teamNames,me}){
  const [tab,setTab]=useState("events");
  const [detail,setDetail]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    setLoading(true);setDetail(null);
    fetchMatchDetail(match).then(d=>{setDetail(d);setLoading(false);});
  },[match.id]);
  const displayStats=useMemo(()=>{
    if(!detail)return null;
    const base=detail.stats
      ?{home:{...detail.stats.home},away:{...detail.stats.away}}
      :{home:{...DEMO_STATS.home},away:{...DEMO_STATS.away}};
    if(res?.reds){base.home.reds=String(res.reds.home||0);base.away.reds=String(res.reds.away||0);}
    return base;
  },[detail,res?.reds?.home,res?.reds?.away]);
  return(
    <div className="match-stats-page">
      <MatchRow m={match} res={res} teamNames={teamNames}/>
      <div className="mdt-tabs">
        <button className={`mdt-tab${tab==="events"?" mdt-active":""}`} onClick={()=>setTab("events")}>⚽ אירועים</button>
        <button className={`mdt-tab${tab==="stats"?" mdt-active":""}`} onClick={()=>setTab("stats")}>📊 סטטיסטיקה</button>
        <button className={`mdt-tab${tab==="lineup"?" mdt-active":""}`} onClick={()=>setTab("lineup")}>👕 הרכב</button>
        <button className={`mdt-tab${tab==="chat"?" mdt-active":""}`} onClick={()=>setTab("chat")}>💬 צ׳אט</button>
      </div>
      {loading?(
        <div className="stats-loading">טוען...</div>
      ):(
        <div className="mdt-content">
          {tab==="events"&&<MatchEvents events={detail?.events||[]} match={match} res={res}/>}
          {tab==="stats"&&(displayStats?<StatsPanel stats={displayStats}/>:<div className="mde-empty">סטטיסטיקה לא זמינה</div>)}
          {tab==="lineup"&&<MatchLineup lineup={detail?.lineup} match={match} teamNames={teamNames}/>}
          {tab==="chat"&&<MatchChat matchId={match.id} locked={isChatLocked(match.id,res)} me={me}/>}
        </div>
      )}
    </div>
  );
}

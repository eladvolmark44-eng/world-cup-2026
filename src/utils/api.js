import { GROUP_MATCHES, GROUPS_2026 } from "../constants/tournament.js";
import { ODDS_PROXY_URL, ODDS_TTL_NORMAL, ODDS_TTL_CLOSE, ODDS_TTL_SOON, ODDS_TEAM_MAP, SOFA_TEAM_MAP, API_SOURCES, PROBE_TIMEOUT_MS } from "../constants/api.js";
import { hePlayer } from "./helpers.js";
import { db, saveGame } from "../firebase.js";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "firebase/firestore";

export let _koKickoffs=[];
export function setKoKickoffs(val){ _koKickoffs=val; }

// ── Player club lookup (for lineup club logos) ──────────────────────────────
// World Cup lineups only carry national-team rosters, so a player's club has
// to be fetched separately, per player, from ESPN's athlete profile. A
// player's club practically never changes mid-tournament, so the first
// lookup ever (by anyone) is written to Firestore and shared by everyone —
// every later viewer reads it straight from there instead of hitting ESPN
// again. localStorage just mirrors that for instant access within a session.
const CLUB_CACHE_KEY="wc2026_club_cache_v1";
let clubCache={};
try{ clubCache=JSON.parse(localStorage.getItem(CLUB_CACHE_KEY)||"{}"); }catch(e){}
const clubPending={};
let clubsSeeded=null;
function persistClubCache(){
  try{ localStorage.setItem(CLUB_CACHE_KEY,JSON.stringify(clubCache)); }catch(e){}
}
function seedClubsFromFirestore(){
  if(!clubsSeeded){
    clubsSeeded=(async()=>{
      try{
        const snap=await getDocs(collection(db,"mundial2026","game","playerClubs"));
        snap.forEach(d=>{ if(clubCache[d.id]===undefined) clubCache[d.id]=d.data(); });
        persistClubCache();
      }catch(e){}
    })();
  }
  return clubsSeeded;
}
export function fetchPlayerClub(athleteId){
  if(!athleteId) return Promise.resolve(null);
  if(clubCache[athleteId]!==undefined) return Promise.resolve(clubCache[athleteId]);
  if(clubPending[athleteId]) return clubPending[athleteId];
  const p=(async()=>{
    await seedClubsFromFirestore();
    if(clubCache[athleteId]!==undefined) return clubCache[athleteId];
    try{
      const r=await fetch(`https://site.api.espn.com/apis/common/v3/sports/soccer/athletes/${athleteId}`);
      const d=await r.json();
      const team=d?.athlete?.team||d?.team||null;
      const name=team?.displayName||team?.name||null;
      const logo=team?.logos?.[0]?.href||team?.logo||null;
      const result=(name||logo)?{name,logo}:null;
      clubCache[athleteId]=result;
      persistClubCache();
      if(result){ try{ await setDoc(doc(db,"mundial2026","game","playerClubs",String(athleteId)),result); }catch(e){} }
      return result;
    }catch(e){
      clubCache[athleteId]=null;
      persistClubCache();
      return null;
    }finally{
      delete clubPending[athleteId];
    }
  })();
  clubPending[athleteId]=p;
  return p;
}

export function hasMatchWithin30Min(){
  const n=Date.now();
  const relevant=t=>t>n-2*60*60*1000&&t<=n+30*60*1000;
  if(GROUP_MATCHES.some(m=>{if(!m.kickoff)return false;return relevant(new Date(m.kickoff).getTime());}))return true;
  return _koKickoffs.some(t=>relevant(t));
}
export function hasMatchWithin2Hours(){
  const n=Date.now();
  const relevant=t=>t>n-2*60*60*1000&&t<=n+2*60*60*1000;
  if(GROUP_MATCHES.some(m=>{if(!m.kickoff)return false;return relevant(new Date(m.kickoff).getTime());}))return true;
  return _koKickoffs.some(t=>relevant(t));
}

export function oddsHeb(n){ return ODDS_TEAM_MAP[n]||n; }

export const fdProxy=path=>`/api/fd-proxy?path=${encodeURIComponent(path)}`;
export const sofaProxy=path=>`/api/sofa-proxy?path=${encodeURIComponent(path)}`;

export function parseOddsData(fixtures){
  const map={};
  for(const f of fixtures){
    const homeH=oddsHeb(f.home_team), awayH=oddsHeb(f.away_team);
    let hS=0,dS=0,aS=0,cnt=0;
    for(const bk of (f.bookmakers||[])){
      const mkt=(bk.markets||[]).find(m=>m.key==="h2h");
      if(!mkt) continue;
      const hO=mkt.outcomes.find(o=>o.name===f.home_team);
      const dO=mkt.outcomes.find(o=>o.name==="Draw");
      const aO=mkt.outcomes.find(o=>o.name===f.away_team);
      if(hO&&dO&&aO){hS+=hO.price;dS+=dO.price;aS+=aO.price;cnt++;}
    }
    if(cnt>0){
      // Store both orderings so the lookup (which keys on GROUP_MATCHES' fixed
      // home/away order) still hits even when the feed lists the teams reversed.
      const ts=Date.now();
      map[`${homeH}_${awayH}`]={home:(hS/cnt).toFixed(2),draw:(dS/cnt).toFixed(2),away:(aS/cnt).toFixed(2),ts};
      map[`${awayH}_${homeH}`]={home:(aS/cnt).toFixed(2),draw:(dS/cnt).toFixed(2),away:(hS/cnt).toFixed(2),ts};
    }
  }
  return map;
}

export async function fetchOdds(){
  try{
    const ttl=hasMatchWithin30Min()?ODDS_TTL_SOON:hasMatchWithin2Hours()?ODDS_TTL_CLOSE:ODDS_TTL_NORMAL;
    const cached=localStorage.getItem("wc2026_odds_v1");
    if(cached){const{data,ts}=JSON.parse(cached);if(Date.now()-ts<ttl)return parseOddsData(data);}
    const ctrl=new AbortController();
    const t=setTimeout(()=>ctrl.abort(),8000);
    const res=await fetch(ODDS_PROXY_URL,{signal:ctrl.signal});
    clearTimeout(t);
    if(!res.ok) return {};
    const data=await res.json();
    if(Array.isArray(data)){localStorage.setItem("wc2026_odds_v1",JSON.stringify({data,ts:Date.now()}));return parseOddsData(data);}
    return {};
  }catch{return {};}
}

export function _probeDetail(body){
  if(!body) return null;
  if(body.error) return String(body.error);
  if(body.message) return String(body.message);
  if(body.errors){
    return Array.isArray(body.errors)
      ? body.errors.join("; ")
      : Object.entries(body.errors).map(([k,v])=>`${k}: ${v}`).join("; ");
  }
  return null;
}

export async function probeApiSource(src){
  const started=Date.now();
  try{
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),PROBE_TIMEOUT_MS);
    const res=await fetch(src.url(),{headers:src.headers?src.headers():{},signal:ctrl.signal});
    clearTimeout(timer);
    let body=null;
    try{body=await res.json();}catch{body=null;}
    const ms=Date.now()-started;
    if(src.classify) return {...src.classify(res.status,body),ms,httpStatus:res.status};
    if(res.status===401||res.status===403)
      return {level:"error",msg:"טוקן לא תקין / נגמרה מכסה",detail:_probeDetail(body),ms,httpStatus:res.status};
    if(res.status===429)
      return {level:"warn",msg:"חריגת קצב (rate limit)",detail:_probeDetail(body),ms,httpStatus:res.status};
    if(!res.ok)
      return {level:"error",msg:`HTTP ${res.status}`,detail:_probeDetail(body),ms,httpStatus:res.status};
    const count=src.count?src.count(body):0;
    if(count>0) return {level:"ok",msg:`תקין · ${count} רשומות`,ms,httpStatus:res.status};
    return {level:"warn",msg:"מגיב אך ריק (אולי אין משחקים כעת)",ms,httpStatus:res.status};
  }catch(e){
    return {level:"error",msg:e.name==="AbortError"?"timeout (לא הגיב)":`לא נגיש: ${e.message}`,ms:Date.now()-started};
  }
}

export async function fetchMatchStats(gm){
  const heb=n=>SOFA_TEAM_MAP[n]||n;
  const ymd=new Date(gm.kickoff||Date.now()).toISOString().slice(0,10).replace(/-/g,"");
  let espnEvents=[];
  try{
    const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${ymd}`);
    const d=await r.json();
    espnEvents=d.events||[];
  }catch(e){}
  const espnEv=espnEvents.find(e=>{
    const comp=e.competitions?.[0];
    const names=(comp?.competitors||[]).map(c=>heb(c.team?.displayName||""));
    return names.includes(gm.home)&&names.includes(gm.away);
  });
  if(espnEv?.id){
    try{
      const sr=await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${espnEv.id}`);
      const sd=await sr.json();
      const homeT=sd.boxscore?.teams?.find(t=>t.homeAway==="home");
      const awayT=sd.boxscore?.teams?.find(t=>t.homeAway==="away");
      if(homeT?.statistics?.length&&awayT?.statistics?.length){
        const g=(team,name)=>{const sv=team.statistics.find(s=>s.name===name);return sv?.displayValue??null;};
        const mk=t=>({possession:g(t,"possessionPct"),xg:g(t,"expectedGoals")??g(t,"xGoals"),shotsOT:g(t,"shotsOnTarget"),shots:g(t,"totalShots"),blocked:g(t,"blockedShots"),saves:g(t,"saves"),corners:g(t,"cornerKicks"),offsides:g(t,"offsides"),bigChances:g(t,"bigChances"),attacks:g(t,"totalAttacks"),fouls:g(t,"foulsCommitted"),yellows:g(t,"yellowCards"),reds:g(t,"redCards"),passes:g(t,"totalPasses")??g(t,"passes"),passAcc:g(t,"passAccuracyPct")??g(t,"passAccuracy"),tackles:g(t,"tackles")});
        return{home:mk(homeT),away:mk(awayT)};
      }
    }catch(e){}
  }
  try{
    const iso=new Date(gm.kickoff||Date.now()).toISOString().slice(0,10);
    const sr=await fetch(`https://api.sofascore.com/api/v1/sport/football/scheduled-events/${iso}`);
    const sd=await sr.json();
    const ev=(sd.events||[]).find(e=>heb(e.homeTeam?.name||"")===gm.home&&heb(e.awayTeam?.name||"")===gm.away);
    if(ev?.id){
      const statR=await fetch(`https://api.sofascore.com/api/v1/event/${ev.id}/statistics`);
      const statD=await statR.json();
      const all=statD.statistics?.find(s=>s.period==="ALL");
      if(all){
        const f=name=>{for(const grp of(all.groups||[])){const i=grp.statisticsItems?.find(x=>x.name===name);if(i)return i;}return null;};
        const poss=f("Ball possession"),xg=f("Expected goals"),shots=f("Total shots"),soT=f("Shots on target"),blk=f("Blocked shots"),sav=f("Goalkeeper saves"),corn=f("Corner kicks"),offs=f("Offsides"),bc=f("Big chances"),atk=f("Attacks"),fouls=f("Fouls"),yel=f("Yellow cards"),red=f("Red cards"),pass=f("Total passes")??f("Passes"),passA=f("Accurate passes %")??f("Pass accuracy"),tack=f("Tackles");
        const sv=(i,k)=>i?.[k]??null;
        return{home:{possession:sv(poss,"home"),xg:sv(xg,"home"),shotsOT:sv(soT,"home"),shots:sv(shots,"home"),blocked:sv(blk,"home"),saves:sv(sav,"home"),corners:sv(corn,"home"),offsides:sv(offs,"home"),bigChances:sv(bc,"home"),attacks:sv(atk,"home"),fouls:sv(fouls,"home"),yellows:sv(yel,"home"),reds:sv(red,"home"),passes:sv(pass,"home"),passAcc:sv(passA,"home"),tackles:sv(tack,"home")},away:{possession:sv(poss,"away"),xg:sv(xg,"away"),shotsOT:sv(soT,"away"),shots:sv(shots,"away"),blocked:sv(blk,"away"),saves:sv(sav,"away"),corners:sv(corn,"away"),offsides:sv(offs,"away"),bigChances:sv(bc,"away"),attacks:sv(atk,"away"),fouls:sv(fouls,"away"),yellows:sv(yel,"away"),reds:sv(red,"away"),passes:sv(pass,"away"),passAcc:sv(passA,"away"),tackles:sv(tack,"away")}};
      }
    }
  }catch(e){}
  return null;
}

export async function fetchMatchDetail(gm){
  const heb=n=>SOFA_TEAM_MAP[n]||n;
  const dt=new Date(gm.kickoff||Date.now());
  const ymd=dt.toISOString().slice(0,10).replace(/-/g,"");
  const prevDt=new Date(dt.getTime()-24*60*60*1000);
  const ymdPrev=prevDt.toISOString().slice(0,10).replace(/-/g,"");
  let stats=null,events=[],lineup=null;
  try{
    let espnEv=null;
    for(const d of [ymd,ymdPrev]){
      const sb=await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${d}`);
      const sbj=await sb.json();
      espnEv=(sbj.events||[]).find(e=>{
        const comp=e.competitions?.[0];
        const names=(comp?.competitors||[]).map(c=>heb(c.team?.displayName||""));
        return names.includes(gm.home)&&names.includes(gm.away);
      });
      if(espnEv?.id) break;
    }
    if(espnEv?.id){
      const sr=await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${espnEv.id}`);
      const sd=await sr.json();
      // Find which ESPN competitor is our "home" team
      const homeComp=espnEv.competitions[0].competitors.find(c=>heb(c.team?.displayName||"")===gm.home)
        ||espnEv.competitions[0].competitors.find(c=>c.homeAway==="home");
      const homeTeamId=homeComp?.team?.id;

      // Stats
      const homeT=sd.boxscore?.teams?.find(t=>t.homeAway==="home");
      const awayT=sd.boxscore?.teams?.find(t=>t.homeAway==="away");
      if(homeT?.statistics?.length&&awayT?.statistics?.length){
        const g=(team,name)=>{const sv=team.statistics.find(s=>s.name===name);return sv?.displayValue??null;};
        const mk=t=>({possession:g(t,"possessionPct"),xg:g(t,"expectedGoals")??g(t,"xGoals"),shotsOT:g(t,"shotsOnTarget"),shots:g(t,"totalShots"),blocked:g(t,"blockedShots"),saves:g(t,"saves"),corners:g(t,"cornerKicks"),offsides:g(t,"offsides"),bigChances:g(t,"bigChances"),attacks:g(t,"totalAttacks"),fouls:g(t,"foulsCommitted"),yellows:g(t,"yellowCards"),reds:g(t,"redCards"),passes:g(t,"totalPasses")??g(t,"passes"),passAcc:g(t,"passAccuracyPct")??g(t,"passAccuracy"),tackles:g(t,"tackles")});
        stats={home:mk(homeT),away:mk(awayT)};
      }

      // Events from keyEvents
      const tt=ev=>(ev.type?.text||"").toLowerCase();
      for(const ev of(sd.keyEvents||[])){
        const t=tt(ev);
        const isGoal=ev.scoringPlay===true||t==="goal"||t.includes("own goal");
        const isYellow=t.includes("yellow")&&!t.includes("second");
        const isRed=t==="red card"||t==="red-card"||t.includes("second yellow")||t.includes("red card");
        const isSub=t.includes("substitut");
        const isMissed=t.includes("missed")||t.includes("penalty - miss");
        if(!isGoal&&!isYellow&&!isRed&&!isSub&&!isMissed)continue;
        const parts=ev.participants||[];
        const getP=role=>parts.find(p=>(p.type?.text||"").toLowerCase().includes(role))?.athlete?.displayName||"";
        const clockStr=ev.clock?.displayValue||ev.clock?.value||"";
        const clockParts=String(clockStr).replace(/[^0-9:+]/g,"").split(/[+:]/);
        const min=parseInt(clockParts[0]||"0")||0;
        const addedMin=String(clockStr).includes("+")?parseInt(clockParts[clockParts.length-1]||"0")||0:0;
        const isHome=ev.team?.id===homeTeamId;
        let type="",cls="";
        if(isMissed){type="missedPenalty";cls="missed";}
        else if(isGoal){type="goal";cls=t.includes("own")?"ownGoal":t.includes("penalty")?"penalty":"regular";}
        else if(isYellow){type="card";cls="yellow";}
        else if(isRed){type="card";cls="red";}
        else if(isSub){type="substitution";}
        const player=isSub
          ?(getP("in")||getP("enter")||getP("on")||parts[0]?.athlete?.displayName||"")
          :(getP("scor")||getP("goal")||parts[0]?.athlete?.displayName||"");
        const assist=!isSub?getP("assist"):"";
        const playerOut=isSub?(getP("out")||getP("exit")||getP("off")||parts[1]?.athlete?.displayName||""):"";
        if(type)events.push({time:min,addedTime:addedMin,type,cls,player,assist,playerOut,isHome});
      }
      events.sort((a,b)=>a.time-b.time||(a.addedTime-b.addedTime));

      // Lineup — ESPN boxscore.players or rosters
      const rawLineup=sd.boxscore?.players||sd.rosters||[];
      if(rawLineup.length){
        const parseSide=homeAway=>{
          const td=rawLineup.find(t=>
            (t.team?.homeAway||t.homeAway)===homeAway||
            heb(t.team?.displayName||t.displayName||"")===(homeAway==="home"?gm.home:gm.away));
          const athletes=td?.athletes||td?.roster||[];
          const ps=athletes.map(a=>{
            const ath=a.athlete||a;
            return{
              name:ath.displayName||ath.fullName||"",
              jersey:ath.jersey||a.jersey||"",
              position:ath.position?.abbreviation||a.position||"M",
              starter:a.starter!=null?!!a.starter:!a.substitute,
              id:ath.id||a.id||"",
            };
          });
          return{formation:td?.formation||"",starters:ps.filter(p=>p.starter),subs:ps.filter(p=>!p.starter)};
        };
        const h=parseSide("home"),aw=parseSide("away");
        if(h.starters.length||aw.starters.length)lineup={home:h,away:aw};
      }
    }
  }catch(e){console.warn("fetchMatchDetail ESPN failed:",e.message);}
  return{stats,events,lineup};
}

// Fetches live match data (red cards + statistics) from ESPN, falls back to SofaScore for stats.
// setLiveStats: React setState callback for the stats panel; pass null to skip stats.
export async function syncMatchData(setLiveStats){
  try{
    const gameSnap=await getDoc(doc(db,"mundial2026","game"));
    const cur=gameSnap.exists()?gameSnap.data():{};
    const matches=cur.results?.matches||{};
    const nowMs=Date.now();
    const heb=n=>SOFA_TEAM_MAP[n]||n;

    const activeMatchIds=Object.entries(matches).filter(([id,m])=>{
      if(m.live)return true;
      if(m.home!=null){
        const gm=GROUP_MATCHES.find(g=>g.id===id);
        if(gm?.kickoff&&nowMs-new Date(gm.kickoff).getTime()<4*60*60*1000)return true;
      }
      return false;
    }).map(([id])=>id);

    // Always include the last completed match so stats are visible after final whistle
    const lastDone=GROUP_MATCHES
      .filter(gm=>matches[gm.id]?.home!=null&&!matches[gm.id]?.live)
      .sort((a,b)=>new Date(b.kickoff).getTime()-new Date(a.kickoff).getTime())[0];
    if(lastDone&&!activeMatchIds.includes(lastDone.id))activeMatchIds.push(lastDone.id);

    // Clear stale reds from completed (non-live) matches regardless of active match state
    const redUpdates={};
    for(const [matchId,m] of Object.entries(matches)){
      if(!m.live&&((m.reds?.home||0)>0||(m.reds?.away||0)>0)){
        redUpdates[`results.matches.${matchId}.reds`]={home:0,away:0};
      }
    }

    if(!activeMatchIds.length){
      if(Object.keys(redUpdates).length)await updateDoc(doc(db,"mundial2026","game"),redUpdates);
      return;
    }

    // Collect unique dates from active matches, fetch ESPN scoreboard per date
    const dateSet=new Set(activeMatchIds.map(id=>{
      const gm=GROUP_MATCHES.find(m=>m.id===id);
      return gm?.kickoff?new Date(gm.kickoff).toISOString().slice(0,10).replace(/-/g,""):null;
    }).filter(Boolean));
    // Always include today so live matches are covered
    dateSet.add(new Date().toISOString().slice(0,10).replace(/-/g,""));

    let espnEvents=[];
    for(const ymd of dateSet){
      try{
        const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${ymd}`);
        const d=await r.json();
        if(d.events?.length)espnEvents.push(...d.events);
      }catch(e){console.warn("ESPN scoreboard failed for",ymd,":",e.message);}
    }
    if(!espnEvents.length){
      if(Object.keys(redUpdates).length)await updateDoc(doc(db,"mundial2026","game"),redUpdates);
      return;
    }

    for(const matchId of activeMatchIds){
      const gm=GROUP_MATCHES.find(m=>m.id===matchId);
      if(!gm)continue;
      const espnEv=espnEvents.find(e=>{
        const comp=e.competitions?.[0];
        const names=(comp?.competitors||[]).map(c=>heb(c.team?.displayName||""));
        return names.includes(gm.home)&&names.includes(gm.away);
      });
      if(!espnEv?.id){console.warn("No ESPN event for",gm.home,"vs",gm.away);continue;}

      // Extract score from the already-fetched scoreboard response — no extra API call.
      // Only write when ESPN confirms the match is in-progress, and always set live:true
      // alongside the score so a match never appears "finished" with a score but no live flag.
      // We never write live:false here — syncScores owns the FT (post) transition.
      {
        const comp=espnEv.competitions?.[0];
        const isLiveOnEspn=comp?.status?.type?.name==="STATUS_IN_PROGRESS";
        if(isLiveOnEspn){
          const homeC=comp?.competitors?.find(c=>c.homeAway==="home");
          const awayC=comp?.competitors?.find(c=>c.homeAway==="away");
          const newHome=homeC?.score!=null?parseInt(homeC.score,10):null;
          const newAway=awayC?.score!=null?parseInt(awayC.score,10):null;
          const prev=matches[matchId]||{};
          if(newHome!=null&&newAway!=null&&(prev.home!==newHome||prev.away!==newAway||prev.live!==true)){
            redUpdates[`results.matches.${matchId}.home`]=newHome;
            redUpdates[`results.matches.${matchId}.away`]=newAway;
            redUpdates[`results.matches.${matchId}.live`]=true;
          }
        }
      }

      let sd=null;
      try{
        const sr=await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${espnEv.id}`);
        sd=await sr.json();
      }catch(e){console.warn("ESPN summary failed:",e.message);continue;}

      // Red cards — match only explicit "red card" type to avoid false positives
      // (e.g. event text may contain "red" for Yellow-Red double bookings or reversed decisions)
      const homeTeamId=espnEv.competitions[0].competitors.find(c=>c.homeAway==="home")?.team?.id;
      const reds={home:0,away:0};
      for(const ev of(sd.keyEvents||[])){
        const typeText=(ev.type?.text||"").toLowerCase();
        const isRedCard=typeText==="red card"||typeText==="red-card"||typeText==="red"||
                        (ev.type?.id&&(ev.type.id==="22"||ev.type.id==="83")); // ESPN type IDs for red/second-yellow
        if(!isRedCard)continue;
        if(ev.team?.id===homeTeamId)reds.home++; else reds.away++;
      }
      const prev=matches[matchId]?.reds||{home:0,away:0};
      if(reds.home!==prev.home||reds.away!==prev.away)
        redUpdates[`results.matches.${matchId}.reds`]=reds;

      // Statistics
      if(setLiveStats){
        const homeT=sd.boxscore?.teams?.find(t=>t.homeAway==="home");
        const awayT=sd.boxscore?.teams?.find(t=>t.homeAway==="away");
        if(homeT?.statistics?.length&&awayT?.statistics?.length){
          const g=(team,name)=>{const s=team.statistics.find(s=>s.name===name);return s?.displayValue??null;};
          const mkSide=t=>({
            possession:g(t,"possessionPct"),
            shotsOT:g(t,"shotsOnTarget"),
            shots:g(t,"totalShots"),
            blocked:g(t,"blockedShots"),
            saves:g(t,"saves"),
            corners:g(t,"cornerKicks"),
            offsides:g(t,"offsides"),
            fouls:g(t,"foulsCommitted"),
            yellows:g(t,"yellowCards"),
            passes:g(t,"totalPasses")??g(t,"passes"),
            passAcc:g(t,"passAccuracyPct")??g(t,"passAccuracy"),
            tackles:g(t,"tackles"),
          });
          setLiveStats(prev=>({...prev,[matchId]:{home:mkSide(homeT),away:mkSide(awayT)}}));
        } else {
          // SofaScore fallback for statistics
          try{
            const iso=new Date(gm.kickoff||Date.now()).toISOString().slice(0,10);
            const sr2=await fetch(`https://api.sofascore.com/api/v1/sport/football/scheduled-events/${iso}`);
            const sd2=await sr2.json();
            const ev=(sd2.events||[]).find(e=>heb(e.homeTeam?.name||"")===gm.home&&heb(e.awayTeam?.name||"")===gm.away);
            if(ev?.id){
              const statR=await fetch(`https://api.sofascore.com/api/v1/event/${ev.id}/statistics`);
              const statD=await statR.json();
              const all=statD.statistics?.find(s=>s.period==="ALL");
              if(all){
                const f=name=>{for(const grp of(all.groups||[])){const i=grp.statisticsItems?.find(x=>x.name===name);if(i)return i;}return null;};
                const poss=f("Ball possession"),shots=f("Total shots"),soT=f("Shots on target"),
                  blk=f("Blocked shots"),sav=f("Goalkeeper saves"),corn=f("Corner kicks"),
                  offs=f("Offsides"),fouls=f("Fouls"),yel=f("Yellow cards"),
                  pass=f("Total passes")??f("Passes"),passA=f("Accurate passes %")??f("Pass accuracy"),
                  tack=f("Tackles");
                const side=(item,k)=>item?.[k]??null;
                setLiveStats(prev=>({...prev,[matchId]:{
                  home:{possession:side(poss,"home"),shotsOT:side(soT,"home"),shots:side(shots,"home"),blocked:side(blk,"home"),saves:side(sav,"home"),corners:side(corn,"home"),offsides:side(offs,"home"),fouls:side(fouls,"home"),yellows:side(yel,"home"),passes:side(pass,"home"),passAcc:side(passA,"home"),tackles:side(tack,"home")},
                  away:{possession:side(poss,"away"),shotsOT:side(soT,"away"),shots:side(shots,"away"),blocked:side(blk,"away"),saves:side(sav,"away"),corners:side(corn,"away"),offsides:side(offs,"away"),fouls:side(fouls,"away"),yellows:side(yel,"away"),passes:side(pass,"away"),passAcc:side(passA,"away"),tackles:side(tack,"away")}
                }}));
              }
            }
          }catch(e){console.warn("SofaScore stats fallback failed:",e.message);}
        }
      }
    }
    if(Object.keys(redUpdates).length){
      await updateDoc(doc(db,"mundial2026","game"),redUpdates);
    }
  }catch(e){console.warn("syncMatchData failed:",e.message);}
}

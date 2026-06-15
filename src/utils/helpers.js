import { PLAYER_NAME_HE, findPlayerNameHe } from "../constants/playerNamesHe.js";
import { GROUPS_2026, GROUP_MATCHES, GROUP_LAST_MATCH, GROUP_STAGE_END_TS, TOURNAMENT_END, FLAG_MAP, KO_POINTS, ALL_MATCH_DATES } from "../constants/tournament.js";
import { STRIKER_FLAGS, STRIKER_API_NAMES, PLAYER_HEB } from "../constants/players.js";
import { PRESET_BETS_BY_NAME } from "../constants/game.js";

export function withFlag(name) {
  if (!name) return name;
  if (name.startsWith("פלייאוף")) return `❓ ${name}`;
  return FLAG_MAP[name] ? `${FLAG_MAP[name]} ${name}` : name;
}
export function formatKickoffTime(kickoff) {
  if (!kickoff) return "";
  const m = kickoff.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : "";
}
export function withStrikerFlag(name){ return name ? `${STRIKER_FLAGS[name]||""} ${name}`.trim() : "—"; }
export function apiNameToHeb(apiName){
  const norm=n=>n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
  const na=norm(apiName);
  for(const [heb,vs] of Object.entries(STRIKER_API_NAMES))
    if(vs.some(v=>norm(v)===na))return heb;
  return null;
}
// hePlayer: resolves English player name → Hebrew; checks imported map first, then local PLAYER_HEB, then STRIKER_API_NAMES
export function hePlayer(name){
  if(!name)return"";
  return PLAYER_NAME_HE[name]||findPlayerNameHe(name)||PLAYER_HEB[name]||apiNameToHeb(name)||name;
}

export function groupLabel(g){ return g==="יזיזות"?"⚽ יזיזות":`בית ${g}`; }
export function now() { return Date.now(); }

// matchRes = results.matches[matchId] — lock when match actually started, not by schedule
export function isMatchLocked(matchId, matchRes) {
  if (matchRes?.live === true || matchRes?.home != null) return true;
  // Safety fallback: 20min after scheduled kickoff in case sync is delayed
  const m = GROUP_MATCHES.find(g => g.id === matchId);
  return m?.kickoff ? now() >= new Date(m.kickoff).getTime() + 20*60*1000 : true;
}
export function isGlobalLocked() { return now() >= new Date("2026-06-11T22:00:00+03:00").getTime(); }
export function isGroupRevealed(group) { return now() >= new Date(GROUP_LAST_MATCH[group]).getTime(); }
export function isGroupStageOver() { return now() >= GROUP_STAGE_END_TS; }
export function isTournamentOver() { return now() >= new Date(TOURNAMENT_END).getTime(); }
export function canSeeMatchBet(matchId, viewerUid, ownerUid, results) {
  if (viewerUid === ownerUid) return true;
  return isMatchLocked(matchId, results?.matches?.[matchId]);
}
export function canSeeGroupBet(group, viewerUid, ownerUid) {
  return viewerUid === ownerUid || isGlobalLocked();
}
export function canSeeSpecialBet(viewerUid, ownerUid) {
  return viewerUid === ownerUid || isGlobalLocked();
}

export function getDir(h,a){if(+h>+a)return"home";if(+a>+h)return"away";return"draw";}
export function calcScore(bets={},results={},allP=[]){
  let t=0;
  // Group picks — only after group stage is fully over
  if(isGroupStageOver()){
    Object.keys(GROUPS_2026).forEach(g=>{
      const picks=bets.groups?.[g]||[],correct=results.groups?.[g]||[];
      const hits=picks.filter(x=>correct.includes(x)).length;
      if(hits===1)t+=2;if(hits===2)t+=5;
    });
  }
  // Match scores — always, based on whatever results exist
  GROUP_MATCHES.forEach(m=>{
    const bet=bets.matches?.[m.id],real=results.matches?.[m.id];
    if(!bet||!real||bet.home==null||bet.away==null||real.home==null||real.away==null)return;
    if(getDir(bet.home,bet.away)===getDir(real.home,real.away)){
      t+=1;if(+bet.home===+real.home&&+bet.away===+real.away)t+=2;
    }
  });
  // KO match bets — points depend on stage
  if(bets.koMatches && results.koResults){
    Object.keys(bets.koMatches).forEach(id=>{
      const bet=bets.koMatches[id];
      const real=results.koResults?.[id.replace("ko_","")];
      if(!bet||!real||bet.home==null||bet.away==null||real.home==null||real.away==null)return;
      const koMatch=(results.knockoutMatches||[]).find(m=>m.id===id);
      const pts=KO_POINTS[koMatch?.stage]||{dir:2,exact:5};
      if(getDir(bet.home,bet.away)===getDir(real.home,real.away)){
        t+=pts.dir; if(+bet.home===+real.home&&+bet.away===+real.away)t+=pts.exact;
      }
    });
  }
  // Champion, golden boot, total goals — only after tournament is over
  if(isTournamentOver()){
    if(bets.champion&&bets.champion===results.champion)t+=12;
    if(bets.goldenBoot&&results.goldenBoot&&bets.goldenBoot.trim().toLowerCase()===results.goldenBoot.trim().toLowerCase())t+=12;
    if(bets.totalGoals!=null&&results.actualTotalGoals!=null){
      const myD=Math.abs(+bets.totalGoals-+results.actualTotalGoals);
      const diffs=allP.map(p=>Math.abs((p.bets?.totalGoals??9999)-+results.actualTotalGoals));
      if(myD===Math.min(...diffs))t+=10;
    }
  }
  return t;
}

// Returns the display symbol for a player at position i in a sorted ranked array.
// Ties share the same symbol; last-place tie(s) get 🗑️ (unless everyone is tied).
export function rankSymbol(ranked, i){
  const MEDALS=["🥇","🥈","🥉"];
  const score=ranked[i].score;
  const minScore=ranked[ranked.length-1].score;
  const maxScore=ranked[0].score;
  if(maxScore===minScore) return MEDALS[0]||1; // all tied → all gold
  if(score===minScore) return "🗑️";           // last place (possibly shared)
  const rankPos=ranked.findIndex(p=>p.score===score); // first index with this score
  return MEDALS[rankPos]||(rankPos+1);
}

export function getPresetBets(displayName){
  if(!displayName)return{};
  const key=Object.keys(PRESET_BETS_BY_NAME).find(k=>displayName.includes(k));
  return key?PRESET_BETS_BY_NAME[key]:{};
}

export function timeAgo(ts){
  if(!ts)return"לא ידוע";
  const d=Date.now()-ts,m=Math.floor(d/60000);
  if(m<1)return"עכשיו";
  if(m<60)return`לפני ${m} דק׳`;
  const h=Math.floor(m/60);
  if(h<24)return`לפני ${h} שע׳`;
  const days=Math.floor(h/24);
  if(days===1)return"אתמול";
  return`לפני ${days} ימים`;
}

export function tsToLocal(ts){
  if(!ts)return"";
  const d=new Date(ts);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")
    +"T"+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
}

export function getLastCompletedMatchDay(results){
  for(let i=ALL_MATCH_DATES.length-1;i>=0;i--){
    const date=ALL_MATCH_DATES[i];
    const dayMs=GROUP_MATCHES.filter(m=>m.date===date);
    if(!dayMs.length)continue;
    const allDone=dayMs.every(m=>{const r=results?.matches?.[m.id];return r?.home!=null&&!r?.live;});
    if(allDone)return date;
  }
  return null;
}

export function getDefaultMatchDate(){
  const d=new Date();
  const todayStr=`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  if(ALL_MATCH_DATES.includes(todayStr))return todayStr;
  // snap to closest past date, or first future date if nothing in the past
  const todayMs=d.setHours(0,0,0,0);
  const parse=s=>{const [dd,mm]=s.split('/');return new Date(2026,parseInt(mm)-1,parseInt(dd)).getTime();};
  const past=ALL_MATCH_DATES.filter(s=>parse(s)<=todayMs);
  return past.length?past[past.length-1]:ALL_MATCH_DATES[0];
}

export function resizeImageToDataURL(file,size=120){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      const s=Math.min(img.width,img.height);
      const sx=(img.width-s)/2,sy=(img.height-s)/2;
      const canvas=document.createElement("canvas");
      canvas.width=size;canvas.height=size;
      canvas.getContext("2d").drawImage(img,sx,sy,s,s,0,0,size,size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg",0.75));
    };
    img.onerror=reject;
    img.src=url;
  });
}

export function computeGroupStandings(letter, matches) {
  const teams = GROUPS_2026[letter];
  const st = {};
  for (const t of teams) st[t] = {pts:0,w:0,d:0,l:0,gf:0,ga:0,gd:0,played:0};
  for (const m of GROUP_MATCHES.filter(gm=>gm.group===letter)) {
    const res = matches?.[m.id];
    if (res?.home==null) continue;
    const [h,a] = [res.home, res.away];
    st[m.home].played++; st[m.away].played++;
    st[m.home].gf+=h; st[m.home].ga+=a; st[m.home].gd+=h-a;
    st[m.away].gf+=a; st[m.away].ga+=h; st[m.away].gd+=a-h;
    if(h>a){st[m.home].pts+=3;st[m.home].w++;st[m.away].l++;}
    else if(h<a){st[m.away].pts+=3;st[m.away].w++;st[m.home].l++;}
    else{st[m.home].pts++;st[m.away].pts++;st[m.home].d++;st[m.away].d++;}
  }
  return st;
}

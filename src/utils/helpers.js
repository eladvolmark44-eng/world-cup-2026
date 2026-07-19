import { PLAYER_NAME_HE, findPlayerNameHe } from "../constants/playerNamesHe.js";
import { GROUPS_2026, GROUP_MATCHES, GROUP_LAST_MATCH, GROUP_STAGE_END_TS, TOURNAMENT_END, FLAG_MAP, KO_POINTS, ALL_MATCH_DATES, KO_BRACKET, THIRD_SEAT_OVERRIDE } from "../constants/tournament.js";
import { STRIKER_FLAGS, STRIKER_API_NAMES, PLAYER_HEB } from "../constants/players.js";
import { PRESET_BETS_BY_NAME, YELLOW_CARD_UID } from "../constants/game.js";

export function withFlag(name) {
  if (!name) return name;
  if (name.startsWith("פלייאוף")) return `❓ ${name}`;
  return FLAG_MAP[name] ? `${FLAG_MAP[name]} ${name}` : name;
}
// Show every kickoff in Israel time. Group fixtures carry an explicit +03:00 offset
// (so the literal HH:MM is already Israel time), but ESPN knockout fixtures come in
// UTC ("…Z") — extracting the literal hour showed them 3h early. Parse the instant
// and format it in Asia/Jerusalem so both sources display correctly.
export function formatKickoffTime(kickoff) {
  if (!kickoff) return "";
  const d = new Date(kickoff);
  if (isNaN(d.getTime())) { const m = kickoff.match(/T(\d{2}:\d{2})/); return m ? m[1] : ""; }
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
}
// Israel-local DD/MM for an ISO instant — used to bucket knockout fixtures onto the
// correct calendar day (a late US kickoff rolls into the next day Israel time).
export function israelDateDM(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit" }).formatToParts(d);
  const dd = p.find(x=>x.type==="day")?.value, mm = p.find(x=>x.type==="month")?.value;
  return dd && mm ? `${dd}/${mm}` : null;
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
// Match chat: open from the moment a match is shown, locked 5min after it actually ended
export function isChatLocked(matchId, matchRes) {
  if (!matchRes || matchRes.home == null || matchRes.live) return false;
  if (matchRes.endedAt) return now() >= matchRes.endedAt + 5 * 60 * 1000;
  return true; // finished with no recorded end time (legacy) — treat as already locked
}
export function isMatchLocked(matchId, matchRes, kickoff) {
  if (matchRes?.live === true || matchRes?.home != null) return true;
  // Group matches: lock 20min after scheduled kickoff (safety fallback when sync is delayed).
  const m = GROUP_MATCHES.find(g => g.id === matchId);
  if (m?.kickoff) return now() >= new Date(m.kickoff).getTime() + 20*60*1000;
  // Knockout matches aren't in GROUP_MATCHES — lock at their kickoff when provided.
  if (kickoff) return now() >= new Date(kickoff).getTime();
  return true;
}
export function isGlobalLocked() { return now() >= new Date("2026-06-11T22:00:00+03:00").getTime(); }

// Hard safety ceiling: a group-stage match (90 min, no extra time) can never realistically
// still be live more than 3h after kickoff. The live-data sync has repeatedly been fooled by
// flaky third-party APIs into leaving (or flipping back) a finished match's live flag to true —
// this overrides that regardless of what's stored, so the UI never gets stuck showing "live".
const MAX_LIVE_MS = 3 * 60 * 60 * 1000;
export function isStillLive(matchId, matchRes, kickoff) {
  if (matchRes?.live !== true) return false;
  const m = GROUP_MATCHES.find(g => g.id === matchId);
  // Group matches: 3h ceiling. Knockout (not in GROUP_MATCHES) can have extra time +
  // penalties, so allow 4.5h from the fixture's kickoff when we know it; never "forever".
  const ko = !m;
  const k = m?.kickoff || kickoff;
  if (!k) return ko ? false : true;
  return now() < new Date(k).getTime() + (ko ? 4.5*60*60*1000 : MAX_LIVE_MS);
}

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
export function calcScore(bets={},results={},allP=[],uid=null){
  let t=0;
  // Group picks — award per group as each group's results become known
  Object.keys(GROUPS_2026).forEach(g=>{
    const correct=results.groups?.[g];
    if(!correct?.length) return;
    const picks=bets.groups?.[g]||[];
    const hits=(picks[0]===correct[0]?1:0)+(picks[1]===correct[1]?1:0);
    if(hits===1)t+=2;if(hits===2)t+=5;
  });
  // Match scores — always, based on whatever results exist
  GROUP_MATCHES.forEach(m=>{
    const bet=bets.matches?.[m.id],real=results.matches?.[m.id];
    if(!bet||!real||bet.home==null||bet.away==null||real.home==null||real.away==null)return;
    if(getDir(bet.home,bet.away)===getDir(real.home,real.away)){
      t+=1;if(+bet.home===+real.home&&+bet.away===+real.away)t+=2;
    }
  });
  // KO match bets — keyed by bracket id (M73..M104); score against the resolved bracket
  // (teams seated + result mapped to a stable slot order). Points depend on stage.
  // Build the knockout schedule once — reused for KO bet scoring and champion derivation.
  const tournamentOver = isTournamentOver();
  const koSched = (bets.koMatches || tournamentOver) ? buildKnockoutSchedule(results, {}) : null;
  if(bets.koMatches){
    const koById={};
    for(const k of koSched) koById[k.id]=k;
    Object.keys(bets.koMatches).forEach(id=>{
      const bet=bets.koMatches[id];
      const km=koById[id];
      const real=km?.res;
      // Score knockout bets live too (like group matches) so the leaderboard total
      // moves as goals go in — not only once the match is final.
      if(!bet||!real||bet.home==null||bet.away==null||real.home==null||real.away==null)return;
      const pts=KO_POINTS[km.stage]||{dir:2,exact:5};
      if(getDir(bet.home,bet.away)===getDir(real.home,real.away)){
        // Exact score awards pts.exact as the TOTAL (not on top of pts.dir).
        t += (+bet.home===+real.home && +bet.away===+real.away) ? pts.exact : pts.dir;
      }
    });
  }
  // Champion, golden boot, total goals — only after tournament is over. Champion/golden boot
  // derive automatically (final result / synced top scorer) so no manual step is needed.
  if(tournamentOver){
    const champ=getChampion(results, koSched);
    if(bets.champion&&champ&&bets.champion===champ)t+=12;
    const boot=getGoldenBoot(results);
    if(bets.goldenBoot&&boot&&bets.goldenBoot.trim().toLowerCase()===boot.trim().toLowerCase())t+=12;
    if(bets.totalGoals!=null&&results.actualTotalGoals!=null){
      const myD=Math.abs(+bets.totalGoals-+results.actualTotalGoals);
      const diffs=allP.map(p=>Math.abs((p.bets?.totalGoals??9999)-+results.actualTotalGoals));
      if(myD===Math.min(...diffs))t+=10;
    }
  }
  // Admin-applied penalties (e.g. 2 pts for skipping a shared match screening), keyed by uid.
  if(uid) t -= results.penalties?.[uid] || 0;
  return t;
}

// Per-category point breakdown (mirrors calcScore): 🏠 group-position picks, ⚽ group
// matches, 🏆 knockout matches, plus champion / golden-boot / total-goals once decided.
export function calcScoreBreakdown(bets={},results={},allP=[],uid=null){
  let groups=0,matches=0,knockout=0,champion=0,goldenBoot=0,totalGoals=0;
  const penalty = uid ? (results.penalties?.[uid] || 0) : 0;
  Object.keys(GROUPS_2026).forEach(g=>{
    const correct=results.groups?.[g];
    if(!correct?.length) return;
    const picks=bets.groups?.[g]||[];
    const hits=(picks[0]===correct[0]?1:0)+(picks[1]===correct[1]?1:0);
    if(hits===1)groups+=2;if(hits===2)groups+=5;
  });
  GROUP_MATCHES.forEach(m=>{
    const bet=bets.matches?.[m.id],real=results.matches?.[m.id];
    if(!bet||!real||bet.home==null||bet.away==null||real.home==null||real.away==null)return;
    if(getDir(bet.home,bet.away)===getDir(real.home,real.away)){
      matches+=1;if(+bet.home===+real.home&&+bet.away===+real.away)matches+=2;
    }
  });
  const tournamentOver = isTournamentOver();
  const koSched = (bets.koMatches || tournamentOver) ? buildKnockoutSchedule(results, {}) : null;
  if(bets.koMatches){
    const koById={};
    for(const k of koSched) koById[k.id]=k;
    Object.keys(bets.koMatches).forEach(id=>{
      const bet=bets.koMatches[id], real=koById[id]?.res;
      if(!bet||!real||bet.home==null||bet.away==null||real.home==null||real.away==null)return;
      const pts=KO_POINTS[koById[id].stage]||{dir:2,exact:5};
      if(getDir(bet.home,bet.away)===getDir(real.home,real.away)){
        knockout += (+bet.home===+real.home && +bet.away===+real.away) ? pts.exact : pts.dir;
      }
    });
  }
  if(tournamentOver){
    const champ=getChampion(results, koSched);
    if(bets.champion&&champ&&bets.champion===champ)champion+=12;
    const boot=getGoldenBoot(results);
    if(bets.goldenBoot&&boot&&bets.goldenBoot.trim().toLowerCase()===boot.trim().toLowerCase())goldenBoot+=12;
    if(bets.totalGoals!=null&&results.actualTotalGoals!=null){
      const myD=Math.abs(+bets.totalGoals-+results.actualTotalGoals);
      const diffs=allP.map(p=>Math.abs((p.bets?.totalGoals??9999)-+results.actualTotalGoals));
      if(diffs.length&&myD===Math.min(...diffs))totalGoals+=10;
    }
  }
  return {groups,matches,knockout,champion,goldenBoot,totalGoals,penalty};
}

// Seats the 8 best third-placed teams into the 8 Round-of-32 fixtures that have a "3RD"
// slot, respecting each slot's eligible-groups list (FIFA's allocation constraint). Returns
// { [matchId]: thirdPlaceTeamName }. Empty until the group stage is complete (all 12 thirds
// ranked). The seating is a constraint-valid bipartite matching; ESPN's published draw, when
// available, overrides it in buildKnockoutSchedule. Either way the bet is on the scoreline of
// "group-winner vs 3rd", so the exact 3rd-place identity never affects betting or scoring.
export function assignThirdPlace(results={}, nameOf=(t=>t)){
  const all = bestThirdPlace(results);
  if(all.filter(t=>t.qualified).length < 8) return {};
  // Third-placed team for every finished group (used for the pinned seatings, which
  // we trust even if the auto-ranking and the stored data momentarily disagree).
  const teamByGroup = {}; all.forEach(t=>{ teamByGroup[t.group]=nameOf(t.team); });
  // Groups whose third advanced, per the live ranking — used only for the matching.
  const qualGroups = all.filter(t=>t.qualified).map(t=>t.group);

  const out = {};
  const usedGroups = new Set();
  const usedSlots = new Set();
  // Apply the confirmed official FIFA seatings first (the generic matching below
  // only finds *a* valid assignment, not necessarily FIFA's). These are pinned
  // unconditionally — they are the ground-truth draw — then we match the rest.
  for(const [mid, g] of Object.entries(THIRD_SEAT_OVERRIDE)){
    if(teamByGroup[g]){ out[mid]=teamByGroup[g]; usedGroups.add(g); usedSlots.add(mid); }
  }

  const slots = KO_BRACKET
    .filter(m=>m.slots.some(s=>s.t==="3RD") && !usedSlots.has(m.id))
    .map(m=>({id:m.id, eligible:m.slots.find(s=>s.t==="3RD").g}));
  // Bipartite matching (Kuhn's): each remaining slot ↔ remaining qualifying groups.
  const adj = slots.map(s=> s.eligible.filter(g=>qualGroups.includes(g) && !usedGroups.has(g)).slice().sort());
  const groupToSlot = {}; // group letter -> slot index
  const augment = (si, seen) => {
    for(const g of adj[si]){
      if(seen.has(g)) continue;
      seen.add(g);
      if(groupToSlot[g]===undefined || augment(groupToSlot[g], seen)){ groupToSlot[g]=si; return true; }
    }
    return false;
  };
  for(let i=0;i<slots.length;i++) augment(i, new Set());
  for(const [g,si] of Object.entries(groupToSlot)) out[slots[si].id]=teamByGroup[g];
  return out;
}

// Builds the full knockout fixture list (M73-M104) from KO_BRACKET, resolving each
// match's teams as they become known: R32 from group results, 3rd-place + later rounds
// from the actual ESPN fixtures (matched by a known team), winners propagated forward.
// Returns MatchRow-compatible objects with {home, away, homeLabel, awayLabel, res}.
export function buildKnockoutSchedule(results={}, teamNames={}){
  const espn = results.knockoutMatches||[];
  const koResults = results.koResults||{};
  const nameOf = t => teamNames?.[t]||t;
  const byStage = {};
  espn.forEach(e=>{ (byStage[e.stage] ||= []).push(e); });

  const resolved = {}; // matchId -> {winnerTeam, loserTeam}
  const out = [];
  // Computed third-place seating (matchId -> 3rd-place team) once the group stage is done,
  // so the 8 third-place R32 fixtures open immediately instead of waiting for ESPN's draw.
  const thirdByMatch = assignThirdPlace(results, nameOf);

  const resolveSlotTeam = (slot, matchId) => {
    if(slot.t==="W"||slot.t==="RU"){
      const pair=results.groups?.[slot.g];
      if(pair?.length) return {team: nameOf(slot.t==="W"?pair[0]:pair[1])};
      return {label:`${slot.t==="W"?"מנצחת":"סגנית"} בית ${slot.g}`};
    }
    if(slot.t==="3RD"){
      const t=thirdByMatch[matchId];
      if(t) return {team:t};
      return {label:`שלישית ${slot.g.join("/")}`};
    }
    if(slot.t==="WM"){ const r=resolved[slot.m]; return r?.winnerTeam?{team:r.winnerTeam}:{label:`מנצחת ${slot.m}`}; }
    if(slot.t==="LM"){ const r=resolved[slot.m]; return r?.loserTeam?{team:r.loserTeam}:{label:`מפסידה ${slot.m}`}; }
    return {label:"—"};
  };

  for(const bm of KO_BRACKET){
    const c0=resolveSlotTeam(bm.slots[0], bm.id), c1=resolveSlotTeam(bm.slots[1], bm.id);
    let home=c0.team||null, away=c1.team||null;
    let homeLabel=c0.label||null, awayLabel=c1.label||null;
    // Base date/time from the hardcoded official schedule (Israel time) so every fixture
    // — even ones still TBD — shows a kickoff; ESPN overrides below if/when it has it.
    let res=null, kickoff=bm.kickoff||null, venue=bm.venue, date=bm.date;

    // Find the actual ESPN fixture for this bracket slot.
    const known=[home,away].filter(Boolean);
    let ef=null, apiId=null;
    const pool=byStage[bm.stage]||[];
    if(known.length===2){
      // Both teams known → a pair meets exactly once in single-elimination, so match by the
      // team-pair across ALL knockout fixtures regardless of stage label. This makes the
      // result show even if the sync stored the fixture under a mis-detected/placeholder
      // stage (which otherwise leaves the match visible but with no score).
      ef = espn.find(e=>known.every(k=>e.home===k||e.away===k));
    }
    if(!ef && known.length){
      // Fallback: only one team known → search within the correct stage (a lone team recurs
      // across rounds, so matching it tournament-wide could pick the wrong round).
      ef = pool.find(e=>known.every(k=>e.home===k||e.away===k)) || pool.find(e=>known.some(k=>e.home===k||e.away===k));
    }
    if(ef){
      apiId=ef.apiId;
      if(ef.kickoff){ kickoff=ef.kickoff; const dm=israelDateDM(ef.kickoff); if(dm) date=dm; }
      if(ef.venue) venue=ef.venue;
      // Preserve a STABLE slot order (home=slot0, away=slot1) so a bet's home/away never
      // flips when ESPN later publishes the fixture in the opposite orientation. Fill only
      // the unknown side from the ESPN pairing.
      const efTeams=[ef.home, ef.away];
      if(home && !away){ away=efTeams.find(t=>t!==home)||null; awayLabel=null; }
      else if(away && !home){ home=efTeams.find(t=>t!==away)||null; homeLabel=null; }
      else if(!home && !away){ home=ef.home; away=ef.away; homeLabel=null; awayLabel=null; }
      const r=koResults[ef.apiId];
      if(r){
        // Map the ESPN result (ef.home/ef.away order) onto our slot order.
        const rHome = home===ef.home?r.home : home===ef.away?r.away : r.home;
        const rAway = away===ef.home?r.home : away===ef.away?r.away : r.away;
        // Same mapping for the penalty-shootout tally, so it shows on the right side.
        let pens=null;
        if(r.pens){
          pens={ home: home===ef.away?r.pens.away:r.pens.home, away: away===ef.home?r.pens.home:r.pens.away };
        }
        res={home:rHome, away:rAway, live:r.live, minute:r.minute, ...(pens?{pens}:{})};
        if(!r.live){
          // Determine who advances: ESPN winner flag → aggregate score (incl. extra time) →
          // penalty shootout. The pens fallback is critical for knockout rounds: without it a
          // tie decided on penalties leaves the winner null, which stalls the ENTIRE downstream
          // bracket (the next round's teams stay as "winner of Mxx" labels and never link).
          let wTeam = r.winner==="home"?ef.home : r.winner==="away"?ef.away
            : r.home>r.away?ef.home : r.away>r.home?ef.away : null;
          if(!wTeam && r.pens && r.pens.home!==r.pens.away)
            wTeam = r.pens.home>r.pens.away ? ef.home : ef.away;
          if(wTeam) resolved[bm.id]={winnerTeam:wTeam, loserTeam: wTeam===ef.home?ef.away:ef.home};
        }
      }
    }

    // Admin manual override (results.koOverrides[id]) — wins over the API and is never
    // clobbered by sync. home/away are in our slot order; pens decide a level tie.
    const ov = results.koOverrides?.[bm.id];
    if(ov && ov.home!=null && ov.away!=null && home && away){
      res = { home:+ov.home, away:+ov.away, live:false, ...(ov.pens?{pens:{home:+ov.pens.home, away:+ov.pens.away}}:{}) };
      const penW = ov.pens && +ov.home===+ov.away ? (+ov.pens.home>+ov.pens.away?"home":+ov.pens.away>+ov.pens.home?"away":null) : null;
      const wSide = +ov.home>+ov.away?"home":+ov.away>+ov.home?"away":penW;
      if(wSide) resolved[bm.id]={winnerTeam: wSide==="home"?home:away, loserTeam: wSide==="home"?away:home};
    }
    out.push({id:bm.id, stage:bm.stage, date, venue, kickoff, apiId, home, away, homeLabel, awayLabel, res});
  }
  return out;
}

// Tournament champion: an explicit admin value (results.champion) wins; otherwise derive it
// from the final (M104) result once it's decided. Lets champion points count automatically,
// with no manual step. Pass a pre-built schedule to avoid rebuilding it.
export function getChampion(results={}, koSched=null){
  if(results.champion) return results.champion;
  const sched = koSched || buildKnockoutSchedule(results, {});
  const f = sched.find(k=>k.id==="M104");
  if(!f || !f.home || !f.away || !f.res || f.res.live || f.res.home==null || f.res.away==null) return null;
  const r=f.res;
  if(+r.home>+r.away) return f.home;
  if(+r.away>+r.home) return f.away;
  if(r.pens){ if(+r.pens.home>+r.pens.away) return f.home; if(+r.pens.away>+r.pens.home) return f.away; }
  return null;
}
// Golden boot: explicit admin value wins; otherwise fall back to the auto-synced top scorer.
export function getGoldenBoot(results={}){
  return results.goldenBoot || results.topScorer?.name || null;
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

// Per-participant red/yellow card counts, admin-managed via results.cards[uid].
// Falls back to the original hardcoded assignments (דורון→red, YELLOW_CARD_UID→yellow)
// for any participant with no explicit entry yet, so nothing regresses.
export function getCardCounts(p, results){
  const stored=results?.cards?.[p.uid];
  if(stored) return {red:stored.red||0, yellow:stored.yellow||0};
  const red=(p.name||"").includes("דורון")||(p.name||"").toLowerCase().includes("doron") ? 1 : 0;
  const yellow=(!p.isBot && p.uid===YELLOW_CARD_UID) ? 1 : 0;
  return {red, yellow};
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

function _seededRand(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (Math.imul(h, 0x01000193) >>> 0); }
  return h / 0xffffffff;
}
export function generateAutoBet(uid, matchId) {
  const dist = [0,0,0,1,1,1,1,2,2,2,3,3];
  return {
    home: dist[Math.floor(_seededRand(uid + matchId + "h") * dist.length)],
    away: dist[Math.floor(_seededRand(uid + matchId + "a") * dist.length)],
    auto: true,
  };
}

export function resizeImageToDataURL(file,size=400){
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
      resolve(canvas.toDataURL("image/jpeg",0.92));
    };
    img.onerror=reject;
    img.src=url;
  });
}

// Ranks the third-placed team of every group by FIFA criteria (pts → gd → gf) and marks
// the best 8 as qualifiers. Each entry is only included once that group has played all 3
// matches, so the ranking firms up automatically as the group stage completes.
export function bestThirdPlace(results={}) {
  const thirds = [];
  for (const g of Object.keys(GROUPS_2026)) {
    const st = computeGroupStandings(g, results.matches);
    const teams = GROUPS_2026[g];
    if (!teams.every(t => st[t].played === 3)) continue; // group not finished
    const sorted = teams.slice().sort((a,b)=>{
      const [sa,sb]=[st[a],st[b]];
      return sb.pts!==sa.pts?sb.pts-sa.pts:sb.gd!==sa.gd?sb.gd-sa.gd:sb.gf-sa.gf;
    });
    const t = sorted[2];
    thirds.push({ group: g, team: t, pts: st[t].pts, gd: st[t].gd, gf: st[t].gf });
  }
  thirds.sort((a,b)=> b.pts!==a.pts?b.pts-a.pts : b.gd!==a.gd?b.gd-a.gd : b.gf-a.gf);
  return thirds.map((x,i)=>({ ...x, qualified: i < 8 }));
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

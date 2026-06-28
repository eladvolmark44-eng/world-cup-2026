import { useState, useEffect, useRef } from "react";
import { onSnapshot, collection, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from "firebase/auth";
import { db, auth, loadGame, saveGame, saveParticipant } from "./firebase.js";
import { GROUP_MATCHES, GROUPS_2026, KO_BRACKET, RESULT_OVERRIDES } from "./constants/tournament.js";
import { SOFA_TEAM_MAP } from "./constants/api.js";
import { ADMIN_UID, MONKEY_BOT, ASSISTANT_UID } from "./constants/game.js";
import {
  getPresetBets, calcScore, rankSymbol, isTournamentOver,
  getLastCompletedMatchDay, hePlayer, isMatchLocked
} from "./utils/helpers.js";
import {
  setKoKickoffs, hasMatchWithin30Min, hasMatchWithin2Hours,
  fetchOdds, syncMatchData, fdProxy, sofaProxy
} from "./utils/api.js";
import { Toast, SignInScreen } from "./components/common.jsx";
import HomeView, { WinnerAnnouncement, DailyRankAnimation } from "./components/HomeView.jsx";
import { PlayerBetsView } from "./components/BetForm.jsx";
import MatchDetailView from "./components/MatchViews.jsx";
import ResultsView from "./components/ResultsView.jsx";
import AdminPanel, { ProfileEditModal, AssistantPanel } from "./components/AdminPanel.jsx";

export default function App(){
  const [authUser,setAuthUser]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [signingIn,setSigningIn]=useState(false);
  const [game,setGame]=useState({joinCode:"",results:{},playoffNames:{}});
  const [participants,setParticipants]=useState([]);
  const [gameLoading,setGameLoading]=useState(true);
  const [tab,setTab]=useState("home");
  const [resultsSubTab,setResultsSubTab]=useState("matches");
  const [selectedPlayer,setSelectedPlayer]=useState(null);
  const [toast,setToast]=useState(null);
  const [odds,setOdds]=useState({});
  const [oddsTs,setOddsTs]=useState(null);
  const [showProfileEdit,setShowProfileEdit]=useState(false);
  const [showWinner,setShowWinner]=useState(false);
  const [liveStats,setLiveStats]=useState({});
  const [statsMatch,setStatsMatch]=useState(null);
  const [dailyRankAnim,setDailyRankAnim]=useState(null);
  const toastRef=useRef(null);
  const autoFillPingedRef=useRef(false);
  const showToast=msg=>{setToast(msg);clearTimeout(toastRef.current);toastRef.current=setTimeout(()=>setToast(null),2800);};

  useEffect(()=>{
    // Odds polling: fetch once on load, then refresh only as a match nears —
    // every 5min within 30min of kickoff, every 15min within 2h, otherwise idle
    // (we keep the cached odds untouched and just re-check the window).
    let oddsTimer;
    const apply=o=>{if(Object.keys(o).length){setOdds(o);setOddsTs(Date.now());}};
    function scheduleOddsPoll(){
      if(hasMatchWithin30Min()){
        oddsTimer=setTimeout(async()=>{apply(await fetchOdds());scheduleOddsPoll();},5*60*1000);
      }else if(hasMatchWithin2Hours()){
        oddsTimer=setTimeout(async()=>{apply(await fetchOdds());scheduleOddsPoll();},15*60*1000);
      }else{
        // No match near — don't hit the API, just re-check the window later.
        oddsTimer=setTimeout(scheduleOddsPoll,15*60*1000);
      }
    }
    const init=setTimeout(()=>fetchOdds().then(apply), 3000);
    scheduleOddsPoll();
    return()=>{clearTimeout(init);clearTimeout(oddsTimer);};
  },[]);

  useEffect(()=>{
    return onAuthStateChanged(auth,async user=>{
      setAuthUser(user);setAuthLoading(false);
      if(user){
        const snap=await getDoc(doc(db,"mundial2026","game","participants",user.uid));
        if(!snap.exists())
          await saveParticipant({uid:user.uid,name:user.displayName,photoURL:user.photoURL||null,bets:getPresetBets(user.displayName)});
        await updateDoc(doc(db,"mundial2026","game","participants",user.uid),{lastSeen:Date.now()});
      }
    });
  },[]);

  useEffect(()=>{
    loadGame().then(g=>{setGame(g);setGameLoading(false);});
    const u1=onSnapshot(doc(db,"mundial2026","game"),snap=>{
      if(snap.exists()){
        const d=snap.data();
        setGame(d);
        setKoKickoffs((d.results?.knockoutMatches||[]).filter(m=>m.kickoff).map(m=>new Date(m.kickoff).getTime()));
      }
    });
    const u2=onSnapshot(collection(db,"mundial2026","game","participants"),snap=>{
      const real=snap.docs.map(d=>({...d.data(),uid:d.id}));
      setParticipants([...real, MONKEY_BOT]);
    });

    const heb = n => SOFA_TEAM_MAP[n]||n;

    const syncScores = async (uid) => {
      try {
        // ── Only sync during active match windows ───────────────────
        // 10h window: covers live play (2h) + overnight catchup if midnight sync was missed
        const now = Date.now();
        const SYNC_WINDOW = 10 * 60 * 60 * 1000;
        const hasActiveGroupMatch = GROUP_MATCHES.some(m => {
          const t = new Date(m.kickoff).getTime();
          return now >= t - 5*60*1000 && now <= t + SYNC_WINDOW;
        });
        // Knockout fixtures have no kickoff time in KO_BRACKET (only a date), so treat the
        // whole knockout match-day as active — otherwise, once the group stage ends, the sync
        // would stop entirely and live knockout scores would never update.
        const hasActiveKoDay = KO_BRACKET.some(m => {
          if(!m.date) return false;
          const [d,mo] = m.date.split('/');
          const dayStart = new Date(2026, +mo-1, +d).getTime();
          return now >= dayStart - 5*60*1000 && now <= dayStart + 34*60*60*1000;
        });
        const hasActiveMatch = hasActiveGroupMatch || hasActiveKoDay;
        // Admin-requested forced re-syncs (results.forceResync = {matchId:true}) must run
        // even outside the normal active-match window and ignoring the throttle.
        const gameSnap = await getDoc(doc(db,"mundial2026","game"));
        const cur = gameSnap.exists() ? gameSnap.data() : {};
        const forced = Object.keys(cur.forceResync||{}).filter(k=>cur.forceResync[k]);

        // Reconcile manual result overrides immediately, even outside active match
        // windows — a hand-correction must take effect without waiting for a live game.
        {
          const om = {};
          for (const [id, ov] of Object.entries(RESULT_OVERRIDES)) {
            const prev = cur.results?.matches?.[id];
            if (!prev || prev.home !== ov.home || prev.away !== ov.away || prev.live) {
              om[id] = { ...(prev||{}), home: ov.home, away: ov.away, live: false, status: "FT", endedAt: prev?.endedAt ?? Date.now() };
            }
          }
          if (Object.keys(om).length) {
            await saveGame({ results: { ...cur.results, matches: { ...(cur.results?.matches||{}), ...om } } });
          }
        }

        if (!hasActiveMatch && forced.length===0) return;

        // ── LEADER LOCK: only one client calls ESPN at a time ───────
        const syncSnap = await getDoc(doc(db,"mundial2026","sync"));
        const syncData = syncSnap.exists() ? syncSnap.data() : {};
        const lastSync = syncData.lastSync ? new Date(syncData.lastSync).getTime() : 0;
        const secondsSinceLast = (now - lastSync) / 1000;

        // If synced less than 20s ago by someone else, skip — read from Firebase instead
        // (a pending forced re-sync overrides the throttle so it runs immediately).
        if (secondsSinceLast < 20 && syncData.syncedBy !== uid && forced.length===0) return;

        // Claim the sync slot
        await setDoc(doc(db,"mundial2026","sync"), {
          lastSync: new Date().toISOString(),
          syncedBy: uid,
        });

        // ── Score source parsers ────────────────────────────────────
        const now2 = new Date();
        const yyyymmdd = d => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
        const isoDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

        const addBothKeys = (res, h, a, hg, ag, status, live, minute) => {
          res[`${h}_${a}`]={home:hg,away:ag,status,live,minute:minute??null};
          res[`${a}_${h}`]={home:ag,away:hg,status,live,minute:minute??null};
        };

        // ESPN's displayClock isn't always a plain "45'" string (can be "HT", missing, etc.),
        // and parseInt(...)||null previously turned a real minute of 0 into null since 0 is falsy.
        const espnMinute = status => {
          const m = status?.displayClock!=null ? String(status.displayClock).match(/(\d+)(\+\d+)?/) : null;
          if (m) return m[1]+(m[2]||"");
          return typeof status?.clock==="number" ? String(Math.floor(status.clock/60)) : null;
        };

        const parseESPN = evs => {
          const res={};
          for(const ev of(evs||[])){
            const comp=ev.competitions?.[0]; if(!comp)continue;
            const state=comp.status?.type?.state;
            const fin=state==="post", live=state==="in";
            if(!fin&&!live)continue;
            const hC=comp.competitors?.find(c=>c.homeAway==="home");
            const aC=comp.competitors?.find(c=>c.homeAway==="away");
            if(!hC||!aC)continue;
            const hg=parseInt(hC.score,10),ag=parseInt(aC.score,10);
            if(isNaN(hg)||isNaN(ag))continue;
            const minute=live ? espnMinute(comp.status) : null;
            addBothKeys(res,heb(hC.team.displayName),heb(aC.team.displayName),hg,ag,fin?"FT":"LIVE",live,minute);
          }
          return res;
        };

        const parseSofaScore = evs => {
          const res={};
          for(const ev of(evs||[])){
            const t=ev.status?.type;
            const fin=t==="finished", live=t==="inprogress";
            if(!fin&&!live)continue;
            const hg=ev.homeScore?.current, ag=ev.awayScore?.current;
            if(hg==null||ag==null)continue;
            const minute=live ? (ev.time?.played??null) : null;
            const hn=heb(ev.homeTeam?.name), an=heb(ev.awayTeam?.name);
            addBothKeys(res,hn,an,hg,ag,fin?"FT":"LIVE",live,minute);
            if(ev.id){res[`${hn}_${an}`].sofaId=ev.id;res[`${an}_${hn}`].sofaId=ev.id;}
          }
          return res;
        };

        const parseSportsDB = evs => {
          const res={};
          for(const ev of(evs||[])){
            const s=ev.strStatus;
            const fin=["FT","AET","PEN"].includes(s), live=["1H","2H","HT","ET","P","LIVE"].includes(s);
            if(!fin&&!live)continue;
            const hg=parseInt(ev.intHomeScore,10),ag=parseInt(ev.intAwayScore,10);
            if(isNaN(hg)||isNaN(ag))continue;
            const ip=parseInt(ev.intProgress,10);
            const minute=live ? (isNaN(ip)?null:ip) : null;
            addBothKeys(res,heb(ev.strHomeTeam),heb(ev.strAwayTeam),hg,ag,fin?"FT":"LIVE",live,minute);
          }
          return res;
        };

        const parseFDScore = ms => {
          const res={};
          for(const m of(ms||[])){
            const s=m.status;
            const fin=["FINISHED","AWARDED"].includes(s),live=["IN_PLAY","PAUSED","HALFTIME"].includes(s);
            if(!fin&&!live)continue;
            const hg=m.score?.fullTime?.home,ag=m.score?.fullTime?.away;
            if(hg==null||ag==null)continue;
            const minute=live?(m.minute??null):null;
            addBothKeys(res,heb(m.homeTeam?.name||""),heb(m.awayTeam?.name||""),hg,ag,fin?"FT":"LIVE",live,minute);
          }
          return res;
        };

        // Merge a source's parsed results into `merged`, but let a later source OVERRIDE an
        // existing entry when it carries fresher data — a finished result beats a still-"live"
        // one, and (same liveness) more goals beats fewer. This is what makes the backup
        // sources actually back each other up: a stale/frozen entry from one provider no longer
        // blocks a correct entry from another.
        const mergeBetter = (merged, res) => {
          for(const [k,v] of Object.entries(res||{})){
            const cur = merged[k];
            if(!cur){ merged[k]=v; continue; }
            const curFin = cur.live===false, vFin = v.live===false;
            if(vFin !== curFin){ if(vFin) merged[k]=v; continue; }
            if((v.home+v.away) > (cur.home+cur.away)) merged[k]=v;
          }
        };

        // Fetch from multiple sources — merge all to avoid ESPN early-return missing small matches
        const fetchWithFallback = async (espnSlugs, iso, ymd) => {
          const merged = {};
          // 1. ESPN — collect all slugs, don't stop on first hit
          for(const slug of espnSlugs){
            try{
              const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${ymd}`);
              const d=await r.json();
              if(d.events?.length) mergeBetter(merged, parseESPN(d.events));
            }catch(e){}
          }
          // 2. TheSportsDB — supplement / override stale
          try{
            const r=await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${iso}&s=Soccer`);
            const d=await r.json();
            if(d.events?.length) mergeBetter(merged, parseSportsDB(d.events));
          }catch(e){}
          // 3. SofaScore — via same-origin proxy (direct calls are IP/CORS-blocked)
          try{
            const r=await fetch(sofaProxy(`/sport/football/scheduled-events/${iso}`));
            const d=await r.json();
            if(d.events?.length) mergeBetter(merged, parseSofaScore(d.events));
          }catch(e){}
          // 4. API-Football — via same-origin proxy (key lives server-side in API_FOOTBALL_KEY).
          // Free tier is quota-limited, so only fetch today's date and at most once/hour.
          const lastAF = syncData.lastApiFootballSync ? new Date(syncData.lastApiFootballSync).getTime() : 0;
          if (iso === todayISO && Date.now() - lastAF > 60 * 60 * 1000) {
            try{
              const r=await fetch(`/api/af-proxy?date=${iso}`);
              const d=await r.json();
              const errs=d?.errors;
              const isQuotaErr=errs&&(Array.isArray(errs)?errs.length:Object.keys(errs).length);
              if(!isQuotaErr){
                for(const f of(d.response||[])){
                  const{fixture:fi,teams,goals}=f;
                  const s=fi.status.short;
                  const fin=["FT","AET","PEN"].includes(s),live=["1H","2H","HT","ET","BT","P","SUSP","INT","LIVE"].includes(s);
                  if((fin||live)&&goals.home!=null&&goals.away!=null){
                    const minute=live ? (fi.status.elapsed??null) : null;
                    const afRes={};
                    addBothKeys(afRes,heb(teams.home.name),heb(teams.away.name),goals.home,goals.away,fin?"FT":"LIVE",live,minute);
                    mergeBetter(merged, afRes);
                  }
                }
              }
              // Mark synced either way so a quota error doesn't cause repeated hammering.
              await setDoc(doc(db,"mundial2026","sync"),{lastApiFootballSync:new Date().toISOString()},{merge:true});
            }catch(e){}
          }
          return merged;
        };

        const today = yyyymmdd(now2);
        const todayISO = isoDate(now2);
        // ESPN/SofaScore bucket fixtures by their own timezone, so a late-night (local) match
        // can land on the previous or next calendar day in their feed. Always fetch a
        // yesterday/today/tomorrow window so a live match is never missed and never freezes.
        const yesterdayISO = isoDate(new Date(now2.getTime() - 24*60*60*1000));
        const tomorrowISO = isoDate(new Date(now2.getTime() + 24*60*60*1000));
        const windowISO = [yesterdayISO, todayISO, tomorrowISO];
        const firstWCKickoff = Math.min(...GROUP_MATCHES.filter(m=>m.group!=="יזיזות").map(m=>new Date(m.kickoff).getTime()));
        const wcStarted = Date.now() >= firstWCKickoff - 2*60*60*1000;

        // ISO dates of any match (group or knockout) queued for a forced re-sync —
        // used to re-fetch that day for both the group and knockout score paths.
        const forcedDates = forced.map(id => {
          const gm = GROUP_MATCHES.find(x=>x.id===id);
          if(gm?.kickoff) return isoDate(new Date(gm.kickoff));
          const km = KO_BRACKET.find(x=>x.id===id);
          if(km?.date){ const [d,mo]=km.date.split('/'); return `2026-${mo}-${d}`; }
          return null;
        }).filter(Boolean);

        let standingsData = { response: [] }; // kept for compatibility, no longer used for standings

        // ── MATCHES ────────────────────────────────────────────────
        const byKey = {};

        // Friendly/test matches — fetch by the actual kickoff dates of active friendlies
        // (avoids midnight bug: after 00:00, new Date() returns next day but matches are still from prev day)
        const activeFriendlyDates = [...new Set(
          GROUP_MATCHES
            .filter(m => { const t=new Date(m.kickoff).getTime(); return m.group==="יזיזות" && now >= t - 5*60*1000 && now <= t + SYNC_WINDOW; })
            .map(m => isoDate(new Date(m.kickoff)))
        )];
        for (const iso of activeFriendlyDates) {
          const ymd = iso.replace(/-/g, '');
          Object.assign(byKey, await fetchWithFallback(["fifa.friendly","intl.friendlies"], iso, ymd));
        }

        // WC matches — ESPN→SofaScore→TheSportsDB→API-Football
        if (wcStarted) {
          // Also derive date from active WC match kickoffs to handle midnight crossing
          const activeWCDates = [...new Set(
            GROUP_MATCHES
              .filter(m => { const t=new Date(m.kickoff).getTime(); return m.group!=="יזיזות" && now >= t - 5*60*1000 && now <= t + SYNC_WINDOW; })
              .map(m => isoDate(new Date(m.kickoff)))
          )];
          // Yesterday/today/tomorrow window (timezone-safe) + active kickoff dates + forced.
          const wcDates = [...new Set([...windowISO, ...activeWCDates, ...forcedDates])];
          for (const iso of wcDates) {
            const ymd = iso.replace(/-/g, '');
            Object.assign(byKey, await fetchWithFallback(["fifa.world"], iso, ymd));
          }
        }

        // Compute football-data.org fallback for WC (live stats and red cards)
        const fdFallback = {};
        if (wcStarted) {
          const lastFD = syncData.lastFDSync ? new Date(syncData.lastFDSync).getTime() : 0;
          if (Date.now() - lastFD > 60 * 1000) {
            try{
              const r=await fetch(fdProxy('/v4/competitions/WC/matches?status=LIVE,FINISHED,IN_PLAY,PAUSED'));
              const d=await r.json();
              if(d.matches?.length){
                Object.assign(fdFallback, parseFDScore(d.matches));
                await setDoc(doc(db,"mundial2026","sync"),{lastFDSync:new Date().toISOString()},{merge:true});
              }
            }catch(e){}
          }
        }
        // football-data.org is currently the most reliable working source — let its finished/
        // higher-score results OVERRIDE a stale or frozen entry from ESPN (which otherwise wins
        // just by being keyed first). The per-match regression guard then locks the corrected
        // score in so ESPN can't re-freeze it.
        mergeBetter(byKey, fdFallback);

        // ── Match state updates ──────────────────────────────────────
        const updatedMatches = {...(cur.results?.matches||{})};
        let matchChanged = false;

        const redUpdates = {};

        // Hard safety ceiling: force-close any match still flagged live long after it could
        // realistically still be playing, regardless of whether a fresh source even mentions
        // it this cycle — otherwise a match that drops off every provider's feed while
        // wrongly flagged live (seen with Algeria–Jordan) stays stuck that way forever.
        const MAX_LIVE_MS = 3 * 60 * 60 * 1000;
        for (const m of GROUP_MATCHES) {
          const prev = updatedMatches[m.id];
          if (prev?.live === true && m.kickoff && Date.now() - new Date(m.kickoff).getTime() > MAX_LIVE_MS) {
            updatedMatches[m.id] = { ...prev, live: false, endedAt: prev.endedAt ?? Date.now() };
            matchChanged = true;
          }
        }

        for (const m of GROUP_MATCHES) {
          if (RESULT_OVERRIDES[m.id]) continue; // hand-corrected result wins; never let the API touch it
          const key = `${m.home}_${m.away}`;
          const src = byKey[key] || fdFallback[key];
          if (!src) continue;

          const prev = updatedMatches[m.id] || {};
          const isForced = forced.includes(m.id);
          // A forced re-sync (admin-requested) bypasses both protective guards below and
          // overwrites whatever is stored with a clean, fresh read from the sources.
          if (!isForced) {
            // Guard against a stale/flaky fallback source (TheSportsDB in particular often
            // returns placeholder 0-0 for a match it hasn't actually updated yet) overwriting
            // a score we already confirmed — a real match's goal tally never decreases.
            if (prev.home != null && prev.away != null && (src.home + src.away) < (prev.home + prev.away)) {
              continue;
            }
            // Once a match is confirmed finished, don't let a fallback source that's still
            // reporting it live (stale data, or simply hasn't caught up to the FT status) flip it back.
            if (prev.live === false && prev.home != null && src.live) {
              continue;
            }
          }

          const newEntry = {
            home: src.home,
            away: src.away,
            live: src.live||false,
            ...(src.minute!=null ? {minute: src.minute} : {}),
          };

          if (isForced || prev.home !== newEntry.home || prev.away !== newEntry.away || prev.live !== newEntry.live || prev.minute !== newEntry.minute) {
            if (prev.live && !newEntry.live) newEntry.endedAt = Date.now();
            // Forced: replace cleanly (drop stale score fields) but keep red cards, which
            // come from a separate hourly source; otherwise merge onto prev.
            updatedMatches[m.id] = isForced
              ? { ...newEntry, ...(prev.reds ? {reds: prev.reds} : {}) }
              : { ...prev, ...newEntry };
            matchChanged = true;
          }

          // Red cards from API-Football (best source for disciplinary data)
          const afSrc = byKey[key];
          if (afSrc?.reds != null) {
            const existing = cur.results?.matches?.[m.id]?.reds;
            if (!existing || existing.home !== afSrc.reds.home || existing.away !== afSrc.reds.away) {
              redUpdates[`results.matches.${m.id}.reds`] = afSrc.reds;
            }
          }
        }

        // ── Manual result overrides ──────────────────────────────────
        // Force hand-corrected results onto the stored data so standings,
        // advancement and per-user scoring all read the right number.
        for (const [id, ov] of Object.entries(RESULT_OVERRIDES)) {
          const prev = updatedMatches[id] || {};
          if (prev.home !== ov.home || prev.away !== ov.away || prev.live) {
            updatedMatches[id] = { ...prev, home: ov.home, away: ov.away, live: false, status: "FT", endedAt: prev.endedAt ?? Date.now() };
            matchChanged = true;
          }
        }

        // ── Groups qualified ─────────────────────────────────────────
        const updatedGroups = {...(cur.results?.groups||{})};
        let groupsChanged = false;

        for (const [g, teams] of Object.entries(GROUPS_2026)) {
          if (g === "יזיזות") continue;
          const gMatches = GROUP_MATCHES.filter(m => m.group === g);
          // Compute live standings once all 3 group matches have scores (even mid-game),
          // because the last round always kicks off simultaneously.
          const allHaveScores = gMatches.every(m => updatedMatches[m.id]?.home != null);
          if (!allHaveScores) continue;

          const st = {};
          for (const t of teams) st[t] = {pts:0,gd:0,gf:0};
          for (const m of gMatches) {
            const r = updatedMatches[m.id]; if (!r) continue;
            const [h,a] = [r.home, r.away];
            st[m.home].gf+=h; st[m.home].gd+=h-a;
            st[m.away].gf+=a; st[m.away].gd+=a-h;
            if(h>a){st[m.home].pts+=3;}else if(h<a){st[m.away].pts+=3;}else{st[m.home].pts++;st[m.away].pts++;}
          }
          const sorted = teams.slice().sort((a,b) => {
            if(st[b].pts!==st[a].pts) return st[b].pts-st[a].pts;
            if(st[b].gd!==st[a].gd) return st[b].gd-st[a].gd;
            return st[b].gf-st[a].gf;
          });
          const top2 = sorted.slice(0,2);
          const existing = updatedGroups[g];
          if(!existing || existing[0]!==top2[0] || existing[1]!==top2[1]) {
            updatedGroups[g] = top2;
            groupsChanged = true;
          }
        }

        // ── KNOCKOUT ─────────────────────────────────────────────────
        // Merge onto stored results (keyed by ESPN apiId) so knockout fixtures + scores
        // accumulate across days all the way to the final, instead of being wiped to only
        // today's matches each cycle.
        const koResults = {...(cur.results?.koResults||{})};
        const koMap = {};
        (cur.results?.knockoutMatches||[]).forEach(k=>{ if(k.apiId) koMap[k.apiId]=k; });

        if (wcStarted) {
          try{
            const koStageMap = {
              "Round of 32":"32 האחרונות","Round of 16":"שמינית גמר",
              "Quarterfinals":"רבע גמר","Semifinals":"חצי גמר",
              "3rd Place Playoff":"מקום שלישי","Final":"גמר",
            };
            // Pull upcoming knockout fixtures (within ~10 days) so their real kickoff
            // times & venues populate ahead of time — otherwise a match more than a day
            // out shows only its bracket date with no time. Bounded so we don't fetch
            // the whole tournament every cycle; later rounds enter the window as they near.
            const koUpcoming = [...new Set(KO_BRACKET.map(k=>{ const [d,mo]=k.date.split('/'); return `2026-${mo}-${d}`; }))]
              .filter(iso => { const t=new Date(iso+"T12:00:00").getTime(); return t >= now - 24*60*60*1000 && t <= now + 10*24*60*60*1000; });
            for (const iso of [...new Set([...windowISO, ...forcedDates, ...koUpcoming])]) {
              const ymd = iso.replace(/-/g,'');
              try{
                const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${ymd}`);
                const d=await r.json();
                for (const ev of (d.events||[])) {
                  const comp = ev.competitions?.[0];
                  const hC = comp?.competitors?.find(c=>c.homeAway==="home");
                  const aC = comp?.competitors?.find(c=>c.homeAway==="away");
                  if (!hC || !aC) continue;
                  const homeHeb = heb(hC.team?.displayName||"");
                  const awayHeb = heb(aC.team?.displayName||"");
                  // The group stage's last round and the first R32 share a date (28/06), so never
                  // treat an actual group fixture as a knockout match — it would pollute the bracket.
                  const isGroupFixture = GROUP_MATCHES.some(g =>
                    (g.home===homeHeb&&g.away===awayHeb)||(g.home===awayHeb&&g.away===homeHeb));
                  if (isGroupFixture) continue;

                  const notes = comp?.notes || [];
                  const noteText = notes.find(n=>n.type==="event")?.headline || comp?.status?.type?.description || "";
                  let stage = null;
                  for (const [en, heb2] of Object.entries(koStageMap)) {
                    if (noteText.includes(en)) {
                      stage = heb2; break;
                    }
                  }
                  // Use DD/MM (slashes) to match group-match dates and the date navigator.
                  const dateStr = ev.date ? `${String(new Date(ev.date).getDate()).padStart(2,'0')}/${String(new Date(ev.date).getMonth()+1).padStart(2,'0')}` : "";
                  // ESPN's note text isn't always present/parseable — fall back to inferring the
                  // stage from the fixture date against the official bracket, so knockout matches
                  // are never silently dropped.
                  if (!stage) {
                    const dm = ev.date
                      ? `${String(new Date(ev.date).getDate()).padStart(2,'0')}/${String(new Date(ev.date).getMonth()+1).padStart(2,'0')}`
                      : null;
                    stage = KO_BRACKET.find(k=>k.date===dm)?.stage || null;
                  }
                  if (!stage) continue;
                  const state = comp.status?.type?.state;
                  const isFinished = state === "post";
                  const isLive = state === "in";
                  const venueObj = comp?.venue;
                  const venue = venueObj?.fullName ? `${venueObj.fullName}${venueObj.address?.city ? ', '+venueObj.address.city : ''}` : null;
                  const koMatch = {
                    id: `ko_${ev.id}`, apiId: ev.id, stage, date: dateStr,
                    home: homeHeb, away: awayHeb,
                    kickoff: ev.date||null, venue,
                  };
                  if ((isFinished||isLive) && hC.score != null) {
                    const clockMatch = isLive ? (comp.status?.displayClock||"").match(/(\d+)(\+\d+)?/) : null;
                    const minute = clockMatch ? (clockMatch[1]+(clockMatch[2]||"")) :
                      (isLive && typeof comp.status?.clock==="number" ? String(Math.floor(comp.status.clock/60)) : null);
                    const winner = hC.winner===true ? "home" : aC.winner===true ? "away" : null;
                    koResults[ev.id] = {home:parseInt(hC.score,10), away:parseInt(aC.score,10), live:isLive, minute, ...(winner?{winner}:{})};
                  }
                  koMap[ev.id] = koMatch;
                }
              } catch(e) {}
            }
          } catch(e) {}
        }
        const koMatchesArr = Object.values(koMap);

        if (wcStarted) {
          // ── TOP SCORER + TOTAL GOALS (WC only, not friendlies) ─────────────
          // topScorer (header) and topScorers (full list) must come from the same
          // fetch and be written in the same updateDoc call below — otherwise two
          // browsers racing the hourly refresh can interleave their writes and leave
          // the header and the list disagreeing with each other.
          let topScorerUpdate = null;
          let topScorersListUpdate = null;
          if (wcStarted) {
            // Fetch top scorer from football-data.org, max once/hour
            const lastTS = syncData.lastTopScorerSync ? new Date(syncData.lastTopScorerSync).getTime() : 0;
            if (Date.now() - lastTS > 60 * 60 * 1000) {
              try {
                const r = await fetch(fdProxy('/v4/competitions/WC/scorers'));
                const d = await r.json();
                if (d.scorers?.length) {
                  const top = d.scorers[0];
                  const hebName = hePlayer(top.player?.name||"")||top.player?.name||"";
                  const hebTeam = SOFA_TEAM_MAP[top.team?.name||""]||top.team?.name||"";
                  topScorerUpdate = { name: hebName, goals: top.goals ?? 0, team: hebTeam };
                  topScorersListUpdate = d.scorers.slice(0,10).map(s=>({name:hePlayer(s.player?.name||"")||s.player?.name||"",goals:s.goals??0,team:SOFA_TEAM_MAP[s.team?.name||""]||s.team?.name||""}));
                  await setDoc(doc(db,"mundial2026","sync"),{lastTopScorerSync:new Date().toISOString()},{merge:true});
                }
              } catch(e) {}
            }
          }

          // Compute total WC goals — includes live matches (count as-you-go), excludes orphan friendlies
          let wcGoals = 0;
          for (const [id, m] of Object.entries(updatedMatches)) {
            const gm = GROUP_MATCHES.find(g => g.id === id);
            if (!gm) continue; // skip orphan friendly IDs (T53, T54 etc.) still in Firestore
            if (m.home != null && m.away != null) wcGoals += m.home + m.away;
          }
          for (const m of Object.values(koResults)) {
            if (m.home != null && m.away != null) wcGoals += m.home + m.away;
          }
          const goalsChanged = wcStarted && wcGoals !== (cur.results?.actualTotalGoals ?? -1);
          const topScorerChanged = topScorerUpdate && (
            topScorerUpdate.name !== cur.results?.topScorer?.name ||
            topScorerUpdate.goals !== cur.results?.topScorer?.goals
          );

          const updates = {};
          if (matchChanged || groupsChanged || koMatchesArr.length > 0 || topScorerChanged || topScorersListUpdate || goalsChanged) {
            updates.results = {
              ...cur.results,
              matches: updatedMatches,
              koResults,
              knockoutMatches: koMatchesArr,
              ...(groupsChanged ? {groups: updatedGroups} : {}),
              ...(topScorerChanged ? {topScorer: topScorerUpdate} : {}),
              ...(topScorersListUpdate ? {topScorers: topScorersListUpdate} : {}),
              ...(goalsChanged ? {actualTotalGoals: wcGoals} : {}),
            };
          }
          // Clear consumed forced-resync flags so they don't re-run every cycle.
          if (forced.length) updates.forceResync = Object.fromEntries(forced.map(id=>[id,false]));
          if (Object.keys(updates).length) await saveGame(updates);
        } else {
          // Non-WC path (friendlies only)
          const updates = {};
          if (matchChanged || groupsChanged) {
            updates.results = {
              ...cur.results,
              matches: updatedMatches,
              ...(groupsChanged ? {groups: updatedGroups} : {}),
            };
          }
          if (Object.keys(updates).length) await saveGame(updates);
        }

        if(Object.keys(redUpdates).length){
          await updateDoc(doc(db,"mundial2026","game"),redUpdates);
        }
      }catch(e){console.warn("Score sync failed:", e.message);}
    };

    syncScores(auth.currentUser?.uid||"anon");
    syncMatchData(setLiveStats);
    const poll = setInterval(()=>syncScores(auth.currentUser?.uid||"anon"), 15 * 1000);
    const dataPoll = setInterval(()=>syncMatchData(setLiveStats), 15 * 1000);
    return()=>{u1();u2();clearInterval(poll);clearInterval(dataPoll);};
  },[]);

  // Show daily rank animation once per calendar day per user (after any completed match day)
  useEffect(()=>{
    if(!authUser||!participants.length||gameLoading)return;
    const lastDay=getLastCompletedMatchDay(game?.results);
    if(!lastDay)return;
    const todayStr=new Date().toISOString().slice(0,10);
    const key=`dra_${todayStr}_${authUser.uid}`;
    if(localStorage.getItem(key))return;
    const results=game?.results||{};
    const ranked=[...participants]
      .map(p=>({...p,score:calcScore(p.bets||{},results,participants)}))
      .sort((a,b)=>b.score-a.score);
    const myIdx=ranked.findIndex(p=>p.uid===authUser.uid);
    if(myIdx<0)return;
    const sym=rankSymbol(ranked,myIdx);
    localStorage.setItem(key,"1");
    setTimeout(()=>setDailyRankAnim({date:lastDay,sym,score:ranked[myIdx].score,rank:myIdx,isTest:false}),1500);
  },[authUser?.uid,gameLoading,game?.results,participants.length]);

  // Auto-fill missing bets for locked matches, for every participant who needs it —
  // delegated server-side (admin SDK, bypasses per-user write permissions) so it works
  // no matter who's the one logging in, not just the admin or the bet's own owner.
  useEffect(()=>{
    if(!authUser||gameLoading||autoFillPingedRef.current)return;
    autoFillPingedRef.current=true;
    fetch("/api/auto-bets",{method:"POST"}).catch(()=>{});
  },[authUser?.uid,gameLoading]);

  const handleSignIn=async()=>{
    setSigningIn(true);
    try{
      const p=new GoogleAuthProvider();
      if(sessionStorage.getItem("explicit_signout")){
        p.setCustomParameters({prompt:"select_account"});
        sessionStorage.removeItem("explicit_signout");
      }
      await signInWithPopup(auth,p);
    }catch(e){console.error(e);}
    setSigningIn(false);
  };
  const handleSaveBets=async bets=>{
    if(!authUser)return;
    const cur=participants.find(p=>p.uid===authUser.uid)||{};
    await saveParticipant({...cur,uid:authUser.uid,bets});
    showToast("✅ הימורים נשמרו!");
  };

  const handleSaveMatchBet=async(matchId, matchBet)=>{
    if(!authUser)return;
    const cur=participants.find(p=>p.uid===authUser.uid)||{};
    const updatedBets={...cur.bets,matches:{...cur.bets?.matches,[matchId]:matchBet}};
    await saveParticipant({...cur,uid:authUser.uid,bets:updatedBets});
  };
  const handleSaveKoMatchBet=async(matchId, matchBet)=>{
    if(!authUser)return;
    const cur=participants.find(p=>p.uid===authUser.uid)||{};
    const updatedBets={...cur.bets,koMatches:{...cur.bets?.koMatches,[matchId]:matchBet}};
    await saveParticipant({...cur,uid:authUser.uid,bets:updatedBets});
  };

  // Auto-resolve monkey bets: when a match locks and bet is {monkey:true}, generate random scores
  useEffect(()=>{
    if(!authUser) return;
    const me=participants.find(p=>p.uid===authUser.uid);
    if(!me?.bets?.matches) return;
    const rnd=()=>Math.floor(Math.random()*Math.random()*5);
    const toResolve=GROUP_MATCHES.filter(m=>{
      const b=me.bets.matches[m.id];
      return b?.home==null && b?.away==null && isMatchLocked(m.id, game.results?.matches?.[m.id]);
    });
    if(!toResolve.length) return;
    const updatedMatches={...me.bets.matches};
    toResolve.forEach(m=>{ updatedMatches[m.id]={home:rnd(),away:rnd(),monkey:true}; });
    saveParticipant({...me,uid:authUser.uid,bets:{...me.bets,matches:updatedMatches}});
  },[authUser?.uid, game.results?.matches]);

  const teamNames=game.playoffNames||{};
  const me=authUser?participants.find(p=>p.uid===authUser.uid):null;
  const isAdmin=authUser?.uid===ADMIN_UID;
  const isAssistant=authUser?.uid===ASSISTANT_UID&&!game.assistantLocked;
  const tournamentOver=isTournamentOver();
  const appRanked=[...participants].map(p=>({...p,score:calcScore(p.bets||{},game.results||{},participants)})).sort((a,b)=>b.score-a.score);
  const appLeader=appRanked[0]||null;

  if(authLoading||gameLoading)return(<div className="app loading-screen"><div className="loading-ball">⚽</div><p>טוען...</p></div>);
  if(!authUser)return(<div className="app"><SignInScreen onSignIn={handleSignIn} loading={signingIn}/></div>);

  if(selectedPlayer)return(
    <div className="app" dir="rtl">
      <Toast msg={toast}/>
      <div className="main-screen">
        <div className="main-header">
          <button className="back-btn" onClick={()=>setSelectedPlayer(null)}>→</button>
          <span className="header-title">הימורים של {selectedPlayer.name}</span>
        </div>
        <div className="main-body">
          <PlayerBetsView player={selectedPlayer} viewerUid={authUser.uid} results={game.results||{}} teamNames={teamNames}/>
        </div>
      </div>
    </div>
  );

  if(statsMatch)return(
    <div className="app" dir="rtl">
      <Toast msg={toast}/>
      <div className="main-screen">
        <div className="main-header">
          <button className="back-btn" onClick={()=>setStatsMatch(null)}>→</button>
          <span className="header-title">📊 פרטי משחק</span>
        </div>
        <div className="main-body">
          <MatchDetailView match={statsMatch.match} res={statsMatch.res} teamNames={teamNames} me={me}/>
        </div>
      </div>
    </div>
  );

  return(
    <>
    <div className="app" dir="rtl">
      <Toast msg={toast}/>
      <div className="main-screen">
        <div className="main-header">
          <div className="header-user" onClick={()=>setShowProfileEdit(true)} style={{cursor:"pointer"}} title="עריכת פרופיל">
            {(me?.photoURL||authUser.photoURL)&&<img src={me?.photoURL||authUser.photoURL} className="header-avatar" alt=""/>}
            <span className="header-name">{(me?.name||authUser.displayName)?.split(" ")[0]}</span>
          </div>
          <div className="header-title">
            <div>מונדיאל<span style={{color:"var(--green)"}}>Bet</span><span style={{color:"var(--gold)"}}>2026</span></div>
            <div className="header-subtitle">על שם נייל קלארק</div>
          </div>
          <button className="btn-signout" onClick={()=>{sessionStorage.setItem("explicit_signout","1");signOut(auth);}}>יציאה</button>
        </div>
        <div className="main-content">
        <div className="main-tabs">
          {[["home","🏟️","בית"],["results","score","תוצאות"],["rules","ref","חוקים"],...(isAdmin?[["admin","⚙️","מנהל"]]:[]),...((isAdmin||isAssistant)?[["assistant","amir","מאמן"]]:[])].map(([k,icon,label])=>(
            <button key={k} className={`main-tab ${tab===k?"active":""}`} onClick={()=>setTab(k)}>
              {icon==="score"
                ? <span className="tab-icon tab-score">3:2</span>
                : icon==="ref"
                ? <span className="tab-icon"><img src="/referee.png" className="tab-ref-img" alt="referee"/></span>
                : icon==="amir"
                ? <span className="tab-icon"><img src="/amir.png" className="tab-ref-img" alt="מאמן"/></span>
                : <span className="tab-icon">{icon}</span>
              }
              <span className="tab-label">{label}</span>
            </button>
          ))}
        </div>
        <div className="main-body">
          {tab==="home"&&(
            <HomeView
              me={me}
              participants={participants}
              results={game.results||{}}
              teamNames={teamNames}
              odds={odds}
              liveStats={liveStats}
              onMatchClick={(match,res)=>setStatsMatch({match,res})}
              onSelectPlayer={setSelectedPlayer}
              onSaveBets={handleSaveBets}
              onGoToGroups={()=>{setTab("results");setResultsSubTab("groups");}}
              showWinner={showWinner}
              setShowWinner={setShowWinner}
            />
          )}
          {tab==="results"&&(
            <ResultsView
              participants={participants}
              viewerUid={authUser.uid}
              results={game.results||{}}
              teamNames={teamNames}
              me={me}
              onSaveMatch={handleSaveMatchBet}
              onSaveKoMatch={handleSaveKoMatchBet}
              onSaveBets={handleSaveBets}
              odds={odds}
              subTab={resultsSubTab}
              setSubTab={setResultsSubTab}
              onMatchClick={(match,res)=>setStatsMatch({match,res})}
            />
          )}

          {tab==="rules"&&(
            <div className="section rules-section">
              <h2>📜 ספר חוקים</h2>
              {[
                ["💰 קופה","כל משתתף שם 50 ₪"],["🥇 מקום ראשון","מקבל את כל הקופה"],
                ["🥈 מקום שני","מקבל 50 ₪ ממי שסיים אחרון"],
                ["🔒 נעילת הימורים","בשריקת הפתיחה של כל משחק — אי אפשר לשנות אחרי הנעילה"],
                ["🔓 חשיפת ניחושים","ניחוש משחק נחשף לכולם ברגע שריקת הפתיחה"],
                ["🔐 נעילה וחשיפה","בתים · אלופה · מלך שערים · כמות שערים — ננעלים ונחשפים לכולם בשריקת הפתיחה של המשחק הראשון בטורניר"],
                ["🏠 בתים","2נק׳ לניחוש מדויק של מקום (1 או 2) · 5נק׳ לשני המיקומים המדויקים · הניקוד מחושב בסיום כל בית"],
                ["⚽ שלב בתים — כיוון","1נק׳"],["✅ שלב בתים — מדויק","3נק׳ (1+2 בונוס)"],
                ["🏆 32 האחרונות / שמינית גמר","כיוון: 2נק׳ · מדויק: +5נק׳"],
                ["🏆 רבע גמר","כיוון: 4נק׳ · מדויק: +8נק׳"],
                ["🏆 חצי גמר / מקום שלישי","כיוון: 5נק׳ · מדויק: +10נק׳"],
                ["🏆 גמר","כיוון: 8נק׳ · מדויק: +15נק׳"],
                ["🥇 אלופה","12 נק׳ · מחושב בסיום הטורניר"],
                ["👟 מלך שערים","12 נק׳ · מחושב בסיום הטורניר"],
                ["⚽ סה״כ שערים","הקרוב ביותר מקבל 10 נק׳ — מחושב בסיום הטורניר"],
                ["🤖 תוצאות","מתעדכנות אוטומטית מ-API בזמן אמת"],
              ].map(([t,v])=>(
                <div key={t} className="rule-row"><div className="rule-title">{t}</div><div className="rule-text">{v}</div></div>
              ))}
            </div>
          )}
          {tab==="admin"&&isAdmin&&(
            <AdminPanel participants={participants} game={game} showToast={showToast} onTriggerWinner={()=>setShowWinner(true)}/>
          )}
          {tab==="assistant"&&(isAdmin||isAssistant)&&(
            <AssistantPanel participants={participants} showToast={showToast}/>
          )}
        </div>
        </div>{/* /main-content */}
      </div>
    </div>
    {dailyRankAnim&&(
      <DailyRankAnimation data={dailyRankAnim} onClose={()=>setDailyRankAnim(null)}/>
    )}
    {showWinner&&appLeader&&(
      <WinnerAnnouncement
        winner={appLeader}
        isFinal={tournamentOver}
        onClose={()=>setShowWinner(false)}
      />
    )}
    {showProfileEdit&&authUser&&(
      <ProfileEditModal
        authUser={authUser}
        currentParticipant={me}
        onClose={()=>setShowProfileEdit(false)}
        showToast={showToast}
      />
    )}
  </>
  );
}

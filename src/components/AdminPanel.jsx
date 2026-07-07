import { useState } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db, saveParticipant, saveGame } from "../firebase.js";
import { GROUP_MATCHES, GROUPS_2026, KO_BRACKET } from "../constants/tournament.js";
import { API_SOURCES, SOFA_TEAM_MAP } from "../constants/api.js";
import { probeApiSource } from "../utils/api.js";
import { timeAgo, tsToLocal, resizeImageToDataURL, getCardCounts, withFlag, buildKnockoutSchedule } from "../utils/helpers.js";
import { NumStepper } from "./common.jsx";
import { KnockoutBracketView, buildMockKnockoutPreview } from "./StandingsViews.jsx";

function KoPreviewSection(){
  const [mock, setMock] = useState(null);
  const open = () => setMock(buildMockKnockoutPreview());
  return (
    <>
      <div className="admin-winner-section">
        <div className="admin-action-info">
          <span className="admin-action-label">🏆 דוגמת שלב הנוקאאוט</span>
          <span className="admin-action-desc">תצוגה מקדימה עם נבחרות אקראיות — רק אתה רואה את זה, לא נשמר ולא נשלח לאף אחד</span>
        </div>
        <button className="btn-admin-winner" onClick={open}>הצג דוגמה</button>
      </div>
      {mock && (
        <div onClick={()=>setMock(null)} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:9999,
          display:"flex", flexDirection:"column", alignItems:"center", padding:"1.5rem 1rem", overflow:"auto",
        }}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%", maxWidth:"100%"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem"}}>
              <span style={{color:"#fff", fontWeight:600}}>🔒 דוגמה פרטית — רק אתה רואה את זה</span>
              <button className="btn-admin-act" onClick={()=>setMock(null)}>✕ סגור</button>
            </div>
            <KnockoutBracketView results={mock} teamNames={{}}/>
          </div>
        </div>
      )}
    </>
  );
}

function ScoreSyncDebug(){
  const [info,setInfo]=useState(null);
  const [busy,setBusy]=useState(false);
  const run=async()=>{
    setBusy(true);
    const out={events:[], sync:null, errors:[]};
    try{
      const s=await getDoc(doc(db,"mundial2026","sync"));
      out.sync=s.exists()?s.data():null;
    }catch(e){out.errors.push("sync read: "+e.message);}
    const heb=n=>SOFA_TEAM_MAP[n]||n;
    const now=new Date();
    const ymdOf=off=>{const x=new Date(now.getTime()+off*86400000);return `${x.getFullYear()}${String(x.getMonth()+1).padStart(2,'0')}${String(x.getDate()).padStart(2,'0')}`;};
    for(const ymd of [ymdOf(-1),ymdOf(0),ymdOf(1)]){
      try{
        const r=await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${ymd}`);
        const d=await r.json();
        for(const ev of (d.events||[])){
          const comp=ev.competitions?.[0];
          const hC=comp?.competitors?.find(c=>c.homeAway==="home");
          const aC=comp?.competitors?.find(c=>c.homeAway==="away");
          out.events.push({
            ymd,
            home:heb(hC?.team?.displayName||"?"),
            away:heb(aC?.team?.displayName||"?"),
            score:`${hC?.score??"-"}:${aC?.score??"-"}`,
            state:comp?.status?.type?.state||"?",
          });
        }
      }catch(e){out.errors.push(ymd+": "+e.message);}
    }
    setInfo(out);
    setBusy(false);
  };
  return(
    <div className="admin-bet-editor">
      <div className="admin-bet-title">🩺 דיבאג סנכרון תוצאות</div>
      <button className="btn-admin-act" onClick={run} disabled={busy}>{busy?"בודק...":"בדוק מה ESPN מחזיר"}</button>
      {info&&(
        <div style={{fontSize:".62rem",marginTop:".5rem",direction:"ltr",textAlign:"left",lineHeight:1.5}}>
          <div>lastSync: {info.sync?.lastSync||"—"}</div>
          <div>events found: {info.events.length}</div>
          {info.events.map((e,i)=><div key={i}>{e.ymd}: {e.home} {e.score} {e.away} [{e.state}]</div>)}
          {info.errors.map((e,i)=><div key={i} style={{color:"#f88"}}>ERR {e}</div>)}
        </div>
      )}
    </div>
  );
}

function ApiHealthPanel(){
  const [results,setResults]=useState({});
  const [running,setRunning]=useState(false);
  const ICON={ok:"🟢",warn:"🟡",error:"🔴",loading:"⏳"};
  const runAll=async()=>{
    setRunning(true);
    setResults(Object.fromEntries(API_SOURCES.map(s=>[s.id,{level:"loading"}])));
    await Promise.all(API_SOURCES.map(async s=>{
      const r=await probeApiSource(s);
      setResults(prev=>({...prev,[s.id]:r}));
    }));
    setRunning(false);
  };
  return(
    <div className="api-health">
      <div className="api-health-hdr">
        <span>🩺 בריאות ה-API</span>
        <button className="btn-admin-act" onClick={runAll} disabled={running}>{running?"בודק...":"בדוק הכל"}</button>
      </div>
      <div className="api-health-list">
        {API_SOURCES.map(s=>{
          const r=results[s.id];
          return(
            <div key={s.id} className="api-health-row">
              <span className="api-status-icon">{r?(ICON[r.level]||"⚪"):"⚪"}</span>
              <div className="api-health-info">
                <span className="api-health-name">{s.label}{s.needsToken&&<span className="api-token-tag" title="דורש טוקן">🔑</span>}</span>
                <span className="api-health-msg">
                  {r?(r.level==="loading"?"בודק...":r.msg):"לא נבדק"}
                  {r&&r.ms!=null&&r.level!=="loading"?` · ${r.ms}ms`:""}
                </span>
                {r?.detail&&<span className="api-health-detail">{r.detail}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="section-note">🟢 תקין · 🟡 מגיב אך ריק/מכסה גבוהה · 🔴 שגיאה או טוקן שנגמר · 🔑 דורש טוקן. בדיקות <code>/api/*</code> עובדות רק בפרודקשן (Vercel), לא ב-dev מקומי.</p>
    </div>
  );
}

function CardsSection({participants, game, showToast}){
  const [uid, setUid] = useState("");
  const [red, setRed] = useState(0);
  const [yellow, setYellow] = useState(0);
  const [saving, setSaving] = useState(false);

  const onUidChange = (newUid) => {
    setUid(newUid);
    const p = participants.find(p=>p.uid===newUid);
    if(p){
      const c = getCardCounts(p, game?.results||{});
      setRed(c.red);
      setYellow(c.yellow);
    }
  };

  const save = async () => {
    if(!uid) return;
    setSaving(true);
    try{
      await updateDoc(doc(db,"mundial2026","game"),{[`results.cards.${uid}`]: {red, yellow}});
      showToast("✅ כרטיסים עודכנו");
    }catch(e){showToast("❌ "+e.message);}
    setSaving(false);
  };

  return(
    <div className="admin-bet-editor">
      <div className="admin-bet-title">🟥🟨 כרטיסים בטבלת הדירוג</div>
      <div className="admin-bet-selects">
        <select className="admin-bet-sel" value={uid} onChange={e=>onUidChange(e.target.value)}>
          <option value="">— בחר שחקן —</option>
          {participants.filter(p=>!p.isBot).map(p=><option key={p.uid} value={p.uid}>{p.name}</option>)}
        </select>
      </div>
      {uid&&(
        <div className="admin-bet-row">
          <span className="redcard" style={{display:"inline-block"}}/>
          <NumStepper value={red} onChange={setRed} max={20}/>
          <span className="yellowcard" style={{display:"inline-block"}}/>
          <NumStepper value={yellow} onChange={setYellow} max={20}/>
          <button className="btn-admin-save-bet" onClick={save} disabled={saving}>{saving?"שומר...":"שמור"}</button>
        </div>
      )}
    </div>
  );
}

// Admin penalty editor — deducts points from a player's total (e.g. 2 pts for skipping a
// shared match screening). Stored at results.penalties[uid] and subtracted in calcScore.
function PenaltySection({participants, game, showToast}){
  const [uid, setUid] = useState("");
  const [pts, setPts] = useState(0);
  const [saving, setSaving] = useState(false);

  const onUidChange = (newUid) => {
    setUid(newUid);
    setPts(game?.results?.penalties?.[newUid] || 0);
  };

  const save = async () => {
    if(!uid) return;
    setSaving(true);
    try{
      await updateDoc(doc(db,"mundial2026","game"),{[`results.penalties.${uid}`]: pts});
      showToast("✅ עונש עודכן");
    }catch(e){showToast("❌ "+e.message);}
    setSaving(false);
  };

  return(
    <div className="admin-bet-editor">
      <div className="admin-bet-title">📺 עונש הברזה (הורדת נקודות)</div>
      <p className="section-note">מוריד נקודות מהניקוד הכולל של השחקן. 2 נק׳ לכל הברזה מהקרנה משותפת.</p>
      <div className="admin-bet-selects">
        <select className="admin-bet-sel" value={uid} onChange={e=>onUidChange(e.target.value)}>
          <option value="">— בחר שחקן —</option>
          {participants.filter(p=>!p.isBot).map(p=><option key={p.uid} value={p.uid}>{p.name}</option>)}
        </select>
      </div>
      {uid&&(
        <div className="admin-bet-row">
          <button className="btn-admin-save-bet" onClick={()=>setPts(p=>Math.max(0,p-2))}>−2</button>
          <span style={{fontWeight:800,fontSize:"1.1rem",minWidth:"3.5rem",textAlign:"center"}}>−{pts} נק׳</span>
          <button className="btn-admin-save-bet" onClick={()=>setPts(p=>p+2)}>+2</button>
          <button className="btn-admin-save-bet" onClick={save} disabled={saving}>{saving?"שומר...":"שמור"}</button>
        </div>
      )}
    </div>
  );
}

// Lets admin tag an existing user bet with the 🎲 (auto-bet) icon without touching
// its score or visibility — reveal timing is still governed by isMatchLocked elsewhere,
// untouched by this flag, so a tagged bet stays hidden until the match locks normally.
function AutoBetTagger({participants, game, showToast}){
  const [uid, setUid] = useState("");
  const [matchId, setMatchId] = useState("");
  const [saving, setSaving] = useState(false);

  const teamNames = game?.playoffNames || {};
  // Knockout fixtures whose teams are known — so the tagger works on KO bets too, not just
  // group matches (koMatches bucket, keyed by bracket id M73..M104).
  const koFixtures = buildKnockoutSchedule(game?.results || {}, teamNames).filter(m=>m.home&&m.away);
  const isKo = koFixtures.some(m=>m.id===matchId);

  const p = uid ? participants.find(p=>p.uid===uid) : null;
  const bucket = isKo ? "koMatches" : "matches";
  const bet = p && matchId ? p.bets?.[bucket]?.[matchId] : null;
  const hasBet = bet && bet.home!=null;

  const toggle = async () => {
    if(!p||!matchId||!hasBet)return;
    setSaving(true);
    try{
      await saveParticipant({...p,bets:{...(p.bets||{}),[bucket]:{...(p.bets?.[bucket]||{}),[matchId]:{...bet,auto:!bet.auto}}}});
      showToast(bet.auto?"✅ הוסר הסימון":"🎲 ההימור סומן כאקראי");
    }catch(e){showToast("❌ "+e.message);}
    setSaving(false);
  };

  return(
    <div className="admin-bet-editor">
      <div className="admin-bet-title">🎲 סימון הימור כ״אקראי״</div>
      <div className="admin-bet-selects">
        <select className="admin-bet-sel" value={uid} onChange={e=>setUid(e.target.value)}>
          <option value="">— בחר משתמש —</option>
          {participants.filter(p=>!p.isBot).map(p=><option key={p.uid} value={p.uid}>{p.name}</option>)}
        </select>
        <select className="admin-bet-sel" value={matchId} onChange={e=>setMatchId(e.target.value)}>
          <option value="">— בחר משחק —</option>
          <optgroup label="שלב הבתים">
            {GROUP_MATCHES.map(m=><option key={m.id} value={m.id}>{m.home} – {m.away} ({m.date})</option>)}
          </optgroup>
          {koFixtures.length>0&&(
            <optgroup label="נוקאאוט">
              {koFixtures.map(m=><option key={m.id} value={m.id}>{m.home} – {m.away} ({m.stage})</option>)}
            </optgroup>
          )}
        </select>
      </div>
      {uid&&matchId&&(
        <div className="admin-bet-row">
          {hasBet
            ? <span className="admin-bet-team">הימור: {bet.home}–{bet.away}{bet.auto?" (מסומן 🎲)":""}</span>
            : <span className="admin-bet-team">אין הימור למשתמש זה על המשחק הזה</span>}
          <button className="btn-admin-save-bet" onClick={toggle} disabled={saving||!hasBet}>
            {saving?"שומר...":bet?.auto?"🎲 הסר סימון":"🎲 סמן כאקראי"}
          </button>
        </div>
      )}
    </div>
  );
}

function AssistantLockToggle({game, showToast}){
  const [saving,setSaving]=useState(false);
  const locked=!!game?.assistantLocked;
  const toggle=async()=>{
    setSaving(true);
    try{
      await updateDoc(doc(db,"mundial2026","game"),{assistantLocked:!locked});
      showToast(locked?"🐒 גישת עוזר נפתחה":"🔒 גישת עוזר ננעלה");
    }catch(e){showToast("❌ "+e.message);}
    setSaving(false);
  };
  return(
    <div className="admin-winner-section">
      <div className="admin-action-info">
        <span className="admin-action-label">🐒 עוזר מאמן</span>
        <span className="admin-action-desc">{locked?"גישה חסומה — אמיר לא יכול לערוך":"גישה פתוחה — אמיר יכול לערוך שמות ותמונות"}</span>
      </div>
      <button className="btn-admin-winner" style={{background:locked?"var(--green)":"#c0392b"}} onClick={toggle} disabled={saving}>
        {saving?"...":locked?"פתח":"נעל"}
      </button>
    </div>
  );
}

function GroupBetsEditor({participants, showToast}){
  const [uid, setUid] = useState("");
  const [group, setGroup] = useState("");
  const [picks, setPicks] = useState([]);
  const [saving, setSaving] = useState(false);

  const teams = group ? GROUPS_2026[group] || [] : [];
  const p = participants.find(x => x.uid === uid);

  const selectUid = id => {
    setUid(id);
    setGroup("");
    setPicks([]);
  };
  const selectGroup = g => {
    setGroup(g);
    const existing = participants.find(x => x.uid === uid)?.bets?.groups?.[g] || [];
    setPicks(existing.slice(0, 2));
  };
  const toggleTeam = t => {
    if(picks[0] === t) { setPicks(picks.slice(1)); return; }
    if(picks[1] === t) { setPicks([picks[0]]); return; }
    if(picks.length < 2) setPicks([...picks, t]);
  };

  const save = async () => {
    if(!uid || !group || picks.length !== 2) return;
    setSaving(true);
    try {
      await updateDoc(doc(db,"mundial2026","game","participants",uid),{
        [`bets.groups.${group}`]: picks,
      });
      showToast(`✅ הימור בית ${group} עודכן ל-${p?.name}`);
    } catch(e) { showToast("❌ "+e.message); }
    setSaving(false);
  };

  return(
    <div className="admin-bet-editor">
      <div className="admin-bet-title">🏠 עריכת הימורי בתים</div>
      <div className="admin-bet-selects">
        <select className="admin-bet-sel" value={uid} onChange={e=>selectUid(e.target.value)}>
          <option value="">— בחר שחקן —</option>
          {participants.filter(x=>!x.isBot).map(x=><option key={x.uid} value={x.uid}>{x.name}</option>)}
        </select>
        <select className="admin-bet-sel" value={group} onChange={e=>selectGroup(e.target.value)} disabled={!uid}>
          <option value="">— בחר בית —</option>
          {Object.keys(GROUPS_2026).map(g=><option key={g} value={g}>בית {g}</option>)}
        </select>
      </div>
      {uid && group && (
        <>
          <div style={{fontSize:".65rem",color:"var(--muted)",marginBottom:".3rem",textAlign:"right",direction:"rtl"}}>
            {picks[0]?`1: ${withFlag(picks[0])}`:"1: —"} · {picks[1]?`2: ${withFlag(picks[1])}`:"2: —"}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:".35rem",justifyContent:"flex-end"}}>
            {teams.map(t=>{
              const pos = picks.indexOf(t);
              return(
                <button key={t}
                  className={`btn-admin-act${pos>=0?" btn-admin-save-bet":""}`}
                  style={{fontSize:".7rem",padding:".25rem .5rem",position:"relative"}}
                  onClick={()=>toggleTeam(t)}>
                  {pos === 0 && <span style={{fontSize:".55rem",marginLeft:".2rem",opacity:.8}}>①</span>}
                  {pos === 1 && <span style={{fontSize:".55rem",marginLeft:".2rem",opacity:.8}}>②</span>}
                  {withFlag(t)}
                </button>
              );
            })}
          </div>
          <div style={{marginTop:".5rem",textAlign:"left"}}>
            <button className="btn-admin-save-bet" onClick={save} disabled={saving||picks.length!==2}>
              {saving?"שומר...":"שמור"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function KoResultEditor({game, showToast}){
  const teamNames = game?.playoffNames || {};
  const sched = buildKnockoutSchedule(game?.results||{}, teamNames).filter(m=>m.home&&m.away);
  const [mid, setMid] = useState("");
  const [h, setH] = useState("");
  const [a, setA] = useState("");
  const [ph, setPh] = useState("");
  const [pa, setPa] = useState("");
  const [busy, setBusy] = useState(false);
  const m = mid ? sched.find(x=>x.id===mid) : null;
  const ov = mid ? game?.results?.koOverrides?.[mid] : null;

  const save = async () => {
    if(!mid || h===""|| a==="") { showToast("❌ הזן תוצאה"); return; }
    setBusy(true);
    try{
      const entry = { home:+h, away:+a };
      if(ph!==""&&pa!=="") entry.pens = { home:+ph, away:+pa };
      await updateDoc(doc(db,"mundial2026","game"),{[`results.koOverrides.${mid}`]: entry});
      showToast("✅ תוצאת הנוקאאוט נשמרה (גוברת על הסנכרון)");
    }catch(e){showToast("❌ "+e.message);}
    setBusy(false);
  };
  const clear = async () => {
    if(!mid) return;
    setBusy(true);
    try{
      const { deleteField } = await import("firebase/firestore");
      await updateDoc(doc(db,"mundial2026","game"),{[`results.koOverrides.${mid}`]: deleteField()});
      showToast("🗑️ ההתאמה הוסרה — חוזר לסנכרון האוטומטי");
    }catch(e){showToast("❌ "+e.message);}
    setBusy(false);
  };

  return(
    <div className="admin-bet-editor">
      <div className="admin-bet-title">✏️ עריכת תוצאת נוקאאוט</div>
      <div className="admin-bet-selects">
        <select className="admin-bet-sel" value={mid} onChange={e=>{const v=e.target.value;setMid(v);const x=sched.find(s=>s.id===v);const o=game?.results?.koOverrides?.[v];setH(o?.home??x?.res?.home??"");setA(o?.away??x?.res?.away??"");setPh(o?.pens?.home??x?.res?.pens?.home??"");setPa(o?.pens?.away??x?.res?.pens?.away??"");}}>
          <option value="">— בחר משחק —</option>
          {sched.map(x=><option key={x.id} value={x.id}>{x.stage} · {(teamNames[x.home]||x.home)} – {(teamNames[x.away]||x.away)} ({x.date})</option>)}
        </select>
      </div>
      {m&&(
        <>
          <div className="admin-bet-row" dir="rtl">
            <span className="admin-bet-team">{withFlag(teamNames[m.home]||m.home)}</span>
            <input className="admin-bet-sel" style={{width:"3rem",textAlign:"center"}} type="number" min="0" value={h} onChange={e=>setH(e.target.value)}/>
            <span>:</span>
            <input className="admin-bet-sel" style={{width:"3rem",textAlign:"center"}} type="number" min="0" value={a} onChange={e=>setA(e.target.value)}/>
            <span className="admin-bet-team">{withFlag(teamNames[m.away]||m.away)}</span>
          </div>
          <div className="admin-bet-row" dir="rtl" style={{gap:".4rem",alignItems:"center"}}>
            <span style={{fontSize:".72rem",color:"var(--muted)"}}>פנדלים (רק בתיקו):</span>
            <input className="admin-bet-sel" style={{width:"3rem",textAlign:"center"}} type="number" min="0" placeholder="–" value={ph} onChange={e=>setPh(e.target.value)}/>
            <span>:</span>
            <input className="admin-bet-sel" style={{width:"3rem",textAlign:"center"}} type="number" min="0" placeholder="–" value={pa} onChange={e=>setPa(e.target.value)}/>
          </div>
          <div className="admin-bet-row">
            <button className="btn-admin-save-bet" onClick={save} disabled={busy}>{busy?"...":"💾 שמור תוצאה"}</button>
            {ov&&<button className="btn-admin-save-bet" style={{background:"#7a2b2b"}} onClick={clear} disabled={busy}>🗑️ הסר התאמה</button>}
          </div>
        </>
      )}
      <div style={{fontSize:".6rem",color:"var(--muted)",marginTop:".3rem",textAlign:"right",direction:"rtl"}}>
        קובע תוצאה ידנית למשחק נוקאאוט שגוברת על הסנכרון האוטומטי ולא נדרסת. בתיקו שמוכרע בפנדלים — מלא גם פנדלים כדי שהמנצחת תעלה. להסרה לחץ "הסר התאמה".
      </div>
    </div>
  );
}

function ForceResyncEditor({game, showToast}){
  const [mid, setMid] = useState("");
  const [busy, setBusy] = useState(false);

  const gm = mid ? GROUP_MATCHES.find(x=>x.id===mid) : null;
  const km = mid && !gm ? KO_BRACKET.find(x=>x.id===mid) : null;
  const m = gm || km;
  const cur = gm ? game?.results?.matches?.[mid] : null;
  const pending = mid ? game?.forceResync?.[mid] === true : false;

  const run = async () => {
    if(!mid) return;
    setBusy(true);
    try{
      await updateDoc(doc(db,"mundial2026","game"),{[`forceResync.${mid}`]: true});
      showToast("🔄 בקשת סנכרון נשלחה — יתעדכן תוך ~15 שניות");
    }catch(e){showToast("❌ "+e.message);}
    setBusy(false);
  };

  return(
    <div className="admin-bet-editor">
      <div className="admin-bet-title">🔄 סנכרון מחדש של משחק</div>
      <div className="admin-bet-selects">
        <select className="admin-bet-sel" value={mid} onChange={e=>setMid(e.target.value)}>
          <option value="">— בחר משחק —</option>
          <optgroup label="שלב הבתים">
            {GROUP_MATCHES.map(x=><option key={x.id} value={x.id}>{x.home} – {x.away} ({x.date})</option>)}
          </optgroup>
          <optgroup label="נוקאאוט">
            {KO_BRACKET.map(x=><option key={x.id} value={x.id}>{x.stage} · {x.date} ({x.id})</option>)}
          </optgroup>
        </select>
      </div>
      {m&&(
        <div className="admin-bet-row">
          <span className="admin-bet-team" dir="rtl">
            {gm
              ? `${gm.home} ${cur?.home!=null?`${cur.away} : ${cur.home}`:"– : –"} ${gm.away}`
              : `${km.stage} · ${km.date}`}
          </span>
          <button className="btn-admin-save-bet" onClick={run} disabled={busy||pending}>
            {pending?"ממתין...":busy?"...":"סנכרן עכשיו"}
          </button>
        </div>
      )}
      <div style={{fontSize:".6rem",color:"var(--muted)",marginTop:".3rem",textAlign:"right",direction:"rtl"}}>
        מושך מחדש את התוצאה וכל הנתונים מה-API ודורס את מה ששמור — עוקף את ההגנות שמונעות עדכון. כולל כל משחקי הנוקאאוט עד הגמר.
      </div>
    </div>
  );
}

export default function AdminPanel({ participants, game, showToast, onTriggerWinner }) {
  const [confirmAction, setConfirmAction] = useState(null);
  const [running, setRunning] = useState(false);
  const [editUid, setEditUid] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [betUid, setBetUid] = useState("");
  const [betMatchId, setBetMatchId] = useState("");
  const [betHome, setBetHome] = useState(0);
  const [betAway, setBetAway] = useState(0);
  const [betSaving, setBetSaving] = useState(false);
  const [funIran, setFunIran] = useState(game?.results?.funResult?.iran ?? 0);
  const [funIsrael, setFunIsrael] = useState(game?.results?.funResult?.israel ?? 0);
  const [funSaving, setFunSaving] = useState(false);
  const [funRevealSaving, setFunRevealSaving] = useState(false);
  const [funLockSaving, setFunLockSaving] = useState(false);
  const [funHideSaving, setFunHideSaving] = useState(false);
  const saveFunResult = async () => {
    setFunSaving(true);
    try { await updateDoc(doc(db,"mundial2026","game"),{"results.funResult": {iran: funIran, israel: funIsrael}}); showToast("✅ תוצאת הפצצה נשמרה!"); }
    catch(e) { showToast("❌ "+e.message); }
    setFunSaving(false);
  };
  const toggleFunReveal = async () => {
    setFunRevealSaving(true);
    const next = !game?.results?.funRevealed;
    try { await updateDoc(doc(db,"mundial2026","game"),{"results.funRevealed": next}); showToast(next?"✅ הימורים נחשפו!":"✅ הימורים הוסתרו"); }
    catch(e) { showToast("❌ "+e.message); }
    setFunRevealSaving(false);
  };
  const toggleFunLock = async () => {
    setFunLockSaving(true);
    const next = !game?.results?.funLocked;
    try { await updateDoc(doc(db,"mundial2026","game"),{"results.funLocked": next}); showToast(next?"🔒 הימור ננעל":"🔓 הימור נפתח"); }
    catch(e) { showToast("❌ "+e.message); }
    setFunLockSaving(false);
  };
  const toggleFunHide = async () => {
    setFunHideSaving(true);
    const next = !game?.results?.funHidden;
    try { await updateDoc(doc(db,"mundial2026","game"),{"results.funHidden": next}); showToast(next?"👁 סקשן הוסתר":"👁 סקשן מוצג"); }
    catch(e) { showToast("❌ "+e.message); }
    setFunHideSaving(false);
  };

  // Knockout fixtures whose teams are seated — editable per-user just like group matches.
  const betKoSched = buildKnockoutSchedule(game?.results||{}, game?.playoffNames||{}).filter(m=>m.home&&m.away);
  const isKoBet = id => KO_BRACKET.some(k=>k.id===id);
  const betBucket = id => isKoBet(id) ? "koMatches" : "matches";
  const betMatchObj = !betMatchId ? null
    : isKoBet(betMatchId) ? betKoSched.find(m=>m.id===betMatchId) : GROUP_MATCHES.find(m=>m.id===betMatchId);

  const onBetMatchChange = (uid, mid) => {
    setBetMatchId(mid);
    if(uid && mid) {
      const existing = participants.find(p=>p.uid===uid)?.bets?.[betBucket(mid)]?.[mid];
      setBetHome(existing?.home ?? 0);
      setBetAway(existing?.away ?? 0);
    }
  };
  const onBetUidChange = (uid) => {
    setBetUid(uid);
    if(uid && betMatchId) {
      const existing = participants.find(p=>p.uid===uid)?.bets?.[betBucket(betMatchId)]?.[betMatchId];
      setBetHome(existing?.home ?? 0);
      setBetAway(existing?.away ?? 0);
    }
  };
  const saveBet = async () => {
    if(!betUid||!betMatchId)return;
    const p=participants.find(p=>p.uid===betUid);
    if(!p)return;
    setBetSaving(true);
    try{
      const bucket = betBucket(betMatchId);
      await saveParticipant({...p,bets:{...(p.bets||{}),[bucket]:{...(p.bets?.[bucket]||{}),[betMatchId]:{home:betHome,away:betAway,adminEdited:true}}}});
      showToast("✅ הימור עודכן");
    }catch(e){showToast("❌ "+e.message);}
    setBetSaving(false);
  };

  const actions = [
    {
      id: "allMatchBets",
      label: "אפס כל הימורי המשחקים",
      desc: "מוחק ניחושי משחקים של כולם — ידידות + מונדיאל (הימורים כלליים נשארים)",
      icon: "🧹",
      danger: true,
      run: async () => {
        for (const p of participants.filter(p=>!p.isBot)) {
          await saveParticipant({...p, bets: {...p.bets, matches: {}}});
        }
      }
    },
    {
      id: "allBets",
      label: "אפס הכל לחלוטין",
      desc: "מוחק כל ההימורים של כולם (משחקים + כלליים) + כל התוצאות",
      icon: "☠️",
      danger: true,
      run: async () => {
        for (const p of participants.filter(p=>!p.isBot)) {
          await saveParticipant({...p, bets: {}});
        }
        await saveGame({results: {}});
      }
    }
  ];

  const execute = async () => {
    if (!confirmAction) return;
    setRunning(true);
    try {
      await confirmAction.run();
      showToast(`✅ ${confirmAction.label} — בוצע!`);
    } catch(e) {
      showToast("❌ שגיאה: " + e.message);
    }
    setRunning(false);
    setConfirmAction(null);
  };

  return (
    <div className="section admin-panel">
      <h2>⚙️ פאנל מנהל</h2>
      <div className="admin-presence">
        <div className="admin-presence-title">👥 כניסות אחרונות</div>
        {[...participants].filter(p=>!p.isBot).sort((a,b)=>(b.lastSeen||0)-(a.lastSeen||0)).map(p=>(
          <div key={p.uid} className="admin-presence-row">
            {p.photoURL
              ?<img src={p.photoURL} className="ap-avatar" alt=""/>
              :<div className="ap-avatar-ph">{(p.name||"?")[0]}</div>}
            <span className="ap-name">{p.name}</span>
            {editUid===p.uid?(
              <>
                <input type="datetime-local" className="ap-date-input" value={editDate}
                  onChange={e=>setEditDate(e.target.value)}/>
                <button className="ap-btn-save" onClick={async()=>{
                  if(!editDate)return;
                  await updateDoc(doc(db,"mundial2026","game","participants",p.uid),{lastSeen:new Date(editDate).getTime()});
                  setEditUid(null);
                  showToast("✅ עודכן");
                }}>✓</button>
                <button className="ap-btn-cancel" onClick={()=>setEditUid(null)}>✕</button>
              </>
            ):(
              <>
                <span className="ap-time">{timeAgo(p.lastSeen)}</span>
                <button className="ap-btn-edit" onClick={()=>{setEditUid(p.uid);setEditDate(tsToLocal(p.lastSeen||Date.now()));}}>✏️</button>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="admin-stats">
        <div className="admin-stat"><span className="admin-stat-val">{participants.filter(p=>!p.isBot).length}</span><span>משתתפים</span></div>
        <div className="admin-stat"><span className="admin-stat-val">{Object.keys(game.results?.matches||{}).length}</span><span>תוצאות שמורות</span></div>
        <div className="admin-stat"><span className="admin-stat-val">{GROUP_MATCHES.length}</span><span>משחקי ליגה</span></div>
      </div>
      <ApiHealthPanel/>
      <ScoreSyncDebug/>
      <div className="admin-winner-section">
        <div className="admin-action-info">
          <span className="admin-action-label">🎉 אנימציית מנצח</span>
          <span className="admin-action-desc">מציג את חלון הניצחון עם קונפטי למנצח הנוכחי</span>
        </div>
        <button className="btn-admin-winner" onClick={onTriggerWinner}>הפעל</button>
      </div>
      <AssistantLockToggle game={game} showToast={showToast}/>
      <KoPreviewSection/>
      <div className="admin-fun-bet-section">
        <div className="admin-action-info">
          <span className="admin-action-label">🚀 איראן – ישראל · שיגורים</span>
          <span className="admin-action-desc">לא נחשב בניקוד</span>
        </div>
        <div className="admin-fun-bet-row">
          <span className="admin-fun-flag">🇮🇷</span>
          <NumStepper value={funIran} onChange={setFunIran} max={9999}/>
          <span className="admin-fun-flag">–</span>
          <NumStepper value={funIsrael} onChange={setFunIsrael} max={9999}/>
          <span className="admin-fun-flag">🇮🇱</span>
          <button className="btn-admin-save-bet" onClick={saveFunResult} disabled={funSaving}>{funSaving?"שומר...":"שמור תוצאה"}</button>
        </div>
        <div className="admin-fun-bet-row" style={{gap:".4rem"}}>
          <button className="btn-admin-fun-reveal" style={{flex:1}} onClick={toggleFunReveal} disabled={funRevealSaving}>
            {funRevealSaving?"...":game?.results?.funRevealed?"🔓 הסתר":"🔒 חשוף"}
          </button>
          <button className="btn-admin-fun-lock" style={{flex:1}} onClick={toggleFunLock} disabled={funLockSaving}>
            {funLockSaving?"...":game?.results?.funLocked?"🟢 פתח":"🔴 נעל"}
          </button>
          <button className="btn-admin-fun-hide" style={{flex:1}} onClick={toggleFunHide} disabled={funHideSaving}>
            {funHideSaving?"...":game?.results?.funHidden?"👁 הצג":"🙈 הסתר"}
          </button>
        </div>
      </div>
      <CardsSection participants={participants} game={game} showToast={showToast}/>
      <PenaltySection participants={participants} game={game} showToast={showToast}/>
      <AutoBetTagger participants={participants} game={game} showToast={showToast}/>
      <KoResultEditor game={game} showToast={showToast}/>
      <ForceResyncEditor game={game} showToast={showToast}/>
      <GroupBetsEditor participants={participants} showToast={showToast}/>
      <div className="admin-bet-editor">
        <div className="admin-bet-title">✏️ עריכת הימור משחק</div>
        <div className="admin-bet-selects">
          <select className="admin-bet-sel" value={betUid} onChange={e=>onBetUidChange(e.target.value)}>
            <option value="">— בחר שחקן —</option>
            {participants.filter(p=>!p.isBot).map(p=><option key={p.uid} value={p.uid}>{p.name}</option>)}
          </select>
          <select className="admin-bet-sel" value={betMatchId} onChange={e=>onBetMatchChange(betUid,e.target.value)}>
            <option value="">— בחר משחק —</option>
            <optgroup label="שלב הבתים">
              {GROUP_MATCHES.map(m=><option key={m.id} value={m.id}>{m.home} – {m.away} ({m.date})</option>)}
            </optgroup>
            <optgroup label="נוקאאוט">
              {betKoSched.map(m=><option key={m.id} value={m.id}>{m.home} – {m.away} ({m.stage} · {m.date})</option>)}
            </optgroup>
          </select>
        </div>
        {betUid&&betMatchId&&(
          <div className="admin-bet-row">
            <span className="admin-bet-team">{betMatchObj?.home}</span>
            <input type="number" min="0" max="20" value={betHome} onChange={e=>setBetHome(+e.target.value)} className="admin-score-in"/>
            <span className="admin-bet-sep">:</span>
            <input type="number" min="0" max="20" value={betAway} onChange={e=>setBetAway(+e.target.value)} className="admin-score-in"/>
            <span className="admin-bet-team">{betMatchObj?.away}</span>
            <button className="btn-admin-save-bet" onClick={saveBet} disabled={betSaving}>{betSaving?"שומר...":"שמור"}</button>
          </div>
        )}
      </div>
      <div className="admin-actions">
        {actions.map(a=>(
          <div key={a.id} className={`admin-action-row ${a.danger?"admin-action-danger":""}`}>
            <div className="admin-action-info">
              <span className="admin-action-label">{a.icon} {a.label}</span>
              <span className="admin-action-desc">{a.desc}</span>
            </div>
            <button className={`btn-admin-act ${a.danger?"btn-admin-red":""}`} onClick={()=>setConfirmAction(a)}>אפס</button>
          </div>
        ))}
      </div>
      {confirmAction&&(
        <div className="admin-overlay" onClick={()=>setConfirmAction(null)}>
          <div className="admin-confirm" onClick={e=>e.stopPropagation()}>
            <div className="admin-confirm-title">אישור פעולה</div>
            <div className="admin-confirm-action">{confirmAction.icon} {confirmAction.label}</div>
            <div className="admin-confirm-desc">{confirmAction.desc}</div>
            <div className="admin-confirm-warn">⚠️ פעולה זו בלתי הפיכה!</div>
            <div className="admin-confirm-btns">
              <button className="btn-cancel-admin" onClick={()=>setConfirmAction(null)} disabled={running}>ביטול</button>
              <button className="btn-confirm-admin" onClick={execute} disabled={running}>{running?"מבצע...":"כן, אפס!"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AssistantPanel({participants, showToast}){
  const [selectedUid,setSelectedUid]=useState(null);
  const [name,setName]=useState("");
  const [photoData,setPhotoData]=useState(null);
  const [preview,setPreview]=useState(null);
  const [saving,setSaving]=useState(false);
  const [fullscreenPhoto,setFullscreenPhoto]=useState(null);

  const select=p=>{setSelectedUid(p.uid);setName(p.name||"");setPhotoData(null);setPreview(p.photoURL||null);};

  async function handleFileChange(e){
    const f=e.target.files[0];if(!f)return;
    try{const d=await resizeImageToDataURL(f);setPhotoData(d);setPreview(d);}catch{}
  }

  async function handleSave(){
    if(!selectedUid)return;setSaving(true);
    const cur=participants.find(p=>p.uid===selectedUid);
    try{
      await updateDoc(doc(db,"mundial2026","game","participants",selectedUid),{
        name:name.trim()||cur?.name||"",
        photoURL:photoData||(cur?.photoURL||null),
      });
      showToast("✅ פרופיל עודכן");setSelectedUid(null);
    }catch(e){showToast("❌ "+e.message);}
    setSaving(false);
  }

  return(
    <div className="section">
      <div style={{textAlign:"center",marginBottom:".2rem"}}>
        <img src="/amir.png" alt="עוזר מאמן" style={{height:90,objectFit:"contain"}}/>
      </div>
      <h2 style={{textAlign:"center",marginBottom:".2rem"}}>עוזר מאמן</h2>
      <p className="section-note" style={{textAlign:"center"}}>לחץ על משתמש לעריכת שם ותמונה</p>
      <div className="scroll-area">
        {participants.filter(p=>!p.isBot).map(p=>(
          <div key={p.uid} onClick={()=>select(p)} style={{
            display:"flex",alignItems:"center",gap:".75rem",
            padding:".6rem .8rem",borderRadius:"10px",
            background:"var(--card2,#1e2a3a)",cursor:"pointer",
            marginBottom:".4rem",
          }}>
            {p.photoURL
              ?<img src={p.photoURL} style={{width:40,height:40,borderRadius:"50%",objectFit:"cover",flexShrink:0}} alt=""/>
              :<div style={{width:40,height:40,borderRadius:"50%",background:"var(--accent,#4a9eff)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:"bold",color:"#fff"}}>{(p.name||"?")[0]}</div>}
            <span style={{flex:1,fontWeight:500}}>{p.name}</span>
            <span style={{color:"var(--muted,#888)"}}>✏️</span>
          </div>
        ))}
      </div>
      {fullscreenPhoto&&(
        <div onClick={()=>setFullscreenPhoto(null)} style={{
          position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",
          display:"flex",alignItems:"center",justifyContent:"center",
          zIndex:9999,cursor:"zoom-out",
        }}>
          <img src={fullscreenPhoto} alt="" style={{maxWidth:"95vw",maxHeight:"95vh",borderRadius:12,objectFit:"contain"}}/>
        </div>
      )}
      {selectedUid&&(
        <div className="admin-overlay" onClick={()=>setSelectedUid(null)}>
          <div className="admin-confirm profile-modal" onClick={e=>e.stopPropagation()}>
            <div className="admin-confirm-title">עריכת {participants.find(p=>p.uid===selectedUid)?.name}</div>
            <div className="profile-avatar-wrap">
              {preview
                ?<img src={preview} className="profile-avatar-lg" alt="" style={{cursor:"zoom-in"}} onClick={e=>{e.stopPropagation();setFullscreenPhoto(preview);}}/>
                :<div className="profile-avatar-placeholder">👤</div>}
              <label className="btn-upload">שנה תמונה<input type="file" accept="image/*" onChange={handleFileChange} style={{display:"none"}}/></label>
            </div>
            <div className="profile-label">שם תצוגה</div>
            <input className="profile-input" value={name} onChange={e=>setName(e.target.value)} maxLength={30}/>
            <div className="admin-confirm-btns">
              <button className="btn-confirm-admin" style={{background:"var(--green)",color:"#000"}} onClick={handleSave} disabled={saving}>{saving?"שומר...":"שמור"}</button>
              <button className="btn-cancel-admin" onClick={()=>setSelectedUid(null)}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProfileEditModal({authUser,currentParticipant,onClose,showToast}){
  const [name,setName]=useState(currentParticipant?.name||authUser.displayName||"");
  const [photoData,setPhotoData]=useState(null);
  const [preview,setPreview]=useState(currentParticipant?.photoURL||authUser.photoURL||null);
  const [saving,setSaving]=useState(false);

  async function handleFileChange(e){
    const f=e.target.files[0];
    if(!f)return;
    try{
      const data=await resizeImageToDataURL(f);
      setPhotoData(data);
      setPreview(data);
    }catch{ /* ignore */ }
  }

  async function handleSave(){
    setSaving(true);
    try{
      const photoURL=photoData||(currentParticipant?.photoURL||authUser.photoURL||null);
      await updateDoc(doc(db,"mundial2026","game","participants",authUser.uid),{
        name:name.trim()||authUser.displayName,
        photoURL
      });
      showToast("הפרופיל עודכן ✓");
      onClose();
    }catch(e){
      showToast("שגיאה בשמירה");
    }finally{
      setSaving(false);
    }
  }

  return(
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-confirm profile-modal" onClick={e=>e.stopPropagation()}>
        <div className="admin-confirm-title">עריכת פרופיל</div>
        <div className="profile-avatar-wrap">
          {preview?<img src={preview} className="profile-avatar-lg" alt=""/>:<div className="profile-avatar-placeholder">👤</div>}
          <label className="btn-upload">
            שנה תמונה
            <input type="file" accept="image/*" onChange={handleFileChange} style={{display:"none"}}/>
          </label>
        </div>
        <div className="profile-label">שם תצוגה</div>
        <input className="profile-input" value={name} onChange={e=>setName(e.target.value)} maxLength={30}/>
        <div className="admin-confirm-btns">
          <button className="btn-confirm-admin" style={{background:"var(--green)",color:"#000"}} onClick={handleSave} disabled={saving}>{saving?"שומר...":"שמור"}</button>
          <button className="btn-cancel-admin" onClick={onClose}>ביטול</button>
        </div>
      </div>
    </div>
  );
}

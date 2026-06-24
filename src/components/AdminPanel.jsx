import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db, saveParticipant, saveGame } from "../firebase.js";
import { GROUP_MATCHES, GROUPS_2026 } from "../constants/tournament.js";
import { API_SOURCES } from "../constants/api.js";
import { probeApiSource } from "../utils/api.js";
import { timeAgo, tsToLocal, resizeImageToDataURL, getCardCounts, withFlag } from "../utils/helpers.js";
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

// Lets admin tag an existing user bet with the 🎲 (auto-bet) icon without touching
// its score or visibility — reveal timing is still governed by isMatchLocked elsewhere,
// untouched by this flag, so a tagged bet stays hidden until the match locks normally.
function AutoBetTagger({participants, showToast}){
  const [uid, setUid] = useState("");
  const [matchId, setMatchId] = useState("");
  const [saving, setSaving] = useState(false);

  const p = uid ? participants.find(p=>p.uid===uid) : null;
  const bet = p && matchId ? p.bets?.matches?.[matchId] : null;
  const hasBet = bet && bet.home!=null;

  const toggle = async () => {
    if(!p||!matchId||!hasBet)return;
    setSaving(true);
    try{
      await saveParticipant({...p,bets:{...(p.bets||{}),matches:{...(p.bets?.matches||{}),[matchId]:{...bet,auto:!bet.auto}}}});
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
          {GROUP_MATCHES.map(m=><option key={m.id} value={m.id}>{m.home} – {m.away} ({m.date})</option>)}
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

  const onBetMatchChange = (uid, mid) => {
    setBetMatchId(mid);
    if(uid && mid) {
      const existing = participants.find(p=>p.uid===uid)?.bets?.matches?.[mid];
      setBetHome(existing?.home ?? 0);
      setBetAway(existing?.away ?? 0);
    }
  };
  const onBetUidChange = (uid) => {
    setBetUid(uid);
    if(uid && betMatchId) {
      const existing = participants.find(p=>p.uid===uid)?.bets?.matches?.[betMatchId];
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
      await saveParticipant({...p,bets:{...(p.bets||{}),matches:{...(p.bets?.matches||{}),[betMatchId]:{home:betHome,away:betAway,adminEdited:true}}}});
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
      <AutoBetTagger participants={participants} showToast={showToast}/>
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
            {GROUP_MATCHES.map(m=><option key={m.id} value={m.id}>{m.home} – {m.away} ({m.date})</option>)}
          </select>
        </div>
        {betUid&&betMatchId&&(
          <div className="admin-bet-row">
            <span className="admin-bet-team">{GROUP_MATCHES.find(m=>m.id===betMatchId)?.home}</span>
            <input type="number" min="0" max="20" value={betHome} onChange={e=>setBetHome(+e.target.value)} className="admin-score-in"/>
            <span className="admin-bet-sep">:</span>
            <input type="number" min="0" max="20" value={betAway} onChange={e=>setBetAway(+e.target.value)} className="admin-score-in"/>
            <span className="admin-bet-team">{GROUP_MATCHES.find(m=>m.id===betMatchId)?.away}</span>
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

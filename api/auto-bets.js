// Vercel Serverless Function — fills missing bets with a random pick once a match locks.
// Mirrors the client-side auto-fill effect in App.jsx, but runs server-side via cron
// so it doesn't depend on the admin or the user having the app open at lock time.
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { GROUP_MATCHES } from "../src/constants/tournament.js";
import { isMatchLocked, generateAutoBet } from "../src/utils/helpers.js";

function initFirebase() {
  if (getApps().length > 0) return getFirestore();
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({ credential: cert(serviceAccount) });
  return getFirestore();
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = initFirebase();

    const gameSnap = await db.doc("mundial2026/game").get();
    const results = gameSnap.exists ? (gameSnap.data().results || {}) : {};

    const partSnap = await db.collection("mundial2026/game/participants").get();

    const writes = [];
    let filledBets = 0;
    let filledParticipants = 0;

    for (const docSnap of partSnap.docs) {
      const p = docSnap.data();
      if (p.isBot) continue;

      const matchBets = p.bets?.matches || {};
      const autoBets = {};
      for (const m of GROUP_MATCHES) {
        if (!isMatchLocked(m.id, results.matches?.[m.id])) continue;
        const bet = matchBets[m.id];
        if (bet && bet.home != null) continue;
        autoBets[m.id] = generateAutoBet(p.uid, m.id);
      }

      const count = Object.keys(autoBets).length;
      if (!count) continue;

      filledBets += count;
      filledParticipants++;
      writes.push(
        db.doc(`mundial2026/game/participants/${docSnap.id}`).set(
          { bets: { ...(p.bets || {}), matches: { ...matchBets, ...autoBets } } },
          { merge: true }
        )
      );
    }

    await Promise.all(writes);

    return res.status(200).json({ success: true, filledParticipants, filledBets });
  } catch (error) {
    console.error("Auto-bet error:", error);
    return res.status(500).json({ error: error.message });
  }
}

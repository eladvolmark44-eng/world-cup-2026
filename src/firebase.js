import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBdD-8CkgpIKpyWWJvcdmf17ZmLD-cfxLo",
  authDomain: "world-cup-2026-31d78.firebaseapp.com",
  projectId: "world-cup-2026-31d78",
  storageBucket: "world-cup-2026-31d78.firebasestorage.app",
  messagingSenderId: "199163978449",
  appId: "1:199163978449:web:0585aa656d53d8b21c5bf0"
};
export const fbApp = initializeApp(firebaseConfig);
export const db = getFirestore(fbApp);
export const auth = getAuth(fbApp);
export const storage = getStorage(fbApp);
export const googleProvider = new GoogleAuthProvider();

export function generateCode(){return Math.random().toString(36).substring(2,7).toUpperCase();}
export async function loadGame(){
  const snap=await getDoc(doc(db,"mundial2026","game"));
  return snap.exists()?snap.data():{joinCode:generateCode(),results:{},playoffNames:{}};
}
export async function saveGame(data){await setDoc(doc(db,"mundial2026","game"),data,{merge:true});}
export async function saveParticipant(p){await setDoc(doc(db,"mundial2026","game","participants",p.uid),p,{merge:true});}

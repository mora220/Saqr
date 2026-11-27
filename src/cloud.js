// صقر – cloud layer (Firebase Auth + Firestore). Bundled into cloud.js by build.py
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, setDoc, deleteDoc, onSnapshot, query, where, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAMilKT2UhU_o63bXq36gKXHPVPG40Mx3k",
  authDomain: "saqr-daf86.firebaseapp.com",
  projectId: "saqr-daf86",
  storageBucket: "saqr-daf86.firebasestorage.app",
  messagingSenderId: "601780267284",
  appId: "1:601780267284:web:8356fc286212822765ba01"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = "ar";
let recaptcha = null, confirmation = null;
let db;
try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
catch (e) { db = initializeFirestore(app, {}); }

let uid = null, unsub = null;
const last = new Map();               // class id -> JSON last written/seen
const strip = c => { const { owner, updatedAt, ...rest } = c; return rest; };

const Cloud = {
  user: () => auth.currentUser,
  onAuth(cb) { getRedirectResult(auth).catch(() => {}); return onAuthStateChanged(auth, u => { uid = u ? u.uid : null; cb(u); }); },
  async signIn() {
    const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
    try { return await signInWithPopup(auth, p); }
    catch (e) {
      if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/cancelled-popup-request"].includes(e.code)) return signInWithRedirect(auth, p);
      throw e;
    }
  },
  emailIn: (email, pass) => signInWithEmailAndPassword(auth, email, pass),
  async emailUp(name, email, pass) { const r = await createUserWithEmailAndPassword(auth, email, pass); if (name) await updateProfile(r.user, { displayName: name }); return r; },
  resetPass: email => sendPasswordResetEmail(auth, email),
  async phoneSend(phone, buttonId) {
    if (!recaptcha) recaptcha = new RecaptchaVerifier(auth, buttonId, { size: "invisible" });
    try { confirmation = await signInWithPhoneNumber(auth, phone, recaptcha); }
    catch (e) { try { recaptcha.clear(); } catch (_) {} recaptcha = null; throw e; }
  },
  phoneVerify: code => confirmation.confirm(code),
  async signOut() { if (unsub) unsub(); unsub = null; last.clear(); await signOut(auth); },
  // live list of this teacher's classes; cb(classes, hasLocalPendingWrites)
  listen(cb, onErr) {
    if (unsub) unsub();
    const q = query(collection(db, "classes"), where("owner", "==", uid));
    unsub = onSnapshot(q, { includeMetadataChanges: false }, snap => {
      const list = snap.docs.map(d => strip({ id: d.id, ...d.data() }));
      list.forEach(c => last.set(c.id, JSON.stringify(c)));
      cb(list, snap.metadata.hasPendingWrites);
    }, err => onErr && onErr(err));
  },
  // write only the classes that changed, delete removed ones
  sync(classes) {
    if (!uid) return;
    const ids = new Set();
    for (const c of classes) {
      ids.add(c.id);
      const j = JSON.stringify(strip(c));
      if (last.get(c.id) === j) continue;
      last.set(c.id, j);
      setDoc(doc(db, "classes", c.id), { ...strip(c), owner: uid, updatedAt: serverTimestamp() }).catch(e => window.dispatchEvent(new CustomEvent("cloud-error", { detail: e })));
    }
    for (const id of [...last.keys()]) if (!ids.has(id)) { last.delete(id); deleteDoc(doc(db, "classes", id)).catch(() => {}); }
  }
};
window.Cloud = Cloud;
window.dispatchEvent(new Event("cloud-ready"));

// صقر – cloud layer (Firebase Auth + Firestore). Bundled into cloud.js by build.py
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, serverTimestamp } from "firebase/firestore";

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

let uid = null, unsub = null, unsubKids = null, unsubKid = null;
const lastKid = new Map();          // code -> JSON last written/seen (teacher side)
const kidLookAt = new Map();        // code -> lookAt seen from the student doc
const last = new Map();               // class id -> JSON last written/seen
const strip = c => { const { owner, updatedAt, ...rest } = c; return rest; };

const Cloud = {
  user: () => auth.currentUser,
  onAuth(cb) { getRedirectResult(auth).catch(() => {}); return onAuthStateChanged(auth, u => { uid = u ? u.uid : null; cb(u); }); },
  // must be called synchronously from the click handler (iOS Safari only allows popups inside the tap)
  // redirect is not used: it breaks on Safari when the site is not on Firebase Hosting
  signIn() {
    const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
    return signInWithPopup(auth, p);
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
  async signOut() { if (unsub) unsub(); if (unsubKids) unsubKids(); unsub = unsubKids = null; last.clear(); lastKid.clear(); kidLookAt.clear(); await signOut(auth); },
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
  // ---- student mirror docs (teacher side) ----
  listenKids(cb) {
    if (unsubKids) unsubKids();
    const q = query(collection(db, "kids"), where("owner", "==", uid));
    unsubKids = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ code: d.id, ...d.data() }));
      list.forEach(k => { kidLookAt.set(k.code, k.lookAt || 0); if (!lastKid.has(k.code)) lastKid.set(k.code, "?"); });
      cb(list, snap.metadata.hasPendingWrites);
    }, () => {});
  },
  syncKids(map) {                      // map: code -> payload (without owner)
    if (!uid) return;
    for (const [code, data] of map) {
      const d = { ...data };
      if ((d.lookAt || 0) < (kidLookAt.get(code) || 0)) { delete d.look; delete d.lookAt; }   // student changed it more recently
      const j = JSON.stringify(d);
      if (lastKid.get(code) === j) continue;
      lastKid.set(code, j);
      setDoc(doc(db, "kids", code), { ...d, owner: uid, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
    }
    for (const code of [...lastKid.keys()]) if (!map.has(code)) { lastKid.delete(code); deleteDoc(doc(db, "kids", code)).catch(() => {}); }
  },
  // ---- student side (no sign-in) ----
  watchKid(code, cb, onErr) {
    if (unsubKid) unsubKid();
    unsubKid = onSnapshot(doc(db, "kids", code), d => cb(d.exists() ? d.data() : null), e => onErr && onErr(e));
  },
  stopKid() { if (unsubKid) unsubKid(); unsubKid = null; },
  setKidLook: (code, look) => updateDoc(doc(db, "kids", code), { look, lookAt: Date.now() }),
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

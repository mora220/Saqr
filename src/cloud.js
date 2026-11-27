// صقر – cloud layer (Firebase Auth + Firestore). Bundled into cloud.js by build.py
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile , signInAnonymously } from "firebase/auth";
import { getMessaging, getToken, isSupported as msgSupported, onMessage } from "firebase/messaging";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, deleteField, onSnapshot, query, where, serverTimestamp, arrayUnion, arrayRemove } from "firebase/firestore";

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
let db;
try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
catch (e) { db = initializeFirestore(app, {}); }

let uid = null, unsub = null, unsubKids = null, unsubKid = null, unsubParent = null;
const kidWatch = new Map();         // parent side: code -> unsubscribe
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
  anon: () => signInAnonymously(auth),
  async kidExists(code) { const d = await getDoc(doc(db, "kids", code)); return d.exists() ? d.data() : null; },
  // ---- roles ----
  async getRole() { const d = await getDoc(doc(db, "users", uid)); return d.exists() ? d.data().role : null; },
  setRole: (role, name) => setDoc(doc(db, "users", uid), { role, name: name || "", at: serverTimestamp() }, { merge: true }),
  // ---- parent side ----
  listenParent(cb) {
    if (unsubParent) unsubParent();
    unsubParent = onSnapshot(doc(db, "parents", uid), d => cb(d.exists() ? (d.data().kids || []) : [], d.exists() ? d.data() : {}), () => cb([], {}));
  },
  async linkKid(code, name) {
    const k = await getDoc(doc(db, "kids", code));
    if (!k.exists()) { const e = new Error("no-kid"); e.code = "no-kid"; throw e; }
    await setDoc(doc(db, "parents", uid), { kids: arrayUnion(code), name: name || "" }, { merge: true });
    await updateDoc(doc(db, "kids", code), { ["parents." + uid]: name || "ولي أمر" }).catch(() => {});
    return k.data();
  },
  async unlinkKid(code) {
    await setDoc(doc(db, "parents", uid), { kids: arrayRemove(code) }, { merge: true });
    await updateDoc(doc(db, "kids", code), { ["parents." + uid]: deleteField() }).catch(() => {});
  },
  // ---- push notifications (parent) ----
  pushSupported: async () => { try { return "serviceWorker" in navigator && "Notification" in window && await msgSupported(); } catch (e) { return false; } },
  async enablePush() {
    const reg = await navigator.serviceWorker.register("sw.js");
    await navigator.serviceWorker.ready;
    const token = await getToken(getMessaging(app), { serviceWorkerRegistration: reg });
    if (!token) throw Object.assign(new Error("no-token"), { code: "no-token" });
    await setDoc(doc(db, "parents", uid), { tokens: arrayUnion(token) }, { merge: true });
    return token;
  },
  async disablePush(token) { if (token) await setDoc(doc(db, "parents", uid), { tokens: arrayRemove(token) }, { merge: true }); },
  setNotif: prefs => setDoc(doc(db, "parents", uid), { notif: prefs }, { merge: true }),
  onForeground(cb) { msgSupported().then(ok => { if (ok) onMessage(getMessaging(app), p => cb(p)); }).catch(() => {}); },
  watchMany(codes, cb) {
    for (const [c, u] of kidWatch) if (!codes.includes(c)) { u(); kidWatch.delete(c); }
    for (const c of codes) if (!kidWatch.has(c)) kidWatch.set(c, onSnapshot(doc(db, "kids", c), d => cb(c, d.exists() ? d.data() : null), () => cb(c, null)));
  },
  async signOut() { if (unsubParent) unsubParent(); unsubParent = null; for (const u of kidWatch.values()) u(); kidWatch.clear(); if (unsub) unsub(); if (unsubKids) unsubKids(); unsub = unsubKids = null; last.clear(); lastKid.clear(); kidLookAt.clear(); await signOut(auth); },
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

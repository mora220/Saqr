// mock Firestore shared between tabs through localStorage, with a JS copy of firestore.rules (rules.js)
import { getAuth } from "./auth.js";
import { check } from "./rules.js";

// one localStorage key per document, so tabs never overwrite each other's writes
const K = "__mockdb:";
const load = () => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(K)) try { o[k.slice(K.length)] = JSON.parse(localStorage.getItem(k)); } catch (e) {} } return o; };
let DB = load();
const listeners = new Set();
let dirty = new Set();
const persist = () => { for (const path of dirty) { if (DB[path] === undefined) localStorage.removeItem(K + path); else localStorage.setItem(K + path, JSON.stringify(DB[path])); } dirty = new Set(); fire(); };
addEventListener("storage", e => { if (e.key === null) { DB = load(); fire(); return; } if (e.key.startsWith(K)) { const path = e.key.slice(K.length); if (e.newValue === null) delete DB[path]; else DB[path] = JSON.parse(e.newValue); fire(); } });
window.__mockDB = () => DB;
window.__mockReset = () => { Object.keys(DB).forEach(k => dirty.add(k)); DB = {}; persist(); };

const DEL = { __op: "delete" }, TS = { __op: "ts" };
export const deleteField = () => DEL;
export const serverTimestamp = () => TS;
export const arrayUnion = (...v) => ({ __op: "union", v });
export const arrayRemove = (...v) => ({ __op: "remove", v });
export const increment = n => ({ __op: "inc", n });

export const initializeFirestore = () => ({});
export const getFirestore = () => ({});
export const persistentLocalCache = () => ({});
export const persistentMultipleTabManager = () => ({});

const join = segs => segs.filter(Boolean).join("/");
const rid = () => Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
export function collection(db, ...segs) { const base = db && db.type ? db.path : ""; return { type: "col", path: join([base, ...segs]) }; }
export function doc(a, ...segs) {
  let path;
  if (a && a.type === "col") path = join([a.path, segs.length ? segs.join("/") : rid()]);
  else path = join(segs);
  return { type: "doc", path, id: path.split("/").pop() };
}
export const query = (col, ...cons) => ({ type: "query", path: col.path, cons });
export const where = (f, op, v) => ({ k: "where", f, op, v });
export const orderBy = (f, d = "asc") => ({ k: "order", f, d });
export const limit = n => ({ k: "limit", n });

const getPath = (o, f) => f.split(".").reduce((x, k) => (x == null ? undefined : x[k]), o);
const clone = o => JSON.parse(JSON.stringify(o));
function applyVal(cur, v) {
  if (v === TS || (v && v.__op === "ts")) return Date.now();
  if (v && v.__op === "union") { const a = Array.isArray(cur) ? cur.slice() : []; v.v.forEach(x => { if (!a.some(y => JSON.stringify(y) === JSON.stringify(x))) a.push(x); }); return a; }
  if (v && v.__op === "remove") { const s = v.v.map(x => JSON.stringify(x)); return (Array.isArray(cur) ? cur : []).filter(y => !s.includes(JSON.stringify(y))); }
  if (v && v.__op === "inc") return (typeof cur === "number" ? cur : 0) + v.n;
  if (v && typeof v === "object" && !Array.isArray(v)) { const o = {}; for (const k in v) { const r = applyVal(undefined, v[k]); if (r !== DEL && !(v[k] && v[k].__op === "delete")) o[k] = r; } return o; }
  return v;
}
function mergeInto(target, data, dotted) {
  for (const key in data) {
    const v = data[key];
    const parts = dotted ? key.split(".") : [key];
    let o = target; for (let i = 0; i < parts.length - 1; i++) { if (typeof o[parts[i]] !== "object" || o[parts[i]] === null) o[parts[i]] = {}; o = o[parts[i]]; }
    const last = parts[parts.length - 1];
    if (v && v.__op === "delete") { delete o[last]; continue; }
    if (v && typeof v === "object" && !Array.isArray(v) && !v.__op && !dotted) { if (typeof o[last] !== "object" || o[last] === null || Array.isArray(o[last])) o[last] = {}; mergeInto(o[last], v, false); continue; }
    o[last] = applyVal(o[last], v);
  }
}
function guard(op, path, before, after) {
  const u = getAuth().currentUser;
  const err = check(op, path, before, after, u ? { uid: u.uid } : null, p => DB[p]);
  if (err) { const e = new Error("Missing or insufficient permissions. (" + op + " " + path + ": " + err + ")"); e.code = "permission-denied"; console.warn("[mock rules]", e.message); throw e; }
}
const snapDoc = (path) => ({ id: path.split("/").pop(), ref: { type: "doc", path }, exists: () => DB[path] !== undefined, data: () => (DB[path] === undefined ? undefined : clone(DB[path])), metadata: { hasPendingWrites: false, fromCache: false } });

export async function getDoc(ref) { guard("get", ref.path, DB[ref.path], null); return snapDoc(ref.path); }
export async function setDoc(ref, data, opts) {
  const before = DB[ref.path];
  const next = opts && opts.merge && before ? clone(before) : {};
  mergeInto(next, data, false);
  guard(before === undefined ? "create" : "update", ref.path, before, next);
  DB[ref.path] = next; dirty.add(ref.path); persist();
}
export async function addDoc(col, data) { const ref = doc(col); await setDoc(ref, data); return ref; }
export async function updateDoc(ref, data) {
  const before = DB[ref.path];
  if (before === undefined) { const e = new Error("No document to update"); e.code = "not-found"; throw e; }
  const next = clone(before); mergeInto(next, data, true);
  guard("update", ref.path, before, next);
  DB[ref.path] = next; dirty.add(ref.path); persist();
}
export async function deleteDoc(ref) { const before = DB[ref.path]; if (before === undefined) return; guard("delete", ref.path, before, null); delete DB[ref.path]; dirty.add(ref.path); persist(); }
export function writeBatch() {
  const ops = [];
  return { set: (r, d, o) => ops.push(() => setDoc(r, d, o)), update: (r, d) => ops.push(() => updateDoc(r, d)), delete: r => ops.push(() => deleteDoc(r)),
    commit: async () => { for (const f of ops) await f(); } };
}

function runQuery(q) {
  const depth = q.path.split("/").length + 1;
  let rows = Object.keys(DB).filter(p => p.startsWith(q.path + "/") && p.split("/").length === depth);
  for (const c of q.cons || []) {
    if (c.k !== "where") continue;
    rows = rows.filter(p => { const v = getPath(DB[p], c.f);
      if (c.op === "==") return v === c.v;
      if (c.op === "array-contains") return Array.isArray(v) && v.includes(c.v);
      if (c.op === "in") return c.v.includes(v);
      if (c.op === ">=") return v >= c.v; if (c.op === ">") return v > c.v; if (c.op === "<") return v < c.v; if (c.op === "<=") return v <= c.v;
      return true; });
  }
  const ord = (q.cons || []).find(c => c.k === "order");
  if (ord) rows.sort((a, b) => { const x = getPath(DB[a], ord.f), y = getPath(DB[b], ord.f); return (x > y ? 1 : x < y ? -1 : 0) * (ord.d === "desc" ? -1 : 1); });
  const lim = (q.cons || []).find(c => c.k === "limit"); if (lim) rows = rows.slice(0, lim.n);
  return rows;
}
const snapQuery = rows => { const docs = rows.map(snapDoc); return { docs, size: docs.length, empty: !docs.length, forEach: f => docs.forEach(f), metadata: { hasPendingWrites: false, fromCache: false } }; };
export async function getDocs(q) { const qq = q.type === "col" ? { path: q.path, cons: [] } : q; checkList(qq); return snapQuery(runQuery(qq)); }

export function onSnapshot(ref, a, b, c) {
  let next = a, err = b; if (a && typeof a === "object" && !a.next) { next = b; err = c; }
  if (a && a.next) { next = a.next; err = a.error; }
  const L = { last: null };
  L.run = () => {
    try {
      if (ref.type === "doc") { guard("get", ref.path, DB[ref.path], null); const j = JSON.stringify(DB[ref.path]); if (j === L.last) return; L.last = j; next(snapDoc(ref.path)); }
      else { const q = ref.type === "col" ? { path: ref.path, cons: [] } : ref; checkList(q); const rows = runQuery(q); const j = JSON.stringify(rows.map(p => [p, DB[p]])); if (j === L.last) return; L.last = j; next(snapQuery(rows)); }
    } catch (e) { if (e.code !== "permission-denied") { console.error("[mock] listener callback threw", e); throw e; } if (!L.dead) { L.dead = true; listeners.delete(L); err && err(e); } }
  };
  listeners.add(L); setTimeout(() => L.run(), 0);
  return () => { L.dead = true; listeners.delete(L); };
}
function checkList(q) {
  // list rules are checked against every matching document (strict version of Firestore's "query must be provable")
  const u = getAuth().currentUser;
  for (const p of runQuery(q)) { const e = check("list", p, DB[p], null, u ? { uid: u.uid } : null, x => DB[x]); if (e) { const er = new Error("Missing or insufficient permissions. (list " + p + ": " + e + ")"); er.code = "permission-denied"; console.warn("[mock rules]", er.message); throw er; } }
}
function fire() { for (const L of [...listeners]) setTimeout(() => L.run(), 0); }

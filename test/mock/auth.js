// mock Firebase Auth: one user per tab (sessionStorage)
const K = "__mockuser";
const subs = new Set();
const load = () => { try { return JSON.parse(sessionStorage.getItem(K)); } catch (e) { return null; } };
const withTok = u => (u ? Object.assign(u, { getIdToken: async () => "mock-id-token-" + u.uid }) : u);
const auth = { currentUser: withTok(load()), languageCode: "ar" };
const set = u => { auth.currentUser = withTok(u); sessionStorage.setItem(K, JSON.stringify(u)); subs.forEach(cb => cb(u)); return { user: u }; };
window.__mockSignIn = (uid, displayName, email) => set({ uid, displayName: displayName || "", email: email || "", isAnonymous: false });
export const getAuth = () => auth;
export class GoogleAuthProvider { setCustomParameters() {} }
export const signInWithPopup = async () => set({ uid: "teacher1", displayName: "محمد رجب", email: "t@saqr.test", isAnonymous: false });
export const signInWithRedirect = signInWithPopup;
export const getRedirectResult = async () => null;
export const onAuthStateChanged = (a, cb) => { subs.add(cb); setTimeout(() => cb(auth.currentUser), 0); return () => subs.delete(cb); };
export const signOut = async () => { sessionStorage.removeItem(K); auth.currentUser = null; subs.forEach(cb => cb(null)); };
export const signInWithEmailAndPassword = async (a, email) => set({ uid: "e_" + email.replace(/\W/g, ""), displayName: email.split("@")[0], email, isAnonymous: false });
export const createUserWithEmailAndPassword = signInWithEmailAndPassword;
export const sendPasswordResetEmail = async () => {};
export const updateProfile = async (u, p) => { Object.assign(auth.currentUser, p); set(auth.currentUser); };
export const signInAnonymously = async () => set({ uid: "anon_" + Math.random().toString(36).slice(2, 8), displayName: "", email: "", isAnonymous: true });

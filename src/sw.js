// صقر – service worker: push notifications (FCM) + offline app shell
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging/sw";

initializeApp({
  apiKey: "AIzaSyAMilKT2UhU_o63bXq36gKXHPVPG40Mx3k",
  authDomain: "saqr-daf86.firebaseapp.com",
  projectId: "saqr-daf86",
  storageBucket: "saqr-daf86.firebasestorage.app",
  messagingSenderId: "601780267284",
  appId: "1:601780267284:web:8356fc286212822765ba01"
});
getMessaging();   // shows notification payloads in the background

const CACHE = "saqr-shell-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match("./"))));
});
self.addEventListener("notificationclick", e => {
  if (e.notification.data && e.notification.data.FCM_MSG) return;   // handled by FCM
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then(ws => {
    for (const w of ws) if ("focus" in w) return w.focus();
    return self.clients.openWindow("./");
  }));
});

// صقر – إشعارات أولياء الأمور
// بتشتغل كل ما صفحة طالب (kids/{code}) تتحدّث، وتبعت إشعار لأولياء الأمور المربوطين بيه
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
setGlobalOptions({ region: process.env.SAQR_REGION || "us-central1", maxInstances: 10 });

const SITE = "https://mora220.github.io/Saqr/";
const ICON = SITE + "icons/icon-192.png";
const SKILLS = {
  part: ["🙋", "مشاركة"], hw: ["📘", "حلّ الواجب"], team: ["🤝", "تعاون"], crea: ["💡", "إبداع"], calm: ["😌", "هدوء"],
  help: ["💪", "مساعدة زميل"], excel: ["🌟", "إجابة مميزة"], neat: ["✨", "نظافة وترتيب"],
  noise: ["📢", "إزعاج"], nohw: ["📕", "بدون واجب"], late: ["⏰", "تأخير"], focus: ["😴", "عدم انتباه"], phone: ["📱", "جوال"], rude: ["🙅", "عدم احترام"]
};
const LEVELS = [[0, "فرخ صغير"], [10, "صقر"], [30, "صقر جارح"], [60, "صقر ذهبي"]];
const levelIdx = p => LEVELS.reduce((i, l, k) => (p >= l[0] ? k : i), 0);

function buildMessages(b, a) {
  const out = [], name = a.name || "ابنك", pa = a.points || 0, pb = b.points || 0;
  const last = (a.recent || [])[0], sk = last && (last.e ? [last.e, last.nm || ""] : SKILLS[last.k]);
  if (pa > pb) {
    out.push({ type: "pos", title: `⭐ ${name} خد نقطة!`, body: `${sk ? sk[0] + " " + sk[1] + " " : ""}(+${pa - pb}) — مجموعه ${pa} نقطة` });
    if (levelIdx(pa) > levelIdx(pb)) out.push({ type: "pos", title: `🎉 ${name} ترقّى!`, body: `بقى «${LEVELS[levelIdx(pa)][1]}» 🦅` });
  } else if (pa < pb) {
    out.push({ type: "neg", title: `✋ ملاحظة على ${name}`, body: `${sk ? sk[0] + " " + sk[1] + " " : ""}(−${pb - pa})` });
  }
  if (a.today !== b.today && ["a", "l", "x"].includes(a.today)) {
    const t = { a: `❌ ${name} غائب النهارده`, l: `⏰ ${name} اتأخر النهارده`, x: `📝 ${name} مستأذن النهارده` }[a.today];
    out.push({ type: "att", title: t, body: a.className || "" });
  }
  const an = (a.anns || [])[0], bn = (b.anns || [])[0];
  if (an && an.at && (!bn || an.at !== bn.at)) {
    out.push({ type: "ann", title: `📢 إعلان من ${a.teacher ? "أ. " + a.teacher : "المعلم"} — ${a.className || ""}`, body: String(an.t).slice(0, 180), tag: `ann-${a.cid}-${an.at}` });
  }
  if (a.note && a.noteAt && a.noteAt !== b.noteAt) {
    out.push({ type: "note", title: `📝 رسالة من ${a.teacher ? "أ. " + a.teacher : "المعلم"}`, body: String(a.note).slice(0, 180) });
  }
  return out;
}

exports.notifyParents = onDocumentUpdated("kids/{code}", async event => {
  const b = event.data.before.data() || {}, a = event.data.after.data() || {};
  const msgs = buildMessages(b, a);
  if (!msgs.length) return;

  const db = admin.firestore();
  const parents = await db.collection("parents").where("kids", "array-contains", event.params.code).get();
  for (const p of parents.docs) {
    const d = p.data(), tokens = d.tokens || [], prefs = d.notif || {};
    if (!tokens.length) continue;
    const bad = new Set();
    for (const m of msgs.filter(m => prefs[m.type] !== false)) {
      const res = await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title: m.title, body: m.body },
        webpush: { notification: { icon: ICON, badge: ICON, lang: "ar", dir: "rtl", ...(m.tag ? { tag: m.tag } : {}) }, fcmOptions: { link: SITE } }
      });
      res.responses.forEach((r, i) => {
        const c = r.error && r.error.code;
        if (c === "messaging/registration-token-not-registered" || c === "messaging/invalid-registration-token" || c === "messaging/invalid-argument") bad.add(tokens[i]);
      });
    }
    if (bad.size) await p.ref.update({ tokens: admin.firestore.FieldValue.arrayRemove(...bad) });
  }
});

exports._buildMessages = buildMessages;   // for tests

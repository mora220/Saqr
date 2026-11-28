# صقر AI — وكيل تجهيز الأسئلة

Cloudflare Worker شغلته الوحيدة إنه يجهّز أسئلة للمعلمين المسجّلين في صقر (المادة + الصف + الوحدة/الدرس).
المعلم مش محتاج مفتاح خاص؛ المفتاح محفوظ كـ Secret على Cloudflare ومحدش يشوفه.

## الرفع من لوحة Cloudflare (من غير أي برامج)
1. **Workers & Pages → Create → Create Worker** — سمّيه `saqr-ai` واضغط Deploy.
2. **Edit code** — امسح الكود اللي فيه، والصق محتوى `worker.js` كله، واضغط **Deploy**.
3. **Storage & Databases → KV → Create** — اسم: `saqr-ai-kv`.
4. ارجع للـ Worker ← **Settings → Bindings → Add → KV namespace**: الاسم `SAQR_AI_KV` واختار `saqr-ai-kv`.
5. **Settings → Variables and Secrets → Add**:
   - `GEMINI_KEY` — النوع **Secret** — المفتاح من aistudio.google.com/apikey
   - `DAILY_LIMIT` — النوع **Text** — مثلاً `40` (عدد الطلبات لكل معلم في اليوم)
6. انسخ رابط الـ Worker (شكله `https://saqr-ai.<اسمك>.workers.dev`) وحطه في `SAQR_AI_URL` في `src/app.html`.

## الأمان
- بيقبل بس معلم داخل بحساب في مشروع `saqr-daf86` (توكن Firebase موقّع)، ومش بيقبل الدخول المجهول (أولياء الأمور).
- المدخلات حقول محددة بس (مفيش شات)، والملاحظات متقصوصة لـ 150 حرف ومتنضّفة.
- حد يومي لكل معلم، والطلبات بتتقبل من موقع صقر بس (CORS).

## الاختبار
`node test.mjs` — بيجرّب التوكن والحد اليومي والتحويل لنموذج تاني من غير إنترنت.

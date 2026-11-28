# صقر 🦅 – إدارة الفصل

تطبيق ويب لإدارة الفصل بروح الصقور: نقاط سلوك، مستويات (فرخ ← صقر ← صقر جارح ← صقر ذهبي)، اختيار عشوائي، مؤقت، تقسيم أسراب، مقياس هدوء، وتقارير.

- الدخول بحساب جوجل والحفظ في Firebase (Firestore) مع عمل بدون إنترنت.
- وضع تجربة بدون حساب (البيانات على الجهاز فقط).

## التطوير
```
npm install
npm run build
```
الكود في `src/`، والملفات المنشورة `index.html` و`cloud.js` في جذر المستودع (GitHub Pages).

قواعد الأمان في `firestore.rules` — انسخها في Firebase Console → Firestore → Rules (لازم تتحدّث مع كل ميزة سحابية جديدة).

## المزايا السحابية
- 💬 رسائل بين المعلم وأولياء الأمور (`threads/{code}/msgs`)
- 📘 واجبات من بنك الأسئلة بتتحل من صفحة الطالب وتتصحح لوحدها (`hw`، `subs`)
- 🏆 لوحة صدارة أسبوعية للفصل بالاسم الأول (`boards/{classId}`)، وطلب مكافآت من صفحة الطالب
- 📄 تقارير PDF وشهادات تميّز (طباعة ← حفظ كـ PDF)
- 🏫 لوحة المدرسة للمدير: انضمام المعلمين بالكود، ملخص الأداء، وإعلان للمدرسة كلها (`schools/{code}/stats`)

## الاختبار
`sh test/build-test.sh` بيبني نسخة في `test/site` بـ Firebase متقلّد (`test/mock`، وفيه نسخة JS من القواعد)،
وبعدين شغّل سيرفر في `test/site` على البورت 8765، وشغّل اختبارات Playwright: `cd test && python3 t_msgs.py` (وباقي `t_*.py`).

© محمد رجب

## رسومات
- أيقونات [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) — رخصة MIT (`emoji/LICENSE.txt`).
- حركات من [LottieFiles](https://lottiefiles.com) (رخصة Lottie Simple License).

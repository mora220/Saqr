#!/bin/bash
# صقر – رفع دوال الإشعارات (يتشغّل من Google Cloud Shell)
set -e
PROJECT=saqr-daf86
gcloud config set project $PROJECT >/dev/null 2>&1
LOC=$(gcloud firestore databases describe --database='(default)' --project $PROJECT --format='value(locationId)' 2>/dev/null || true)
case "$LOC" in
  nam5|"") REG=us-central1 ;;
  eur3)    REG=europe-west1 ;;
  *)       REG=$LOC ;;
esac
echo "📍 Firestore: ${LOC:-?}  →  Functions region: $REG"
echo "SAQR_REGION=$REG" > functions/.env
(cd functions && npm install --silent --no-audit --no-fund)
if ! npx -y firebase-tools@latest projects:list >/dev/null 2>&1; then
  echo "🔑 سجّل دخول Firebase: افتح الرابط، اختار حسابك، وانسخ الكود والصقه هنا"
  npx -y firebase-tools@latest login --no-localhost
fi
npx -y firebase-tools@latest deploy --only functions --project $PROJECT --force
echo "✅ تم! الإشعارات شغالة 🦅"

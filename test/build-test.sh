#!/bin/sh
# builds dist/ then a test copy in test/site with Firebase replaced by the mock in test/mock
set -e
cd "$(dirname "$0")/.."
python3 build.py >/dev/null
rm -rf test/site && cp -r dist test/site
npx esbuild src/cloud.js --bundle --format=esm --target=es2020 --outfile=test/site/cloud.js \
  --alias:firebase/app=./test/mock/app.js --alias:firebase/auth=./test/mock/auth.js \
  --alias:firebase/firestore=./test/mock/firestore.js --alias:firebase/messaging=./test/mock/messaging.js --log-level=warning

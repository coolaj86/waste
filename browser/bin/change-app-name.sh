#!/bin/bash
grep -R yololiumApp app | cut -d ':' -f1 | while read F; do sed -i '' 's/yololiumApp/yololeteerApp/g' "$F"; done
grep -R yololium app | cut -d ':' -f1 | while read F; do sed -i '' 's/yololium/yololeteer/g' "$F"; done
grep -R yololium bower.json | cut -d ':' -f1 | while read F; do sed -i '' 's/yololium/yololeteer/g' "$F"; done
grep -R yololium package.json | cut -d ':' -f1 | while read F; do sed -i '' 's/yololium/yololeteer/g' "$F"; done

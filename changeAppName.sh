#!/bin/bash
grep -R sortinghatApp app | cut -d ':' -f1 | while read F; do sed -i '' 's/sortinghatApp/yololiumApp/g' "$F"; done
grep -R sortinghat app | cut -d ':' -f1 | while read F; do sed -i '' 's/sortinghat/yololium/g' "$F"; done
grep -R sortinghat bower.json | cut -d ':' -f1 | while read F; do sed -i '' 's/sortinghat/yololium/g' "$F"; done

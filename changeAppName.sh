grep -R sortinghatApp app | cut -d ':' -f1 | while read F; do sed -i '' 's/sortinghatApp/awesomeApp/g' "$F"; done
grep -R sortinghat app | cut -d ':' -f1 | while read F; do sed -i '' 's/sortinghat/awesome/g' "$F"; done
grep -R sortinghat bower.json | cut -d ':' -f1 | while read F; do sed -i '' 's/sortinghat/awesome/g' "$F"; done

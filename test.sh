#!/bin/sh
# Локальный рендер сайта: ./test.sh [ширина] [высота] [js перед снимком]
W=${1:-1400}; H=${2:-1700}
SP="C:/Users/Yujin/AppData/Local/Temp/claude/C--Users-Yujin-Desktop-claude/a6f2683c-a093-4423-bd93-12b01e4be80a/scratchpad"
SITE="C:/Users/Yujin/Desktop/claude/mi-scusi/docs"
printf '%s' "${3:-}" > "$SITE/_test.js"
sed -E -e 's#<script src="config.js[^"]*"></script>#<script>window.MISCUSI_CONFIG={}</script>#' -e 's#(<script src="app.js[^"]*"></script>)#\1<script src="_test.js"></script>#' "$SITE/index.html" > "$SITE/_test.html"
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --user-data-dir="$SP/chrome-prof" --window-size=$W,$H --virtual-time-budget=${VT:-6000} --allow-file-access-from-files --screenshot="$SP/shot.png" "file:///$SITE/_test.html" 2>/dev/null
rm -f "$SITE/_test.html" "$SITE/_test.js"

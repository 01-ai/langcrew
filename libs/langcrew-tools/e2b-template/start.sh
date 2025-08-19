#!/bin/bash

export DISPLAY=:1

sed -i '/<\/head>/i\
    <style>\
      #noVNC_control_bar { display: none !important; }\
    </style>
' /usr/share/novnc/vnc.html
sed -i '/UI\.showStatus(msg);/d' /usr/share/novnc/app/ui.js

Xvfb :1 -screen 0 1280x1020x24 -ac +extension GLX +render -noreset &

python3 -m playwright launch-server --browser chromium --config /etc/pw-config.json > /tmp/playwright.log 2>&1 &

x11vnc -display :1 -nopw -forever -shared -bg -quiet

websockify --web=/usr/share/novnc/ 0.0.0.0:6089 localhost:5900

#!/bin/bash
export DISPLAY=:99

# Matar processos anteriores se existirem
pkill -f "Xvfb :99" 2>/dev/null
pkill -f "x11vnc" 2>/dev/null
pkill -f "websockify.*6080" 2>/dev/null

sleep 1

# Iniciar display virtual
Xvfb :99 -screen 0 1280x800x24 &
sleep 2

# Iniciar servidor VNC
x11vnc -display :99 -forever -shared -nopw -rfbport 5900 &
sleep 1

# Iniciar websockify para noVNC
websockify --web=/usr/share/novnc 6080 localhost:5900 &

echo "VNC iniciado na porta 6080"

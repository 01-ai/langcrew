#!/bin/sh

# Start backend service in background as app user
echo "Starting backend service..."
cd /app
uv run run_server.py --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start nginx in foreground as root
echo "Starting nginx..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Wait for any process to exit
wait $BACKEND_PID $NGINX_PID

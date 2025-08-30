#!/bin/bash

echo "Checking server status..."
echo ""

# Check PipeCat server (port 8000)
if lsof -ti:8000 > /dev/null; then
    echo "✅ PipeCat server: RUNNING (port 8000)"
    curl -s http://localhost:8000/health 2>/dev/null || echo "   Health check failed"
else
    echo "❌ PipeCat server: NOT RUNNING (port 8000)"
fi

# Check audio client server (port 8080)
if lsof -ti:8080 > /dev/null; then
    echo "✅ Audio client server: RUNNING (port 8080)"
else
    echo "❌ Audio client server: NOT RUNNING (port 8080)"
fi

echo ""
echo "Access application: http://localhost:8080/seamless_audio_client.html"
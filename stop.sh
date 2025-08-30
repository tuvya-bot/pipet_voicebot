#!/bin/bash

echo "Stopping Nova Sonic servers..."

# Kill PipeCat server (port 8000)
PID_8000=$(lsof -ti:8000)
if [ ! -z "$PID_8000" ]; then
    kill $PID_8000
    echo "Stopped PipeCat server (port 8000)"
else
    echo "No server running on port 8000"
fi

# Kill audio client server (port 8080)
PID_8080=$(lsof -ti:8080)
if [ ! -z "$PID_8080" ]; then
    kill $PID_8080
    echo "Stopped audio client server (port 8080)"
else
    echo "No server running on port 8080"
fi

echo "All servers stopped."
#!/bin/bash

# Run the PipeCat Nova Sonic Enhanced implementation

# Change to the script directory
cd "$(dirname "$0")"

# Parse arguments
INSTALL_DEPS=false
PORT=8000
HOST="0.0.0.0"

# Process command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --install-deps)
            INSTALL_DEPS=true
            shift
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --port=*)
            PORT="${1#*=}"
            shift
            ;;
        --host)
            HOST="$2"
            shift 2
            ;;
        --host=*)
            HOST="${1#*=}"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: ./run_pipecat.sh [--install-deps] [--port=8000] [--host=0.0.0.0]"
            exit 1
            ;;
    esac
done

# Install dependencies if requested
if [ "$INSTALL_DEPS" = true ]; then
    echo "Installing PipeCat dependencies..."
    pip install -r requirements_pipecat.txt
    if [ $? -ne 0 ]; then
        echo "Failed to install dependencies"
        exit 1
    fi
fi

# Check for required environment variables
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "Error: AWS credentials not set"
    echo "Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables"
    echo ""
    echo "Example:"
    echo "export AWS_ACCESS_KEY_ID=your_access_key"
    echo "export AWS_SECRET_ACCESS_KEY=your_secret_key"
    echo "export AWS_DEFAULT_REGION=us-east-1"
    exit 1
fi

# Check if PipeCat is installed
python -c "import pipecat" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "PipeCat not found. Installing dependencies..."
    pip install -r requirements_pipecat.txt
    if [ $? -ne 0 ]; then
        echo "Failed to install PipeCat dependencies"
        exit 1
    fi
fi

echo "Starting Nova Sonic Enhanced with PipeCat..."
echo "Server will be available at: http://$HOST:$PORT"
echo "WebSocket endpoint: ws://$HOST:$PORT/ws"
echo "Health check: http://$HOST:$PORT/health"
echo ""
echo "Press Ctrl+C to stop the server"

# Set environment variables for the server
export PIPECAT_HOST="$HOST"
export PIPECAT_PORT="$PORT"

# Run the PipeCat implementation
python pipecat_nova_sonic.py
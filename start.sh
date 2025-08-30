#!/bin/bash

# Change to script directory
cd "$(dirname "$0")"

# Function to prompt for AWS credentials
prompt_aws_credentials() {
    echo "AWS credentials not found. Please enter them:"
    read -p "AWS_ACCESS_KEY_ID: " AWS_ACCESS_KEY_ID
    read -s -p "AWS_SECRET_ACCESS_KEY: " AWS_SECRET_ACCESS_KEY
    echo ""
    read -p "AWS_DEFAULT_REGION (default: us-east-1): " AWS_DEFAULT_REGION
    AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-us-east-1}
    
    export AWS_ACCESS_KEY_ID
    export AWS_SECRET_ACCESS_KEY
    export AWS_DEFAULT_REGION
}

# Check if AWS credentials are set, if not prompt for them
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    prompt_aws_credentials
fi

echo "Starting Nova Sonic Enhanced with PipeCat..."
echo "AWS Region: $AWS_DEFAULT_REGION"
echo ""

# Create environment script for new terminals
cat > /tmp/pipecat_env.sh << EOF
export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="$AWS_DEFAULT_REGION"
cd $(pwd)
source myenv/bin/activate 2>/dev/null || true
EOF

# Start PipeCat server in new terminal
osascript -e "tell application \"Terminal\" to do script \"source /tmp/pipecat_env.sh && ./run_pipecat.sh\""

# Wait a moment for the first server to start
sleep 2

# Start audio client server in new terminal
osascript -e "tell application \"Terminal\" to do script \"source /tmp/pipecat_env.sh && python3 serve_audio_client.py\""

echo "Servers starting in new terminal windows..."
echo "Once both servers are running, open: http://localhost:8080/seamless_audio_client.html"

# Clean up temp file after a delay
(sleep 10 && rm -f /tmp/pipecat_env.sh) &
# Nova Sonic Enhanced with PipeCat

A comprehensive implementation of AWS Nova Sonic using the PipeCat framework, featuring enhanced echo cancellation, real-time voice activity detection, and seamless barge-in capabilities.

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Key Features](#key-features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Performance Characteristics](#performance-characteristics)
- [Development Guidelines](#development-guidelines)
- [Troubleshooting](#troubleshooting)

## Overview

This implementation creates a real-time voice chatbot using AWS Nova Sonic with sub-millisecond context retrieval and advanced audio processing capabilities. It uses WebSocket for real-time communication and provides a robust framework for voice-based interactions.

## Architecture

### Architectural Workflow

```
                                                [Client]
                                                   │
                                      ┌───────────┴───────────┐
                                      │                       │
                                      ▼                       ▼
                              [HTTP Server :8000]    [WebSocket Server :8000]
                                      │                       │
                                      │                       │
┌─────────────────────────────────────┴───────────────────────┴──────────────────────┐
│ PipeCat Server                                                                     │
│ ┌──────────────────────┐                    ┌──────────────────────────┐          │
│ │     FastAPI App      │                    │    WebSocket Handler     │          │
│ │   (HTTP Endpoints)   │◄──────────────────►│  (Real-time Streaming)  │          │
│ └──────────────────────┘                    └──────────────────────────┘          │
│            │                                            │                          │
│            │                                           │                           │
│            ▼                                          ▼                           │
│ ┌──────────────────────┐                    ┌──────────────────────────┐         │
│ │   Static Assets      │                    │    Audio Pipeline        │         │
│ │   - JS files        │                    │    - Input Processing    │         │
│ │   - Client HTML     │                    │    - VAD Processing      │         │
│ │   - Health Check    │                    │    - Echo Cancellation   │         │
│ └──────────────────────┘                    └──────────────────────────┘         │
│                                                         │                         │
│                                                         ▼                         │
│                                             ┌──────────────────────────┐         │
│                                             │    Context Manager       │         │
│                                             │    - Conversation State  │         │
│                                             │    - Tool Functions      │         │
│                                             └──────────────────────────┘         │
│                                                         │                         │
│                                                         ▼                         │
│                                             ┌──────────────────────────┐         │
│                                             │     AWS Nova Sonic       │         │
│                                             │     - Speech-to-Text     │         │
│                                             │     - Text-to-Speech     │         │
│                                             └──────────────────────────┘         │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Component Descriptions

1. **HTTP/WebSocket Server (FastAPI)**
   - Handles initial connections and static file serving
   - Manages WebSocket upgrades for real-time communication
   - Provides health monitoring endpoints
   - Configures CORS and security settings

2. **Audio Pipeline**
   - Processes input audio streams
   - Implements Voice Activity Detection (VAD)
   - Handles echo cancellation
   - Manages audio buffering and streaming

3. **Context Manager**
   - Maintains conversation state
   - Manages tool function integration
   - Handles context retrieval and updates
   - Coordinates with AWS services

4. **AWS Nova Sonic Integration**
   - Processes speech-to-text conversion
   - Generates text-to-speech responses
   - Manages AWS credentials and sessions
   - Handles API interactions

## Key Features

- **Real-time Audio Processing**
  - WebSocket-based streaming
  - Sub-millisecond latency
  - Echo cancellation
  - Noise reduction

- **Advanced Voice Detection**
  - Silero VAD integration
  - Configurable sensitivity
  - Barge-in detection
  - Speech padding controls

- **Tool Integration**
  - Date/time queries
  - Order tracking
  - Extensible function framework
  - Async execution

## Prerequisites

- Python 3.8+
- AWS Account with Nova Sonic access
- Node.js 14+ (for client development)
- Modern web browser supporting WebSocket

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd pipecat_version
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements_pipecat.txt
   ```

3. Configure AWS credentials:
   ```bash
   export AWS_ACCESS_KEY_ID=your_access_key
   export AWS_SECRET_ACCESS_KEY=your_secret_key
   export AWS_DEFAULT_REGION=us-east-1
   ```

## Configuration

### Server Configuration
```python
# Default settings in pipecat_nova_sonic.py
SAMPLE_RATE = 16000
API_KEY = "nova-sonic-enhanced-api-key"
HOST = "0.0.0.0"
PORT = 8000
```

### VAD Parameters
```python
VADParams(
    stop_secs=0.5,
    min_volume=0.6,
    speech_pad_ms=300
)
```

### AWS Nova Sonic Settings
```python
Params(
    input_sample_rate=16000,
    output_sample_rate=16000,
    voice_id="matthew"  # Options: matthew, tiffany, amy
)
```

## Usage

1. Start the server:
   ```bash
   ./run_pipecat.sh
   ```

2. Access the client interface:
   ```
   http://localhost:8000
   ```

3. Server endpoints:
   - WebSocket: `ws://localhost:8000/ws`
   - Health Check: `http://localhost:8000/health`

## API Reference

### HTTP Endpoints

- `GET /health`
  - Health check endpoint
  - Returns: `{"status": "ok", "service": "nova-sonic-enhanced-pipecat"}`

- `WebSocket /ws`
  - Real-time audio streaming endpoint
  - Requires API key in WebSocket protocol header

### WebSocket Messages

1. Client to Server:
   ```json
   {
     "action": "audiostream",
     "audioData": "base64_encoded_audio"
   }
   ```

2. Server to Client:
   ```json
   {
     "event": "media",
     "data": "base64_encoded_audio",
     "sample_rate": 16000,
     "channels": 1,
     "format": "pcm_s16le"
   }
   ```

## Performance Characteristics

- **Latency Targets**
  - Audio Processing: <50ms
  - Context Retrieval: <2ms
  - End-to-End Response: <500ms

- **Resource Usage**
  - Memory: ~1GB per instance
  - CPU: 1-2 cores recommended
  - Network: 100Kbps per active connection

## Development Guidelines

### Code Structure
```
pipecat_version/
├── pipecat_nova_sonic.py    # Main server implementation
├── seamless-audio-processor.js  # Client audio processing
├── final_audio_client.html   # Production client interface
├── requirements_pipecat.txt  # Python dependencies
└── run_pipecat.sh           # Deployment script
```

### Best Practices
1. Use async/await for all I/O operations
2. Implement proper error handling
3. Follow PEP 8 style guidelines
4. Document all public interfaces
5. Write unit tests for new features

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check API key configuration
   - Verify AWS credentials
   - Ensure correct port is open

2. **Audio Quality Issues**
   - Verify sample rate settings
   - Check network bandwidth
   - Adjust VAD parameters

3. **High Latency**
   - Monitor system resources
   - Check network conditions
   - Optimize audio buffer size

### Logging

Enable debug logging:
```python
logging.basicConfig(level=logging.DEBUG)
logger.add(sys.stdout, level="DEBUG")
```

### Monitoring

1. System Health:
   ```bash
   curl http://localhost:8000/health
   ```

2. Log Analysis:
   ```bash
   tail -f pipecat.log
   ```

3. Performance Metrics:
   - Monitor CPU/Memory usage
   - Track WebSocket connections
   - Measure audio latency

## License

This project is provided as-is for educational and development purposes. Ensure compliance with AWS service terms and conditions.

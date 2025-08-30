#!/usr/bin/env python3
"""
PipeCat implementation for Nova Sonic Enhanced

This module provides a PipeCat-based implementation for Nova Sonic with enhanced audio processing,
echo cancellation, and barge-in detection capabilities.

Key Features:
- WebSocket-based audio streaming
- Advanced echo cancellation
- Voice Activity Detection (VAD)
- Barge-in detection and handling
- Real-time transcription
- AWS Nova Sonic integration

Dependencies:
- pipecat-ai[aws-nova-sonic,silero]
- FastAPI for WebSocket server
- AWS Bedrock for LLM services
"""

import asyncio
import json
import base64
import os
import sys
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, WebSocket, Request
from loguru import logger

# Add parent directory to path to import existing components
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from pipecat.adapters.schemas.function_schema import FunctionSchema
    from pipecat.adapters.schemas.tools_schema import ToolsSchema
    from pipecat.audio.vad.silero import SileroVADAnalyzer, VADParams
    from pipecat.pipeline.pipeline import Pipeline
    from pipecat.pipeline.runner import PipelineRunner
    from pipecat.pipeline.task import PipelineParams, PipelineTask
    from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
    from pipecat.services.aws_nova_sonic.aws import AWSNovaSonicLLMService, Params
    from pipecat.services.llm_service import FunctionCallParams
    from pipecat.transports.network.fastapi_websocket import FastAPIWebsocketTransport, FastAPIWebsocketParams
    from pipecat.processors.transcript_processor import TranscriptProcessor
    from pipecat.serializers.base_serializer import FrameSerializer, FrameSerializerType
    from pipecat.frames.frames import (
        AudioRawFrame,
        Frame,
        InputAudioRawFrame,
        StartInterruptionFrame,
        StartFrame,
    )
    from pipecat.audio.utils import create_stream_resampler
except ImportError as e:
    logger.error(f"PipeCat dependencies not found: {e}")
    logger.error("Please install with: pip install pipecat-ai[aws-nova-sonic,silero]")
    sys.exit(1)

# Configuration
SAMPLE_RATE = 16000
API_KEY = "nova-sonic-enhanced-api-key"

class EnhancedBase64AudioSerializer(FrameSerializer):
    """Enhanced Base64 Audio Serializer with proper audio format handling"""
    
    def __init__(self, target_sample_rate: int = 16000, sample_rate: Optional[int] = None):
        self._target_sample_rate = target_sample_rate
        self._sample_rate = sample_rate or target_sample_rate
        self._input_resampler = create_stream_resampler()
        self._output_resampler = create_stream_resampler()
        
    @property
    def type(self) -> FrameSerializerType:
        return FrameSerializerType.TEXT
    
    async def setup(self, frame: StartFrame):
        """Setup serializer with pipeline configuration"""
        if hasattr(frame, 'audio_in_sample_rate'):
            self._sample_rate = frame.audio_in_sample_rate
    
    async def serialize(self, frame: Frame) -> str | bytes | None:
        """Serialize Pipecat frame to base64-encoded format"""
        try:
            if isinstance(frame, StartInterruptionFrame):
                response = {"event": "stop"}
                return json.dumps(response)
            
            elif isinstance(frame, AudioRawFrame):
                # Nova Sonic outputs at 24kHz, send with sample rate info
                audio_data = frame.audio
                
                # Suppress audio serialization logs
                
                # Encode to base64
                encoded_data = base64.b64encode(audio_data).decode('utf-8')
                response = {
                    "event": "media", 
                    "data": encoded_data,
                    "sample_rate": frame.sample_rate,
                    "channels": frame.num_channels if hasattr(frame, 'num_channels') else 1,
                    "format": "pcm_s16le"
                }
                return json.dumps(response)
            
            return None
            
        except Exception as e:
            logger.error(f"Error serializing audio frame: {e}")
            return None
    
    async def deserialize(self, data: str | bytes) -> Frame | None:
        """Deserialize base64-encoded data to Pipecat frames"""
        try:
            # Decode base64 data
            if isinstance(data, bytes):
                data = data.decode('utf-8')
            
            decoded_data = base64.b64decode(data)
            
            # Log input audio info for debugging
            logger.debug(f"Deserializing audio: {len(decoded_data)} bytes")
            
            return InputAudioRawFrame(
                audio=decoded_data,
                num_channels=1,
                sample_rate=self._sample_rate
            )
            
        except Exception as e:
            logger.error(f"Error deserializing audio data: {e}")
            return None

# Tool functions
async def get_date_and_time_tool(params: FunctionCallParams):
    """Get current date and time"""
    import datetime
    import pytz
    
    pst_timezone = pytz.timezone("America/Los_Angeles")
    pst_date = datetime.datetime.now(pst_timezone)
    
    result = {
        "formattedTime": pst_date.strftime("%I:%M %p"),
        "date": pst_date.strftime("%Y-%m-%d"),
        "year": pst_date.year,
        "month": pst_date.month,
        "day": pst_date.day,
        "dayOfWeek": pst_date.strftime("%A").upper(),
        "timezone": "PST"
    }
    
    await params.result_callback(result)

async def track_order_tool(params: FunctionCallParams):
    """Track order status"""
    import hashlib
    import random
    
    order_id = params.arguments.get("orderId", "")
    request_notifications = params.arguments.get("requestNotifications", False)
    
    if not order_id:
        await params.result_callback({"error": "Invalid order ID"})
        return
    
    # Create deterministic randomness based on order ID
    seed = int(hashlib.md5(order_id.encode(), usedforsecurity=False).hexdigest(), 16) % 10000
    random.seed(seed)
    
    statuses = [
        "Order received", "Processing", "Preparing for shipment",
        "Shipped", "In transit", "Out for delivery", "Delivered", "Delayed"
    ]
    weights = [10, 15, 15, 20, 20, 10, 5, 3]
    status = random.choices(statuses, weights=weights, k=1)[0]
    
    # Generate delivery date
    import datetime
    today = datetime.datetime.now()
    if status == "Delivered":
        delivery_days = -random.randint(0, 3)
        estimated_delivery = (today + datetime.timedelta(days=delivery_days)).strftime("%Y-%m-%d")
    elif status == "Out for delivery":
        estimated_delivery = today.strftime("%Y-%m-%d")
    else:
        delivery_days = random.randint(1, 10)
        estimated_delivery = (today + datetime.timedelta(days=delivery_days)).strftime("%Y-%m-%d")
    
    result = {
        "orderStatus": status,
        "orderNumber": order_id,
        "estimatedDelivery": estimated_delivery
    }
    
    if request_notifications and status != "Delivered":
        result["notificationStatus"] = f"You will receive notifications for order {order_id}"
    
    await params.result_callback(result)

# Define function schemas
date_time_function = FunctionSchema(
    name="getDateAndTimeTool",
    description="Get information about the current date and time",
    properties={},
    required=[]
)

track_order_function = FunctionSchema(
    name="trackOrderTool",
    description="Retrieves real-time order tracking information and detailed status updates for customer orders by order ID",
    properties={
        "orderId": {
            "type": "string",
            "description": "The order number or ID to track"
        },
        "requestNotifications": {
            "type": "boolean",
            "description": "Whether to set up notifications for this order",
            "default": False
        }
    },
    required=["orderId"]
)

# Create tools schema
tools = ToolsSchema(standard_tools=[date_time_function, track_order_function])

async def setup_pipeline(websocket: WebSocket):
    """Setup the PipeCat audio processing pipeline"""
    
    system_instruction = """You are a friendly AI assistant. You can help with various tasks including:
    - Getting current date and time information
    - Tracking order status
    - General conversation and assistance
    
    When reading order numbers, please read each digit individually, separated by pauses. 
    For example, order #1234 should be read as 'order number one-two-three-four' rather than 'order number one thousand two hundred thirty-four'.
    
    Be conversational and helpful in your responses."""
    
    # Configure WebSocket transport with enhanced audio processing
    transport = FastAPIWebsocketTransport(websocket, FastAPIWebsocketParams(
        serializer=EnhancedBase64AudioSerializer(),
        audio_in_enabled=True,
        audio_out_enabled=True,
        add_wav_header=False,
        vad_analyzer=SileroVADAnalyzer(
            params=VADParams(
                stop_secs=0.5,
                min_volume=0.4,
                speech_pad_ms=300
            )
        ),
        transcription_enabled=True
    ))
    
    # Configure AWS Nova Sonic parameters
    params = Params()
    params.input_sample_rate = SAMPLE_RATE
    params.output_sample_rate = SAMPLE_RATE
    
    # Initialize LLM service
    llm = AWSNovaSonicLLMService(
        secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        session_token=os.getenv("AWS_SESSION_TOKEN"),
        region='us-east-1',
        voice_id="matthew",  # Available voices: matthew, tiffany, amy
        params=params
    )
    
    # Register functions
    llm.register_function("getDateAndTimeTool", get_date_and_time_tool)
    llm.register_function("trackOrderTool", track_order_tool)
    
    # Set up conversation context
    context = OpenAILLMContext(
        messages=[
            {"role": "system", "content": system_instruction},
        ],
        tools=tools,
    )
    context_aggregator = llm.create_context_aggregator(context)
    
    # Create transcript processor
    transcript = TranscriptProcessor()
    
    # Configure processing pipeline
    pipeline = Pipeline([
        transport.input(),  # Transport user input
        context_aggregator.user(),
        llm,
        transport.output(),  # Transport bot output
        transcript.user(),
        transcript.assistant(),
        context_aggregator.assistant(),
    ])
    
    # Create pipeline task
    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            allow_interruptions=True,
            enable_metrics=True,
            enable_usage_metrics=True,
            audio_in_sample_rate=SAMPLE_RATE,
            audio_out_sample_rate=SAMPLE_RATE
        ),
    )
    
    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        """Handle new client connections"""
        # Suppress connection messages
        await task.queue_frames([context_aggregator.user().get_context_frame()])
        # Trigger initial assistant response
        await llm.trigger_assistant_response()
    
    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        """Handle client disconnection"""
        # Suppress disconnection messages
        await task.cancel()
    
    @transcript.event_handler("on_transcript_update")
    async def handle_transcript_update(processor, frame):
        """Handle transcript updates"""
        for message in frame.messages:
            # Log to console
            logger.info(f"Transcript: [{message.timestamp}] {message.role}: {message.content}")
            
            # Send transcript to client via WebSocket
            transcript_message = {
                "event": "transcript",
                "role": message.role,
                "content": message.content,
                "timestamp": message.timestamp
            }
            
            try:
                await websocket.send_text(json.dumps(transcript_message))
            except Exception as e:
                logger.error(f"Failed to send transcript to client: {e}")
    
    # Run the pipeline
    runner = PipelineRunner(handle_sigint=False, force_gc=True)
    await runner.run(task)

# Initialize FastAPI application
app = FastAPI(title="Nova Sonic Enhanced with PipeCat")

@app.get('/health')
async def health(request: Request):
    """Health check endpoint"""
    return {"status": "ok", "service": "nova-sonic-enhanced-pipecat"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for audio streaming"""
    # Validate API key from protocol header
    protocol = websocket.headers.get('sec-websocket-protocol')
    
    if protocol != API_KEY:
        logger.warning(f"Invalid API key: {protocol}")
        await websocket.close(code=1008, reason="Invalid API key")
        return
    
    await websocket.accept(subprotocol=API_KEY)
    # Suppress WebSocket connection messages
    
    try:
        await setup_pipeline(websocket)
    except Exception as e:
        logger.error(f"Pipeline error: {e}")
        await websocket.close(code=1011, reason="Pipeline error")

def main():
    """Main entry point"""
    # Configure logging to show only transcription messages
    import logging
    
    # Disable all default logging
    logger.remove()
    
    # Add custom filter to show only transcript messages
    def transcript_filter(record):
        return "Transcript:" in record["message"]
    
    # Add logger with transcript filter
    logger.add(sys.stdout, filter=transcript_filter, format="{message}", level="INFO")
    
    # Suppress uvicorn and other library logs
    logging.getLogger("uvicorn").setLevel(logging.CRITICAL)
    logging.getLogger("uvicorn.access").setLevel(logging.CRITICAL)
    logging.getLogger("uvicorn.error").setLevel(logging.CRITICAL)
    logging.getLogger("fastapi").setLevel(logging.CRITICAL)
    logging.getLogger("pipecat").setLevel(logging.CRITICAL)
    logging.getLogger("websockets").setLevel(logging.CRITICAL)
    logging.getLogger("asyncio").setLevel(logging.CRITICAL)
    
    # Check for required environment variables
    required_env_vars = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {missing_vars}")
        sys.exit(1)
    
    # Configure and start uvicorn server
    config = uvicorn.Config(
        app=app,
        host='0.0.0.0',
        port=8000,
        log_level="critical"  # Suppress uvicorn logs
    )
    
    server = uvicorn.Server(config)
    asyncio.run(server.serve())

if __name__ == "__main__":
    main()
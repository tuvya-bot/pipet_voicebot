# Integration Guide: CloudFormation Infrastructure + Pipecat Voice Bot

This guide shows how to integrate the deployed CloudFormation infrastructure with your existing `pipecat_nova_sonic.py` voice bot.

## 🚀 **Step 1: Deploy the Infrastructure**

```bash
cd cloudformation
./deploy-voice-chatbot.sh deploy
```

After deployment, get your endpoints:
```bash
./deploy-voice-chatbot.sh outputs
```

## 🔗 **Step 2: Update Your Pipecat Configuration**

### **Environment Variables**
Add these to your environment (or update your `.env` file):

```bash
# Get these values from the CloudFormation outputs
export WEBSOCKET_API_ENDPOINT="wss://your-api-id.execute-api.us-east-1.amazonaws.com/dev"
export HTTP_API_ENDPOINT="https://your-api-id.execute-api.us-east-1.amazonaws.com/dev"
export SESSION_TABLE_NAME="voice-chatbot-sessions-dev"
export KNOWLEDGE_BASE_TABLE_NAME="voice-chatbot-knowledge-base-dev"
export CONVERSATION_TABLE_NAME="voice-chatbot-conversation-history-dev"
export DAX_ENDPOINT="voice-chatbot-dax-cluster-dev.abc123.dax-clusters.us-east-1.amazonaws.com:8111"
```

### **Update pipecat_nova_sonic.py**

Add these imports and configurations to your existing file:

```python
# Add these imports at the top
import boto3
from botocore.exceptions import ClientError
import hashlib
from datetime import datetime, timedelta

# Add these configurations after your existing imports
class CloudFormationIntegration:
    """Integration with deployed CloudFormation infrastructure"""
    
    def __init__(self):
        # Initialize AWS clients
        self.dynamodb = boto3.resource('dynamodb')
        self.dax_client = None  # Initialize DAX client if needed
        
        # Table references
        self.session_table = self.dynamodb.Table(os.environ.get('SESSION_TABLE_NAME', ''))
        self.kb_table = self.dynamodb.Table(os.environ.get('KNOWLEDGE_BASE_TABLE_NAME', ''))
        self.conversation_table = self.dynamodb.Table(os.environ.get('CONVERSATION_TABLE_NAME', ''))
        
        # API endpoints
        self.websocket_endpoint = os.environ.get('WEBSOCKET_API_ENDPOINT', '')
        self.http_endpoint = os.environ.get('HTTP_API_ENDPOINT', '')
    
    async def store_session(self, session_id: str, connection_id: str, user_data: dict = None):
        """Store session information in DynamoDB"""
        try:
            timestamp = int(datetime.now().timestamp())
            ttl = int((datetime.now() + timedelta(hours=24)).timestamp())
            
            item = {
                'session_id': session_id,
                'timestamp': timestamp,
                'connection_id': connection_id,
                'status': 'active',
                'ttl': ttl
            }
            
            if user_data:
                item.update(user_data)
            
            self.session_table.put_item(Item=item)
            logger.info(f"Session {session_id} stored successfully")
            
        except Exception as e:
            logger.error(f"Failed to store session: {e}")
    
    async def get_relevant_context(self, query: str, top_k: int = 3) -> list:
        """Retrieve relevant context from knowledge base"""
        try:
            # Simple keyword-based search (enhance with vector search later)
            response = self.kb_table.scan()
            items = response.get('Items', [])
            
            # Score items based on query relevance
            query_words = query.lower().split()
            scored_items = []
            
            for item in items:
                content = item.get('content', '').lower()
                title = item.get('title', '').lower()
                
                score = 0
                for word in query_words:
                    score += content.count(word) + title.count(word) * 2
                
                if score > 0:
                    scored_items.append((score, item))
            
            # Return top scored items
            scored_items.sort(key=lambda x: x[0], reverse=True)
            return [item[1] for item in scored_items[:top_k]]
            
        except Exception as e:
            logger.error(f"Failed to retrieve context: {e}")
            return []
    
    async def store_conversation(self, session_id: str, role: str, content: str):
        """Store conversation message"""
        try:
            timestamp = int(datetime.now().timestamp() * 1000)  # milliseconds
            ttl = int((datetime.now() + timedelta(days=7)).timestamp())  # 7 days
            
            self.conversation_table.put_item(Item={
                'session_id': session_id,
                'message_timestamp': timestamp,
                'role': role,
                'content': content,
                'ttl': ttl
            })
            
        except Exception as e:
            logger.error(f"Failed to store conversation: {e}")

# Initialize the integration
cf_integration = CloudFormationIntegration()
```

### **Enhanced Tool Functions with RAG**

Update your existing tool functions to use the knowledge base:

```python
async def enhanced_customer_support_tool(params: FunctionCallParams):
    """Enhanced customer support with RAG"""
    query = params.arguments.get("query", "")
    
    if not query:
        await params.result_callback({"error": "Query is required"})
        return
    
    try:
        # Get relevant context from knowledge base
        context = await cf_integration.get_relevant_context(query, top_k=3)
        
        if context:
            # Use the best matching context
            best_context = context[0]
            response = {
                "answer": best_context.get('content', ''),
                "category": best_context.get('category', ''),
                "confidence": best_context.get('confidence', 1.0),
                "source": best_context.get('source', '')
            }
        else:
            response = {
                "answer": "I don't have specific information about that. Let me connect you with a human agent.",
                "category": "general",
                "confidence": 0.5
            }
        
        await params.result_callback(response)
        
    except Exception as e:
        logger.error(f"Error in customer support tool: {e}")
        await params.result_callback({"error": "I'm having trouble accessing our knowledge base right now."})

# Add the new tool to your function schema
customer_support_function = FunctionSchema(
    name="customerSupportTool",
    description="Get answers to customer support questions using our knowledge base",
    properties={
        "query": {
            "type": "string",
            "description": "The customer's question or support query"
        }
    },
    required=["query"]
)
```

### **Update Your Pipeline Setup**

Modify your `setup_pipeline` function to include session management:

```python
async def setup_pipeline(websocket: WebSocket):
    """Setup the PipeCat audio processing pipeline with CloudFormation integration"""
    
    # Generate session ID
    session_id = str(uuid.uuid4())
    connection_id = f"ws_{int(datetime.now().timestamp())}"
    
    # Store session information
    await cf_integration.store_session(session_id, connection_id)
    
    # Your existing system instruction
    system_instruction = """You are a helpful customer support assistant with access to our knowledge base. 
    You can help with various tasks including:
    - Answering questions using our knowledge base
    - Getting current date and time information
    - Tracking order status
    - General conversation and assistance
    
    When you have relevant information from our knowledge base, use it to provide accurate and helpful responses.
    Be conversational and empathetic in your responses."""
    
    # Update your tools schema to include the new customer support tool
    tools = ToolsSchema(standard_tools=[
        date_time_function, 
        track_order_function,
        customer_support_function  # Add this
    ])
    
    # Register the new function
    llm.register_function("customerSupportTool", enhanced_customer_support_tool)
    
    # Your existing pipeline setup continues...
    # ... rest of your setup_pipeline function
```

## 📊 **Step 3: Populate Your Knowledge Base**

### **Using the HTTP API**

```bash
# Add knowledge base items via the HTTP API
curl -X POST "${HTTP_API_ENDPOINT}/knowledge-base" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "shipping",
    "title": "Standard Shipping Times",
    "content": "Standard shipping typically takes 3-5 business days within the continental US. Express shipping takes 1-2 business days.",
    "source": "shipping_policy_v2.1",
    "confidence": 0.95
  }'
```

### **Using Python Script**

Create a script to populate your knowledge base:

```python
import boto3
import json
from datetime import datetime
import hashlib

def populate_knowledge_base():
    dynamodb = boto3.resource('dynamodb')
    kb_table = dynamodb.Table(os.environ['KNOWLEDGE_BASE_TABLE_NAME'])
    
    knowledge_items = [
        {
            'category': 'shipping',
            'title': 'Standard Shipping Times',
            'content': 'Standard shipping typically takes 3-5 business days within the continental US.',
            'source': 'shipping_policy',
            'confidence': 0.95
        },
        # Add more items...
    ]
    
    for item in knowledge_items:
        chunk_id = hashlib.md5(item['content'].encode()).hexdigest()[:12]
        
        kb_table.put_item(Item={
            'chunk_id': chunk_id,
            'category': item['category'],
            'title': item['title'],
            'content': item['content'],
            'source': item['source'],
            'confidence': item['confidence'],
            'last_updated': datetime.now().isoformat()
        })
    
    print(f"Added {len(knowledge_items)} items to knowledge base")

if __name__ == "__main__":
    populate_knowledge_base()
```

## 🔧 **Step 4: Update Your Client**

Update your HTML client to use the new WebSocket endpoint:

```javascript
// Update your WebSocket connection
const ws = new WebSocket('wss://your-api-id.execute-api.us-east-1.amazonaws.com/dev', 'nova-sonic-enhanced-api-key');

// Handle additional message types
ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    
    switch(data.event) {
        case 'media':
            // Handle audio response
            playAudioResponse(data.data);
            break;
        case 'transcript':
            // Handle transcript updates
            displayTranscript(data.role, data.content);
            break;
        case 'context_used':
            // Handle RAG context information
            displayContextInfo(data.context);
            break;
        default:
            console.log('Unknown event type:', data.event);
    }
};
```

## 🧪 **Step 5: Test Your Integration**

### **Test the Health Endpoint**
```bash
curl ${HTTP_API_ENDPOINT}/health
```

### **Test RAG Query**
```bash
curl -X POST "${HTTP_API_ENDPOINT}/rag/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "How long does shipping take?"}'
```

### **Test WebSocket Connection**
Use your existing HTML client or create a simple test:

```javascript
const ws = new WebSocket('wss://your-api-id.execute-api.us-east-1.amazonaws.com/dev', 'nova-sonic-enhanced-api-key');

ws.onopen = function() {
    console.log('Connected to voice chatbot');
    // Send a test message
    ws.send(JSON.stringify({
        action: 'audiostream',
        audioData: 'base64_encoded_test_audio'
    }));
};
```

## 📈 **Step 6: Monitor Your Deployment**

### **View Logs**
```bash
# Session manager logs
aws logs tail /aws/lambda/voice-chatbot-session-manager-dev --follow

# Audio processor logs
aws logs tail /aws/lambda/voice-chatbot-audio-processor-dev --follow

# RAG processor logs
aws logs tail /aws/lambda/voice-chatbot-rag-processor-dev --follow
```

### **Check DynamoDB Tables**
```bash
# List items in knowledge base
aws dynamodb scan --table-name voice-chatbot-knowledge-base-dev --max-items 10

# Check session data
aws dynamodb scan --table-name voice-chatbot-sessions-dev --max-items 10
```

## 🎯 **Next Steps**

1. **Enhance RAG**: Implement vector embeddings for better semantic search
2. **Add Authentication**: Implement user authentication and authorization
3. **Monitoring**: Set up CloudWatch alarms and dashboards
4. **Performance**: Optimize Lambda cold starts and DynamoDB queries
5. **Scaling**: Configure auto-scaling for production workloads

## 🆘 **Troubleshooting**

### **Common Issues**

1. **WebSocket Connection Fails**
   - Check API Gateway endpoint URL
   - Verify WebSocket protocol header
   - Check AWS credentials

2. **Lambda Functions Timeout**
   - Increase timeout in CloudFormation template
   - Check VPC configuration for DAX access
   - Monitor CloudWatch logs

3. **DynamoDB Access Denied**
   - Verify IAM permissions
   - Check table names in environment variables
   - Ensure tables exist in correct region

### **Debug Commands**
```bash
# Check stack status
./deploy-voice-chatbot.sh status

# View stack outputs
./deploy-voice-chatbot.sh outputs

# Validate templates
./deploy-voice-chatbot.sh validate
```

---

**🎉 Congratulations!** Your pipecat voice bot is now integrated with scalable AWS infrastructure, complete with RAG capabilities and real-time processing!

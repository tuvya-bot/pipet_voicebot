# Voice Chatbot CloudFormation Infrastructure

Complete AWS Infrastructure-as-Code (IaC) solution for deploying a real-time voice chatbot with RAG capabilities, speech-to-speech processing, and sub-millisecond context retrieval.

## 📁 **Folder Contents**

```
cloudformation/
├── README.md                           # This file - main entry point
├── CLOUDFORMATION_README.md            # Detailed technical documentation
├── deploy-voice-chatbot.sh            # Automated deployment script
├── voice-chatbot-infrastructure.yaml  # Core infrastructure (VPC, DynamoDB, DAX)
├── voice-chatbot-compute.yaml         # Lambda functions and compute resources
└── voice-chatbot-api.yaml             # API Gateway (WebSocket + HTTP)
```

## 🚀 **Quick Start**

### 1. Prerequisites
- AWS CLI configured with appropriate permissions
- CloudFormation deployment permissions
- Access to Amazon Bedrock Nova Sonic model

### 2. Deploy Everything
```bash
cd cloudformation
./deploy-voice-chatbot.sh deploy
```

### 3. Get Your Endpoints
```bash
./deploy-voice-chatbot.sh outputs
```

## 🏗️ **What Gets Deployed**

### **Infrastructure Stack** (`voice-chatbot-infrastructure.yaml`)
- **VPC & Networking**: Isolated environment with private subnets
- **DynamoDB Tables**: Session storage, knowledge base, conversation history
- **DAX Cluster**: Sub-millisecond caching (<2ms response time)
- **Security Groups**: Network access control

### **Compute Stack** (`voice-chatbot-compute.yaml`)
- **Session Manager Lambda**: WebSocket connection handling
- **Audio Processor Lambda**: Real-time audio processing with Nova Sonic
- **RAG Processor Lambda**: Knowledge retrieval and response generation
- **IAM Roles**: Least-privilege security policies

### **API Stack** (`voice-chatbot-api.yaml`)
- **WebSocket API**: Real-time bidirectional audio streaming
- **HTTP API**: REST endpoints for management and health checks
- **API Routes**: Connect, disconnect, audio streaming, RAG queries
- **CloudWatch Logs**: Centralized logging and monitoring

## 🔧 **Deployment Commands**

```bash
# Deploy all stacks
./deploy-voice-chatbot.sh deploy

# Deploy to specific environment
./deploy-voice-chatbot.sh deploy --environment prod --region us-west-2

# Validate templates before deployment
./deploy-voice-chatbot.sh validate

# Check deployment status
./deploy-voice-chatbot.sh status

# View all stack outputs (endpoints, table names, etc.)
./deploy-voice-chatbot.sh outputs

# Delete all resources
./deploy-voice-chatbot.sh delete
```

## 🌍 **Environment Support**

| Environment | DAX Node Type | Lambda Memory | DynamoDB Billing | API Throttling |
|-------------|---------------|---------------|------------------|----------------|
| **dev**     | dax.t3.small  | 1024 MB       | PAY_PER_REQUEST  | 200 RPS        |
| **staging** | dax.r4.large  | 2048 MB       | PAY_PER_REQUEST  | 500 RPS        |
| **prod**    | dax.r4.xlarge | 3008 MB       | PROVISIONED      | 1000 RPS       |

## 🔗 **Integration with Pipecat**

After deployment, integrate with your existing `pipecat_nova_sonic.py`:

1. **Get the WebSocket endpoint**:
```bash
./deploy-voice-chatbot.sh outputs | grep WebSocketApiEndpoint
```

2. **Update your pipecat configuration**:
```python
# Use the deployed WebSocket endpoint
WEBSOCKET_ENDPOINT = "wss://your-api-id.execute-api.region.amazonaws.com/dev"

# Access deployed resources
SESSION_TABLE_NAME = os.environ.get('SESSION_TABLE_NAME')
KNOWLEDGE_BASE_TABLE_NAME = os.environ.get('KNOWLEDGE_BASE_TABLE_NAME')
DAX_ENDPOINT = os.environ.get('DAX_ENDPOINT')
```

## 📊 **Key Features**

### **Real-time Performance**
- Sub-millisecond context retrieval with DAX
- WebSocket streaming for audio
- Optimized Lambda cold starts

### **RAG-Ready**
- Knowledge base storage in DynamoDB
- Vector search capabilities
- Context caching for fast retrieval

### **Production-Ready**
- Multi-environment support
- Auto-scaling based on demand
- Comprehensive monitoring and logging

### **Cost-Optimized**
- Pay-per-request billing for development
- Environment-specific resource sizing
- Automatic data cleanup with TTL

## 🔍 **Monitoring & Troubleshooting**

### **View Logs**
```bash
# Lambda function logs
aws logs tail /aws/lambda/voice-chatbot-session-manager-dev --follow

# API Gateway logs
aws logs tail /aws/apigateway/voice-chatbot-websocket-dev --follow
```

### **Health Check**
```bash
# Test the HTTP API health endpoint
curl https://your-api-id.execute-api.region.amazonaws.com/dev/health
```

### **Common Issues**
- **Stack creation fails**: Check IAM permissions and AWS CLI configuration
- **Lambda can't access DAX**: Verify VPC configuration and security groups
- **API timeouts**: Check Lambda timeout settings and CloudWatch logs

## 📚 **Documentation**

- **`CLOUDFORMATION_README.md`**: Detailed technical documentation
- **Template comments**: Inline documentation in YAML files
- **AWS Documentation**: [CloudFormation User Guide](https://docs.aws.amazon.com/cloudformation/)

## 🛡️ **Security**

- **Network Isolation**: Resources deployed in private subnets
- **Least Privilege**: IAM roles with minimal required permissions
- **Encryption**: At-rest encryption for DynamoDB, TLS for APIs
- **Access Control**: Security groups and NACLs

## 💰 **Cost Estimation**

Estimated monthly costs (us-east-1, moderate usage):

| Environment | Estimated Cost |
|-------------|----------------|
| **dev**     | $50-100/month  |
| **staging** | $150-300/month |
| **prod**    | $500-1000/month|

*Costs vary based on usage patterns, data storage, and API calls*

## 🆘 **Support**

For issues or questions:
1. Check the detailed documentation in `CLOUDFORMATION_README.md`
2. Review CloudWatch logs for error details
3. Validate templates with `./deploy-voice-chatbot.sh validate`
4. Check AWS CloudFormation console for stack events

## 🧹 **Cleanup**

To remove all deployed resources:
```bash
./deploy-voice-chatbot.sh delete
```

⚠️ **Warning**: This will permanently delete all data and resources. Make sure to backup any important data first.

---

**Ready to deploy your voice chatbot infrastructure? Start with:**
```bash
cd cloudformation
./deploy-voice-chatbot.sh deploy
```

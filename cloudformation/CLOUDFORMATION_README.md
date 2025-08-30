# Voice Chatbot CloudFormation Infrastructure

This directory contains AWS CloudFormation templates for deploying a complete voice chatbot infrastructure with real-time speech-to-speech capabilities, RAG (Retrieval-Augmented Generation), and sub-millisecond context retrieval.

## Architecture Overview

The infrastructure is deployed in three separate CloudFormation stacks for modularity and easier management:

### 1. Infrastructure Stack (`voice-chatbot-infrastructure.yaml`)
- **VPC and Networking**: Isolated network environment with private subnets
- **DynamoDB Tables**: Session storage, knowledge base, and conversation history
- **DAX Cluster**: Sub-millisecond caching for context retrieval
- **Security Groups**: Network access control

### 2. Compute Stack (`voice-chatbot-compute.yaml`)
- **Lambda Functions**: Session management, audio processing, and RAG processing
- **IAM Roles**: Least-privilege access policies
- **VPC Configuration**: Lambda functions in private subnets with DAX access

### 3. API Stack (`voice-chatbot-api.yaml`)
- **WebSocket API**: Real-time bidirectional communication
- **HTTP API**: REST endpoints for management and health checks
- **API Gateway Routes**: Connect, disconnect, audio streaming, and RAG queries
- **CloudWatch Logs**: Centralized logging and monitoring

## Quick Start

### Prerequisites
- AWS CLI configured with appropriate permissions
- CloudFormation deployment permissions
- Access to Amazon Bedrock Nova Sonic model

### Deploy Everything
```bash
# Make the script executable (if not already done)
chmod +x deploy-voice-chatbot.sh

# Deploy all stacks
./deploy-voice-chatbot.sh deploy
```

### Deploy to Different Environment
```bash
# Deploy to production
./deploy-voice-chatbot.sh deploy --environment prod --region us-west-2
```

## Detailed Deployment Options

### Validate Templates
```bash
./deploy-voice-chatbot.sh validate
```

### Check Stack Status
```bash
./deploy-voice-chatbot.sh status
```

### View Stack Outputs
```bash
./deploy-voice-chatbot.sh outputs
```

### Delete All Stacks
```bash
./deploy-voice-chatbot.sh delete
```

## Manual Deployment

If you prefer to deploy stacks manually:

### 1. Deploy Infrastructure Stack
```bash
aws cloudformation create-stack \
    --stack-name voice-chatbot-dev-infrastructure \
    --template-body file://voice-chatbot-infrastructure.yaml \
    --parameters ParameterKey=Environment,ParameterValue=dev ParameterKey=ProjectName,ParameterValue=voice-chatbot \
    --capabilities CAPABILITY_NAMED_IAM \
    --region us-east-1
```

### 2. Deploy Compute Stack (after infrastructure completes)
```bash
aws cloudformation create-stack \
    --stack-name voice-chatbot-dev-compute \
    --template-body file://voice-chatbot-compute.yaml \
    --parameters ParameterKey=Environment,ParameterValue=dev ParameterKey=ProjectName,ParameterValue=voice-chatbot \
    --capabilities CAPABILITY_NAMED_IAM \
    --region us-east-1
```

### 3. Deploy API Stack (after compute completes)
```bash
aws cloudformation create-stack \
    --stack-name voice-chatbot-dev-api \
    --template-body file://voice-chatbot-api.yaml \
    --parameters ParameterKey=Environment,ParameterValue=dev ParameterKey=ProjectName,ParameterValue=voice-chatbot \
    --capabilities CAPABILITY_NAMED_IAM \
    --region us-east-1
```

## Configuration Parameters

| Parameter | Default | Description | Allowed Values |
|-----------|---------|-------------|----------------|
| Environment | dev | Environment name | dev, staging, prod |
| ProjectName | voice-chatbot | Project name for resource naming | Any string |
| VpcCidr | 10.0.0.0/16 | CIDR block for VPC | Valid CIDR |
| PrivateSubnet1Cidr | 10.0.1.0/24 | CIDR for private subnet 1 | Valid CIDR |
| PrivateSubnet2Cidr | 10.0.2.0/24 | CIDR for private subnet 2 | Valid CIDR |

## Environment-Specific Configurations

The templates use mappings to configure resources based on environment:

### Development (dev)
- DAX Node Type: `dax.t3.small`
- Lambda Memory: `1024 MB`
- DynamoDB Billing: `PAY_PER_REQUEST`
- API Throttling: 200 RPS, 500 burst

### Staging (staging)
- DAX Node Type: `dax.r4.large`
- Lambda Memory: `2048 MB`
- DynamoDB Billing: `PAY_PER_REQUEST`
- API Throttling: 500 RPS, 1000 burst

### Production (prod)
- DAX Node Type: `dax.r4.xlarge`
- Lambda Memory: `3008 MB`
- DynamoDB Billing: `PROVISIONED`
- API Throttling: 1000 RPS, 2000 burst

## Key Outputs

After successful deployment, you'll receive these important outputs:

### Infrastructure Stack
- **VPCId**: VPC identifier for the isolated network
- **DAXClusterEndpoint**: DAX cluster endpoint for sub-millisecond caching
- **SessionTableName**: DynamoDB table for session storage
- **KnowledgeBaseTableName**: DynamoDB table for RAG knowledge base
- **ConversationHistoryTableName**: DynamoDB table for conversation history

### Compute Stack
- **SessionManagerFunctionArn**: Lambda function for session management
- **AudioProcessorFunctionArn**: Lambda function for audio processing
- **RAGProcessorFunctionArn**: Lambda function for RAG processing

### API Stack
- **WebSocketApiEndpoint**: WebSocket endpoint for real-time communication
- **HttpApiEndpoint**: HTTP API endpoint for management operations

## API Endpoints

### WebSocket API
- **Connection**: `wss://your-api-id.execute-api.region.amazonaws.com/dev`
- **Routes**:
  - `$connect`: Handle new connections
  - `$disconnect`: Handle disconnections
  - `audiostream`: Process audio streams
  - `$default`: Default message handler

### HTTP API
- **Base URL**: `https://your-api-id.execute-api.region.amazonaws.com/dev`
- **Endpoints**:
  - `GET /health`: Health check
  - `POST /rag/query`: RAG query processing
  - `POST /knowledge-base`: Knowledge base management

## Integration with Existing Pipecat Code

To integrate with your existing `pipecat_nova_sonic.py`:

1. **Update Environment Variables**:
```python
# Add these to your environment
SESSION_TABLE_NAME = os.environ.get('SESSION_TABLE_NAME')
KNOWLEDGE_BASE_TABLE_NAME = os.environ.get('KNOWLEDGE_BASE_TABLE_NAME')
DAX_ENDPOINT = os.environ.get('DAX_ENDPOINT')
```

2. **Initialize AWS Clients**:
```python
import boto3

# Initialize clients with DAX support
dynamodb = boto3.resource('dynamodb')
dax_client = boto3.client('dax', endpoint_url=DAX_ENDPOINT)
```

3. **Update WebSocket Handler**:
```python
# Use the deployed WebSocket API endpoint
WEBSOCKET_ENDPOINT = "wss://your-api-id.execute-api.region.amazonaws.com/dev"
```

## Monitoring and Logging

### CloudWatch Logs
- Lambda function logs: `/aws/lambda/function-name`
- API Gateway logs: `/aws/apigateway/api-name`

### CloudWatch Metrics
- Lambda invocations, duration, errors
- API Gateway requests, latency, errors
- DynamoDB read/write capacity, throttles
- DAX cache hits, misses, latency

### Alarms (Recommended)
```bash
# Create CloudWatch alarms for monitoring
aws cloudwatch put-metric-alarm \
    --alarm-name "VoiceChatbot-HighErrorRate" \
    --alarm-description "High error rate in voice chatbot" \
    --metric-name Errors \
    --namespace AWS/Lambda \
    --statistic Sum \
    --period 300 \
    --threshold 10 \
    --comparison-operator GreaterThanThreshold
```

## Security Considerations

### Network Security
- Lambda functions deployed in private subnets
- DAX cluster isolated in VPC
- Security groups with minimal required access
- No direct internet access for compute resources

### IAM Security
- Least privilege access policies
- Separate roles for different functions
- No hardcoded credentials in code
- Resource-based policies where appropriate

### Data Protection
- Encryption at rest for DynamoDB tables
- TLS encryption for all API communications
- Session data TTL for automatic cleanup
- Point-in-time recovery enabled

## Cost Optimization

### Resource Sizing
- Environment-specific resource sizing
- Pay-per-request billing for development
- Reserved capacity for production workloads

### Cost Monitoring
```bash
# Enable cost allocation tags
aws ce get-cost-and-usage \
    --time-period Start=2024-01-01,End=2024-01-31 \
    --granularity MONTHLY \
    --metrics BlendedCost \
    --group-by Type=DIMENSION,Key=SERVICE
```

## Troubleshooting

### Common Issues

1. **Stack Creation Fails**
   - Check IAM permissions
   - Verify AWS CLI configuration
   - Ensure unique resource names

2. **Lambda Functions Can't Access DAX**
   - Verify VPC configuration
   - Check security group rules
   - Ensure Lambda functions are in correct subnets

3. **API Gateway Timeouts**
   - Check Lambda function timeout settings
   - Monitor CloudWatch logs for errors
   - Verify network connectivity

### Debug Commands
```bash
# Check stack events
aws cloudformation describe-stack-events --stack-name voice-chatbot-dev-infrastructure

# View Lambda logs
aws logs tail /aws/lambda/voice-chatbot-session-manager-dev --follow

# Test API endpoints
curl -X GET https://your-api-id.execute-api.region.amazonaws.com/dev/health
```

## Cleanup

To completely remove all resources:

```bash
# Delete all stacks
./deploy-voice-chatbot.sh delete

# Verify deletion
aws cloudformation list-stacks --stack-status-filter DELETE_COMPLETE
```

## Support and Maintenance

### Regular Tasks
- Monitor CloudWatch alarms and metrics
- Review and rotate IAM credentials
- Update Lambda runtime versions
- Optimize DynamoDB and DAX performance

### Updates
- Test changes in development environment first
- Use CloudFormation change sets for production updates
- Maintain backup and recovery procedures
- Document all configuration changes

## License

This infrastructure template is provided as-is for educational and development purposes. Ensure compliance with your organization's policies and AWS best practices before production deployment.

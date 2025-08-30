import { 
  BedrockRuntimeClient, 
  InvokeModelCommand 
} from '@aws-sdk/client-bedrock-runtime';

export class BedrockService {
  constructor() {
    // Debug: Log environment variables
    console.log('Environment check:', {
      region: process.env.REACT_APP_AWS_REGION,
      hasAccessKey: !!process.env.REACT_APP_AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
      hasSessionToken: !!process.env.REACT_APP_AWS_SESSION_TOKEN,
      accessKeyPrefix: process.env.REACT_APP_AWS_ACCESS_KEY_ID?.substring(0, 4) + '...'
    });

    // Check if AWS credentials are configured
    this.isConfigured = !!(
      process.env.REACT_APP_AWS_ACCESS_KEY_ID && 
      process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
    );

    if (this.isConfigured) {
      // Initialize Bedrock client with environment variables
      const credentials = {
        accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
      };

      // Add session token if available (for temporary credentials)
      if (process.env.REACT_APP_AWS_SESSION_TOKEN) {
        credentials.sessionToken = process.env.REACT_APP_AWS_SESSION_TOKEN;
      }

      this.client = new BedrockRuntimeClient({
        region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
        credentials: credentials,
      });
      
      this.modelId = process.env.REACT_APP_BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
      console.log('BedrockService initialized with AWS credentials for region:', process.env.REACT_APP_AWS_REGION || 'us-east-1');
    } else {
      console.log('BedrockService initialized in placeholder mode - AWS credentials not configured');
      console.log('To configure: Set REACT_APP_AWS_ACCESS_KEY_ID and REACT_APP_AWS_SECRET_ACCESS_KEY environment variables');
    }
  }

  async sendMessage(userMessage, context = {}) {
    if (!this.isConfigured) {
      // Placeholder implementation when AWS is not configured
      console.log('Sending message to Claude (placeholder):', userMessage);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return `I understand you said: "${userMessage}". This is a placeholder response. Configure AWS credentials in .env file to enable real Claude responses.`;
    }

    try {
      // Prepare the system prompt with SOW-specific context
      const systemPrompt = this.buildSystemPrompt(context);
      
      // Prepare the request payload for Claude
      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.7,
        top_p: 0.9
      };

      console.log('Sending request to Bedrock with model:', this.modelId);

      const command = new InvokeModelCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload)
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      console.log('Received response from Claude');
      return responseBody.content[0].text;
    } catch (error) {
      console.error('Error calling Bedrock:', error);
      throw new Error(`Failed to get response from Claude: ${error.message}`);
    }
  }

  buildSystemPrompt(context) {
    return `You are Claude, an expert AI assistant specializing in helping users write professional Statements of Work (SOW). You have deep knowledge of:

1. SOW structure and best practices
2. Technical writing and clarity
3. Project management principles
4. Industry standards and compliance requirements
5. Risk assessment and mitigation strategies

Current Document Context:
- Title: ${context.documentTitle || 'Untitled SOW'}
- Sections: ${context.sections?.length || 0} sections
- Current Content: ${JSON.stringify(context.currentContent || [])}
- Selected Text: ${context.selectedText || 'None'}
- Has Selection: ${context.hasSelection || false}

IMPORTANT: When users give you actionable instructions that require you to create, modify, or add content to their document, respond with a JSON object containing:

{
  "type": "suggestion",
  "action": "replace|insert|append",
  "content": "the actual content to be applied",
  "explanation": "brief explanation of what you're doing"
}

Use your intelligence to determine the best action based on the user's intent and context:

- "replace": Use when the user wants to improve, fix, or change existing content (especially when they have text selected)
- "insert": Use when the user wants to add content at their current position or within the existing document flow
- "append": Use when the user wants to add new sections or content to the end of the document

Trust your understanding of the user's intent. Consider:
- What they're asking for
- Whether they have text selected
- The current document structure
- The natural flow of the document
- The user's implied intent

For conversational questions or when users are asking for advice/guidance (not requesting content changes), respond normally with helpful text.

Your role is to:
- Understand user intent naturally and choose the most appropriate action
- Provide clean, ready-to-use content for actionable requests
- Help structure sections logically and professionally
- Provide guidance and explanations for conversational questions
- Use your best judgment about where and how content should be applied`;
  }

  async generateSuggestions(selectedText, sectionType = 'general') {
    await new Promise(resolve => setTimeout(resolve, 800));
    return `Here are suggestions for improving this ${sectionType} section: "${selectedText}". (Placeholder response)`;
  }

  async clarifyRequirements(ambiguousText) {
    await new Promise(resolve => setTimeout(resolve, 800));
    return `This section needs clarification: "${ambiguousText}". (Placeholder response)`;
  }

  async validateSection(sectionContent, sectionType) {
    await new Promise(resolve => setTimeout(resolve, 800));
    return `Validation results for ${sectionType} section: "${sectionContent}". (Placeholder response)`;
  }
}

export default BedrockService;
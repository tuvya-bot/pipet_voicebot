import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, Plus, Replace, Copy } from 'lucide-react';
import { useSOWStore } from '../stores/sowStore';
import { BedrockService } from '../services/bedrockService';
import { useEditor } from '../contexts/EditorContext';

const ChatPanel = () => {
  const [inputValue, setInputValue] = useState('');
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  
  const {
    chatMessages,
    isClaudeTyping,
    addChatMessage,
    setClaudeTyping,
    setPendingSuggestion
  } = useSOWStore();
  
  const { 
    insertText, 
    replaceSelection, 
    insertAtEnd, 
    getCurrentContent, 
    getSelectedText,
    applySuggestion
  } = useEditor();

  const scrollToBottom = (force = false) => {
    if (!isUserScrolling || force) {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  };

  // Auto-scroll when new messages arrive or Claude is typing
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isClaudeTyping]);

  // Handle scroll detection to pause auto-scroll when user is manually scrolling
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const container = messagesContainerRef.current;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
    
    if (!isAtBottom) {
      setIsUserScrolling(true);
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Resume auto-scroll after 3 seconds of no scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 3000);
    } else {
      setIsUserScrolling(false);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isClaudeTyping) return;

    const userMessage = {
      role: 'user',
      content: inputValue.trim()
    };

    addChatMessage(userMessage);
    setInputValue('');
    setClaudeTyping(true);
    
    // Force scroll to bottom when user sends a message
    setIsUserScrolling(false);
    setTimeout(() => scrollToBottom(true), 100);

    try {
      // Use BedrockService to send message to Claude
      const bedrockService = new BedrockService();
      
      // Prepare context from current document state
      const currentContent = getCurrentContent();
      const selectedText = getSelectedText();
      
      const context = {
        documentTitle: 'SOW Document',
        sections: [],
        currentContent: currentContent,
        selectedText: selectedText,
        hasSelection: selectedText.length > 0
      };

      const response = await bedrockService.sendMessage(userMessage.content, context);
      
      // Try to parse as JSON to see if it's a structured suggestion
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(response);
      } catch (e) {
        parsedResponse = null;
      }
      
      if (parsedResponse && parsedResponse.type === 'suggestion') {
        // This is a structured suggestion from Claude
        const suggestion = {
          id: Date.now(),
          type: parsedResponse.action, // Claude decides the type
          content: parsedResponse.content,
          explanation: parsedResponse.explanation,
          applied: true,
          originalRequest: userMessage.content,
          timestamp: new Date().toISOString()
        };

        // Apply the suggestion immediately
        applySuggestion(suggestion);
        
        // Add message with inline accept/reject buttons
        addChatMessage({
          role: 'assistant',
          content: parsedResponse.content,
          explanation: parsedResponse.explanation,
          suggestion: suggestion,
          hasSuggestion: true
        });
      } else {
        // Regular chat response
        addChatMessage({
          role: 'assistant',
          content: response
        });
      }
    } catch (error) {
      console.error('Error sending message to Claude:', error);
      addChatMessage({
        role: 'assistant',
        content: 'I apologize, but I encountered an error while processing your request. Please check your AWS configuration.'
      });
    } finally {
      setClaudeTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="sidebar-panel">
      <div className="chat-panel">
        <div className="chat-header" style={{ 
          padding: '16px', 
          borderBottom: '1px solid #e2e8f0',
          background: 'white',
          borderRadius: '8px 8px 0 0'
        }}>
          <h3 style={{ 
            margin: 0, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            <Bot size={20} />
            Claude Assistant
          </h3>
          <p style={{ 
            margin: '4px 0 0 0', 
            fontSize: '14px', 
            color: '#6b7280' 
          }}>
            Get help with your SOW writing
          </p>
        </div>

        <div 
          className="chat-messages"
          ref={messagesContainerRef}
          onScroll={handleScroll}
        >
          {chatMessages.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              color: '#6b7280', 
              padding: '40px 20px',
              fontSize: '14px'
            }}>
              <Bot size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p>Hi! I'm Claude, your AI assistant for writing Statements of Work.</p>
              <p>I can help you with:</p>
              <ul style={{ 
                textAlign: 'left', 
                marginTop: '16px',
                paddingLeft: '20px'
              }}>
                <li>Structuring your SOW sections</li>
                <li>Improving clarity and professionalism</li>
                <li>Adding industry best practices</li>
                <li>Reviewing for completeness</li>
              </ul>
            </div>
          )}

          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.role}`}
            >
              <div className="message-header">
                {message.role === 'user' ? (
                  <>
                    <User size={16} style={{ marginRight: '4px' }} />
                    You
                  </>
                ) : (
                  <>
                    <Bot size={16} style={{ marginRight: '4px' }} />
                    Claude
                  </>
                )}
              </div>
              <div className="message-content" style={{
                fontStyle: message.isSystemMessage ? 'italic' : 'normal',
                color: message.isSystemMessage ? '#6b7280' : 'inherit'
              }}>
                {message.content}
              </div>
              
              {/* Show explanation for suggestions */}
              {message.explanation && (
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  fontStyle: 'italic',
                  marginTop: '4px'
                }}>
                  {message.explanation}
                </div>
              )}
              
              {/* Inline suggestion actions */}
              {message.hasSuggestion && message.suggestion && (
                <InlineSuggestionActions 
                  suggestion={message.suggestion}
                  messageId={message.id}
                />
              )}
              
              {/* Regular message actions for non-suggestions */}
              {message.role === 'assistant' && !message.isSystemMessage && !message.hasSuggestion && (
                <MessageActions 
                  message={message} 
                  onInsertText={insertText}
                  onReplaceSelection={replaceSelection}
                  onInsertAtEnd={insertAtEnd}
                />
              )}
            </div>
          ))}

          {isClaudeTyping && (
            <div className="message assistant">
              <div className="message-header">
                <Bot size={16} style={{ marginRight: '4px' }} />
                Claude
              </div>
              <div className="message-content" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px' 
              }}>
                <Loader size={16} className="animate-spin" />
                Thinking...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
          
          {/* Scroll to bottom indicator */}
          {isUserScrolling && (
            <div 
              style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                background: '#3b82f6',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                zIndex: 10
              }}
              onClick={() => {
                setIsUserScrolling(false);
                scrollToBottom(true);
              }}
            >
              ↓ New messages
            </div>
          )}
        </div>

        <div className="chat-input">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask Claude for help with your SOW..."
            disabled={isClaudeTyping}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isClaudeTyping}
            style={{
              opacity: (!inputValue.trim() || isClaudeTyping) ? 0.5 : 1,
              cursor: (!inputValue.trim() || isClaudeTyping) ? 'not-allowed' : 'pointer'
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Component for inline accept/reject actions
const InlineSuggestionActions = ({ suggestion, messageId }) => {
  const [status, setStatus] = useState('pending'); // pending, accepted, rejected
  const { acceptSuggestion, rejectSuggestion } = useSOWStore();
  const { undoLastChange } = useEditor();

  const handleAccept = () => {
    setStatus('accepted');
    acceptSuggestion();
  };

  const handleReject = () => {
    setStatus('rejected');
    // Undo the change that was automatically applied
    undoLastChange();
    rejectSuggestion();
  };

  if (status === 'accepted') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '8px',
        padding: '6px 10px',
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#166534'
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#10b981'
        }} />
        Suggestion accepted
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '8px',
        padding: '6px 10px',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#991b1b'
      }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#ef4444'
        }} />
        Suggestion rejected
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      gap: '6px',
      marginTop: '8px',
      alignItems: 'center'
    }}>
      <div style={{
        fontSize: '12px',
        color: '#6b7280',
        marginRight: '4px'
      }}>
        Applied automatically:
      </div>
      
      <button
        onClick={handleAccept}
        style={{
          padding: '4px 8px',
          fontSize: '12px',
          border: '1px solid #10b981',
          borderRadius: '4px',
          background: '#10b981',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        ✓ Accept
      </button>
      
      <button
        onClick={handleReject}
        style={{
          padding: '4px 8px',
          fontSize: '12px',
          border: '1px solid #ef4444',
          borderRadius: '4px',
          background: 'white',
          color: '#ef4444',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        ✗ Reject
      </button>
    </div>
  );
};

// Component for action buttons on Claude's messages (now only for non-actionable messages)
const MessageActions = ({ message, onInsertText, onReplaceSelection, onInsertAtEnd }) => {
  const handleInsertAtCursor = () => {
    onInsertText(message.content);
  };

  const handleReplaceSelected = () => {
    onReplaceSelection(message.content);
  };

  const handleAppendToEnd = () => {
    onInsertAtEnd(message.content);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
  };

  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      marginTop: '8px',
      flexWrap: 'wrap'
    }}>
      <button
        onClick={handleInsertAtCursor}
        style={{
          padding: '4px 8px',
          fontSize: '12px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          background: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
        title="Insert at cursor position"
      >
        <Plus size={12} />
        Insert
      </button>
      
      <button
        onClick={handleReplaceSelected}
        style={{
          padding: '4px 8px',
          fontSize: '12px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          background: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
        title="Replace selected text"
      >
        <Replace size={12} />
        Replace
      </button>
      
      <button
        onClick={handleAppendToEnd}
        style={{
          padding: '4px 8px',
          fontSize: '12px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          background: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
        title="Add to end of document"
      >
        <Plus size={12} />
        Append
      </button>
      
      <button
        onClick={handleCopyToClipboard}
        style={{
          padding: '4px 8px',
          fontSize: '12px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          background: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
        title="Copy to clipboard"
      >
        <Copy size={12} />
        Copy
      </button>
    </div>
  );
};

export default ChatPanel;
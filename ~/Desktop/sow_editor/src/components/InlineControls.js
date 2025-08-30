import React from 'react';
import { Check, Edit, X, MessageCircle } from 'lucide-react';
import { useSOWStore } from '../stores/sowStore';
import { useEditor } from '../contexts/EditorContext';

const InlineControls = () => {
  const {
    inlineControls,
    hideInlineControls,
    addChatMessage
  } = useSOWStore();
  
  const { getSelectedText } = useEditor();
  const selectedText = getSelectedText();

  const handleAccept = () => {
    console.log('Accepting suggestion for:', selectedText);
    // Here you would implement the logic to accept the current suggestion
    hideInlineControls();
  };

  const handleRevise = () => {
    if (selectedText) {
      addChatMessage({
        role: 'user',
        content: `Please help me revise this text: "${selectedText}"`
      });
    }
    hideInlineControls();
  };

  const handleReject = () => {
    console.log('Rejecting suggestion for:', selectedText);
    // Here you would implement the logic to reject the current suggestion
    hideInlineControls();
  };

  const handleAskClaude = () => {
    if (selectedText) {
      addChatMessage({
        role: 'user',
        content: `I need help with this section: "${selectedText}". Can you provide suggestions for improvement?`
      });
    }
    hideInlineControls();
  };

  return (
    <div
      className="inline-controls"
      style={{
        left: inlineControls.position.x - 100, // Center the controls
        top: inlineControls.position.y - 40,
      }}
    >
      <button
        onClick={handleAccept}
        title="Accept suggestion"
        style={{ color: '#10b981' }}
      >
        <Check size={14} />
      </button>
      
      <button
        onClick={handleRevise}
        title="Revise with Claude"
        style={{ color: '#3b82f6' }}
      >
        <Edit size={14} />
      </button>
      
      <button
        onClick={handleAskClaude}
        title="Ask Claude about this"
        style={{ color: '#8b5cf6' }}
      >
        <MessageCircle size={14} />
      </button>
      
      <button
        onClick={handleReject}
        title="Reject suggestion"
        style={{ color: '#ef4444' }}
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default InlineControls;
import React from 'react';
import { Check, X, Undo } from 'lucide-react';
import { useSOWStore } from '../stores/sowStore';
import { useEditor } from '../contexts/EditorContext';

const SuggestionPanel = () => {
  const {
    pendingSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    clearPendingSuggestion
  } = useSOWStore();

  const { applySuggestion, undoLastChange } = useEditor();

  if (!pendingSuggestion) return null;

  const handleAccept = () => {
    // Apply the suggestion to the editor
    applySuggestion(pendingSuggestion);
    
    // Mark as accepted in store
    acceptSuggestion();
  };

  const handleReject = () => {
    // If suggestion was already applied, undo it
    if (pendingSuggestion.applied) {
      undoLastChange();
    }
    
    // Mark as rejected in store
    rejectSuggestion();
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      maxWidth: '400px',
      zIndex: 1000
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: pendingSuggestion.applied ? '#10b981' : '#f59e0b'
        }} />
        <span style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151'
        }}>
          {pendingSuggestion.applied ? 'Suggestion Applied' : 'Suggestion Ready'}
        </span>
      </div>

      <div style={{
        fontSize: '14px',
        color: '#6b7280',
        marginBottom: '12px',
        lineHeight: '1.4'
      }}>
        {pendingSuggestion.explanation}
      </div>

      {pendingSuggestion.preview && (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '4px',
          padding: '8px',
          fontSize: '13px',
          fontFamily: 'monospace',
          marginBottom: '12px',
          maxHeight: '100px',
          overflow: 'auto'
        }}>
          {pendingSuggestion.preview}
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: '8px',
        justifyContent: 'flex-end'
      }}>
        <button
          onClick={handleReject}
          style={{
            padding: '6px 12px',
            fontSize: '14px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            background: 'white',
            color: '#6b7280',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <X size={14} />
          Reject
        </button>
        
        <button
          onClick={handleAccept}
          style={{
            padding: '6px 12px',
            fontSize: '14px',
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
          <Check size={14} />
          Accept
        </button>
      </div>
    </div>
  );
};

export default SuggestionPanel;
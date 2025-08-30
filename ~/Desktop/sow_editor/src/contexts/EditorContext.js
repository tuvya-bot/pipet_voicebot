import React, { createContext, useContext, useState } from 'react';

const EditorContext = createContext();

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};

export const EditorProvider = ({ children }) => {
  const [editorRef, setEditorRef] = useState(null);
  const [editorValue, setEditorValue] = useState([]);

  const insertText = (text) => {
    if (editorRef) {
      // Insert text at current cursor position
      editorRef.insertText(text);
    }
  };

  const replaceSelection = (newText) => {
    if (editorRef) {
      // Replace currently selected text
      editorRef.insertText(newText);
    }
  };

  const insertAtEnd = (text) => {
    if (editorRef) {
      // Move to end and insert text
      const { selection } = editorRef;
      const end = editorRef.end([]);
      editorRef.select(end);
      editorRef.insertText('\n' + text);
      // Restore selection if it existed
      if (selection) {
        editorRef.select(selection);
      }
    }
  };

  const applySuggestion = (suggestion) => {
    if (!editorRef || !suggestion) return;

    switch (suggestion.type) {
      case 'replace':
        if (suggestion.range) {
          // Replace specific range
          editorRef.select(suggestion.range);
          editorRef.insertText(suggestion.content);
        } else {
          // Replace selected text
          replaceSelection(suggestion.content);
        }
        break;
      case 'insert':
        if (suggestion.position) {
          // Insert at specific position
          editorRef.select(suggestion.position);
          editorRef.insertText(suggestion.content);
        } else {
          // Insert at cursor
          insertText(suggestion.content);
        }
        break;
      case 'append':
        insertAtEnd(suggestion.content);
        break;
      default:
        insertText(suggestion.content);
    }
  };

  const undoLastChange = () => {
    if (editorRef && editorRef.history && editorRef.history.undos.length > 0) {
      editorRef.undo();
    }
  };

  const getCurrentContent = () => {
    return editorValue;
  };

  const getSelectedText = () => {
    if (editorRef && editorRef.selection) {
      return editorRef.string(editorRef.selection);
    }
    return '';
  };

  const value = {
    editorRef,
    setEditorRef,
    editorValue,
    setEditorValue,
    insertText,
    replaceSelection,
    insertAtEnd,
    getCurrentContent,
    getSelectedText,
    applySuggestion,
    undoLastChange
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};

export default EditorContext;
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { createEditor, Editor, Transforms } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import ChatPanel from './ChatPanel';
import InlineControls from './InlineControls';
import Toolbar from './Toolbar';
import { useSOWStore } from '../stores/sowStore';
import { useEditor } from '../contexts/EditorContext';

const SOWEditor = () => {
  const {
    inlineControls,
    showInlineControls,
    hideInlineControls
  } = useSOWStore();

  const { setEditorRef, setEditorValue } = useEditor();
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);

  // Set editor reference in context when component mounts
  useEffect(() => {
    setEditorRef(editor);
  }, [editor, setEditorRef]);
  
  const [value, setValue] = useState([
    {
      type: 'paragraph',
      children: [{ text: 'Start writing your Statement of Work...' }],
    },
  ]);

  const renderElement = useCallback((props) => <Element {...props} />, []);
  const renderLeaf = useCallback((props) => <Leaf {...props} />, []);

  const handleChange = useCallback((newValue) => {
    setValue(newValue);
    setEditorValue(newValue); // Update context with current editor value
  }, [setEditorValue]);

  const handleSelectionChange = useCallback(() => {
    const { selection } = editor;
    
    if (selection && !Editor.isCollapsed(editor, selection)) {
      const selectedText = Editor.string(editor, selection);
      if (selectedText.trim()) {
        // Show inline controls for selected text
        const domSelection = window.getSelection();
        if (domSelection.rangeCount > 0) {
          const domRange = domSelection.getRangeAt(0);
          const rect = domRange.getBoundingClientRect();
          
          showInlineControls({
            x: rect.left + rect.width / 2,
            y: rect.top - 10
          });
        }
      }
    } else {
      hideInlineControls();
    }
  }, [editor, showInlineControls, hideInlineControls]);

  const handleKeyDown = useCallback((event) => {
    // Handle keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'z':
          event.preventDefault();
          if (event.shiftKey) {
            // Ctrl+Shift+Z or Cmd+Shift+Z for redo
            editor.redo();
          } else {
            // Ctrl+Z or Cmd+Z for undo
            editor.undo();
          }
          break;
        case 'y':
          // Ctrl+Y for redo (Windows style)
          event.preventDefault();
          editor.redo();
          break;
        case 'b':
          // Ctrl+B for bold
          event.preventDefault();
          const isActive = Editor.marks(editor)?.bold;
          if (isActive) {
            Editor.removeMark(editor, 'bold');
          } else {
            Editor.addMark(editor, 'bold', true);
          }
          break;
        case 'i':
          // Ctrl+I for italic
          event.preventDefault();
          const isItalicActive = Editor.marks(editor)?.italic;
          if (isItalicActive) {
            Editor.removeMark(editor, 'italic');
          } else {
            Editor.addMark(editor, 'italic', true);
          }
          break;
        case 'u':
          // Ctrl+U for underline
          event.preventDefault();
          const isUnderlineActive = Editor.marks(editor)?.underline;
          if (isUnderlineActive) {
            Editor.removeMark(editor, 'underline');
          } else {
            Editor.addMark(editor, 'underline', true);
          }
          break;
      }
    }
  }, [editor]);

  return (
    <div className="editor-container">
      <div className="editor-panel">
        <Slate 
          editor={editor} 
          initialValue={value} 
          onChange={handleChange}
        >
          <Toolbar />
          <div className="slate-editor">
            <Editable
              renderElement={renderElement}
              renderLeaf={renderLeaf}
              placeholder="Start writing your Statement of Work..."
              onSelectionChange={handleSelectionChange}
              onKeyDown={handleKeyDown}
              spellCheck
              autoFocus
            />
          </div>
        </Slate>
        {inlineControls.visible && <InlineControls />}
      </div>
      <ChatPanel />
    </div>
  );
};

// Element renderer for different node types
const Element = ({ attributes, children, element }) => {
  const style = { textAlign: element.align };
  
  switch (element.type) {
    case 'block-quote':
      return (
        <blockquote style={style} {...attributes}>
          {children}
        </blockquote>
      );
    case 'bulleted-list':
      return (
        <ul style={style} {...attributes}>
          {children}
        </ul>
      );
    case 'heading-one':
      return (
        <h1 style={style} {...attributes}>
          {children}
        </h1>
      );
    case 'heading-two':
      return (
        <h2 style={style} {...attributes}>
          {children}
        </h2>
      );
    case 'list-item':
      return (
        <li style={style} {...attributes}>
          {children}
        </li>
      );
    case 'numbered-list':
      return (
        <ol style={style} {...attributes}>
          {children}
        </ol>
      );
    default:
      return (
        <p style={style} {...attributes}>
          {children}
        </p>
      );
  }
};

// Leaf renderer for text formatting
const Leaf = ({ attributes, children, leaf }) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.code) {
    children = <code>{children}</code>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  return <span {...attributes}>{children}</span>;
};

export default SOWEditor;
import React from 'react';
import { useSlate } from 'slate-react';
import { Editor, Transforms, Element } from 'slate';
import { HistoryEditor } from 'slate-history';
import { 
  Bold, 
  Italic, 
  Underline, 
  Code, 
  Quote, 
  List, 
  ListOrdered,
  Heading1,
  Heading2,
  Undo,
  Redo,
  Save,
  Download
} from 'lucide-react';
import { useSOWStore } from '../stores/sowStore';

const Toolbar = () => {
  const editor = useSlate();
  const { exportDocument } = useSOWStore();

  // Check if undo/redo operations are available
  const canUndo = editor.history.undos.length > 0;
  const canRedo = editor.history.redos.length > 0;

  const isMarkActive = (format) => {
    const marks = Editor.marks(editor);
    return marks ? marks[format] === true : false;
  };

  const isBlockActive = (format) => {
    const { selection } = editor;
    if (!selection) return false;

    const [match] = Array.from(
      Editor.nodes(editor, {
        at: Editor.unhangRange(editor, selection),
        match: n => !Editor.isEditor(n) && Element.isElement(n) && n.type === format,
      })
    );

    return !!match;
  };

  const toggleMark = (format) => {
    const isActive = isMarkActive(format);
    if (isActive) {
      Editor.removeMark(editor, format);
    } else {
      Editor.addMark(editor, format, true);
    }
  };

  const toggleBlock = (format) => {
    const isActive = isBlockActive(format);
    const isList = ['numbered-list', 'bulleted-list'].includes(format);

    Transforms.unwrapNodes(editor, {
      match: n =>
        !Editor.isEditor(n) &&
        Element.isElement(n) &&
        ['numbered-list', 'bulleted-list'].includes(n.type),
      split: true,
    });

    let newProperties;
    if (isActive) {
      newProperties = {
        type: 'paragraph',
      };
    } else if (isList) {
      newProperties = {
        type: 'list-item',
      };
    } else {
      newProperties = {
        type: format,
      };
    }

    Transforms.setNodes(editor, newProperties);

    if (!isActive && isList) {
      const block = { type: format, children: [] };
      Transforms.wrapNodes(editor, block);
    }
  };

  const handleUndo = () => {
    HistoryEditor.undo(editor);
  };

  const handleRedo = () => {
    HistoryEditor.redo(editor);
  };

  const handleExport = (format) => {
    const exportData = exportDocument(format);
    console.log(`Exporting as ${format}:`, exportData);
    // Here you would implement actual export functionality
  };

  return (
    <div className="toolbar">
      {/* Text formatting */}
      <ToolbarButton
        active={isMarkActive('bold')}
        onMouseDown={() => toggleMark('bold')}
        icon={<Bold size={16} />}
        tooltip="Bold"
      />
      <ToolbarButton
        active={isMarkActive('italic')}
        onMouseDown={() => toggleMark('italic')}
        icon={<Italic size={16} />}
        tooltip="Italic"
      />
      <ToolbarButton
        active={isMarkActive('underline')}
        onMouseDown={() => toggleMark('underline')}
        icon={<Underline size={16} />}
        tooltip="Underline"
      />
      <ToolbarButton
        active={isMarkActive('code')}
        onMouseDown={() => toggleMark('code')}
        icon={<Code size={16} />}
        tooltip="Code"
      />

      <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 8px' }} />

      {/* Block formatting */}
      <ToolbarButton
        active={isBlockActive('heading-one')}
        onMouseDown={() => toggleBlock('heading-one')}
        icon={<Heading1 size={16} />}
        tooltip="Heading 1"
      />
      <ToolbarButton
        active={isBlockActive('heading-two')}
        onMouseDown={() => toggleBlock('heading-two')}
        icon={<Heading2 size={16} />}
        tooltip="Heading 2"
      />
      <ToolbarButton
        active={isBlockActive('block-quote')}
        onMouseDown={() => toggleBlock('block-quote')}
        icon={<Quote size={16} />}
        tooltip="Quote"
      />
      <ToolbarButton
        active={isBlockActive('numbered-list')}
        onMouseDown={() => toggleBlock('numbered-list')}
        icon={<ListOrdered size={16} />}
        tooltip="Numbered List"
      />
      <ToolbarButton
        active={isBlockActive('bulleted-list')}
        onMouseDown={() => toggleBlock('bulleted-list')}
        icon={<List size={16} />}
        tooltip="Bulleted List"
      />

      <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 8px' }} />

      {/* Undo/Redo */}
      <ToolbarButton
        disabled={!canUndo}
        onMouseDown={handleUndo}
        icon={<Undo size={16} />}
        tooltip="Undo (Ctrl+Z)"
      />
      <ToolbarButton
        disabled={!canRedo}
        onMouseDown={handleRedo}
        icon={<Redo size={16} />}
        tooltip="Redo (Ctrl+Y)"
      />

      <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 8px' }} />

      {/* Export options */}
      <ToolbarButton
        onMouseDown={() => handleExport('pdf')}
        icon={<Download size={16} />}
        tooltip="Export as PDF"
      />
      <ToolbarButton
        onMouseDown={() => handleExport('docx')}
        icon={<Save size={16} />}
        tooltip="Export as DOCX"
      />
    </div>
  );
};

const ToolbarButton = ({ active, disabled, onMouseDown, icon, tooltip }) => {
  return (
    <button
      className={`${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
      onMouseDown={(event) => {
        event.preventDefault();
        if (!disabled && onMouseDown) {
          onMouseDown();
        }
      }}
      title={tooltip}
      disabled={disabled}
      style={{
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
    >
      {icon}
    </button>
  );
};

export default Toolbar;
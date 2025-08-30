import React from 'react';
import SOWEditor from './components/SOWEditor';
import { EditorProvider } from './contexts/EditorContext';
import './index.css';

function App() {
  return (
    <div className="App">
      <EditorProvider>
        <SOWEditor />
      </EditorProvider>
    </div>
  );
}

export default App;
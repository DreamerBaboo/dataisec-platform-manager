import React from 'react';
import Editor from '@monaco-editor/react';

export const MonacoEditor = ({ 
  value, 
  onChange, 
  language = 'yaml', 
  height = '300px',
  options = {},
  ...props 
}) => {
  const defaultOptions = {
    minimap: { enabled: false },
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    readOnly: false,
    ...options
  };

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      onChange={onChange}
      options={defaultOptions}
      theme="vs-dark"
      {...props}
    />
  );
}; 
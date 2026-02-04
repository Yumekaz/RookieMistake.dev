'use client';

import Editor from '@monaco-editor/react';
import type { Language } from '@/lib/api';

interface CodeEditorProps {
  code: string;
  language: Language;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

const languageMap: Record<Language, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
};

export default function CodeEditor({
  code,
  language,
  onChange,
  readOnly = false,
}: CodeEditorProps) {
  return (
    <div className="h-full w-full border border-gray-700 rounded-lg overflow-hidden">
      <Editor
        height="100%"
        language={languageMap[language]}
        value={code}
        onChange={(value) => onChange(value || '')}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          readOnly,
          wordWrap: 'on',
          padding: { top: 16, bottom: 16 },
        }}
      />
    </div>
  );
}

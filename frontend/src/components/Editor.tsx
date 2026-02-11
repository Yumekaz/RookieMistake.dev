'use client';

import { useRef, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
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

const languageLabel: Record<Language, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
};

export default function CodeEditor({
  code,
  language,
  onChange,
  readOnly = false,
}: CodeEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
    
    // Ensure editor is properly focused and layout is calculated
    setTimeout(() => {
      editor.layout();
    }, 100);
  };

  // Re-layout when language changes
  useEffect(() => {
    if (editorRef.current) {
      setTimeout(() => {
        editorRef.current?.layout();
      }, 100);
    }
  }, [language]);

  return (
    <div className="h-full w-full flex flex-col card overflow-hidden">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gh-bg-secondary border-b border-gh-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          <div className="h-4 w-px bg-gh-border mx-2" />
          <span className="text-xs text-gh-text-muted font-medium">
            {languageLabel[language]}
          </span>
        </div>
        {readOnly && (
          <span className="text-[10px] font-semibold text-gh-text-muted uppercase tracking-wide px-2 py-1 bg-gh-bg-tertiary rounded">
            Read Only
          </span>
        )}
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 relative min-h-0">
        <Editor
          height="100%"
          language={languageMap[language]}
          value={code}
          onChange={(value) => onChange(value || '')}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: 'JetBrains Mono, Fira Code, Consolas, Monaco, monospace',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            readOnly,
            wordWrap: 'on',
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: 'line',
            lineHeight: 1.6,
            folding: true,
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            scrollbar: {
              useShadows: false,
              verticalHasArrows: false,
              horizontalHasArrows: false,
              vertical: 'visible',
              horizontal: 'visible',
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
            // Ensure editor captures keyboard events
            fixedOverflowWidgets: true,
            // Disable some features that might interfere
            overviewRulerLanes: 0,
            overviewRulerBorder: false,
          }}
        />
      </div>
    </div>
  );
}

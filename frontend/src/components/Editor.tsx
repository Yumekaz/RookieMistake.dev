'use client';

import { useCallback, useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { Language, Mistake, Severity } from '@/lib/api';

interface CodeEditorProps {
  code: string;
  language: Language;
  onChange: (value: string) => void;
  readOnly?: boolean;
  mistakes?: Mistake[];
  activeMistakeId?: number | null;
}

type Monaco = Parameters<OnMount>[1];
type StandaloneEditor = Parameters<OnMount>[0];

type MarkerDraft = {
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  severity: Severity;
  message: string;
  source: string;
};

type DecorationDraft = {
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  options: {
    isWholeLine: boolean;
    className: string;
    overviewRuler: {
      color: string;
      position: number;
    };
  };
};

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

const severityColors: Record<Severity, string> = {
  error: 'rgba(248, 81, 73, 0.38)',
  warning: 'rgba(210, 153, 34, 0.38)',
  info: 'rgba(47, 129, 247, 0.38)',
};

const severityClassNames: Record<Severity, string> = {
  error: 'finding-highlight finding-highlight-error',
  warning: 'finding-highlight finding-highlight-warning',
  info: 'finding-highlight finding-highlight-info',
};

const markerOwner = 'rookie-mistakes';

function normalizeRange(line: number, column: number) {
  const startLineNumber = Math.max(1, line || 1);
  const startColumn = Math.max(1, column || 1);

  return {
    startLineNumber,
    startColumn,
    endLineNumber: startLineNumber,
    endColumn: startColumn + 1,
  };
}

function severityToMarkerSeverity(monaco: Monaco, severity: Severity) {
  switch (severity) {
    case 'error':
      return monaco.MarkerSeverity.Error;
    case 'warning':
      return monaco.MarkerSeverity.Warning;
    case 'info':
      return monaco.MarkerSeverity.Info;
    default:
      return monaco.MarkerSeverity.Info;
  }
}

export function buildMarkerDrafts(mistakes: Mistake[]): MarkerDraft[] {
  return mistakes.map((mistake) => ({
    range: normalizeRange(mistake.line, mistake.column),
    severity: mistake.severity,
    message: mistake.message,
    source: mistake.name,
  }));
}

export function buildDecorationDrafts(
  mistakes: Mistake[],
  activeMistakeId: number | null | undefined
): DecorationDraft[] {
  return mistakes.map((mistake) => {
    const range = normalizeRange(mistake.line, mistake.column);
    const isActive = activeMistakeId === mistake.id;

    return {
      range,
      options: {
        isWholeLine: true,
        className: `${severityClassNames[mistake.severity]}${isActive ? ' finding-highlight-active' : ''}`,
        overviewRuler: {
          color: severityColors[mistake.severity],
          position: 7,
        },
      },
    };
  });
}

export default function CodeEditor({
  code,
  language,
  onChange,
  readOnly = false,
  mistakes = [],
  activeMistakeId = null,
}: CodeEditorProps) {
  const editorRef = useRef<StandaloneEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<{ set: (items: DecorationDraft[]) => void; clear: () => void } | null>(null);

  const syncAnnotations = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    if (!editor || !monaco) {
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }

    const markerDrafts = buildMarkerDrafts(mistakes).map((draft) => ({
      range: draft.range,
      severity: severityToMarkerSeverity(monaco, draft.severity),
      message: draft.message,
      source: draft.source,
    }));

    monaco.editor.setModelMarkers(model, markerOwner, markerDrafts);

    const decorationDrafts = buildDecorationDrafts(mistakes, activeMistakeId);
    if (!decorationsRef.current) {
      decorationsRef.current = editor.createDecorationsCollection(decorationDrafts);
    } else {
      decorationsRef.current.set(decorationDrafts);
    }

    const activeMistake = mistakes.find((mistake) => mistake.id === activeMistakeId);
    if (activeMistake) {
      const lineNumber = Math.max(1, activeMistake.line || 1);
      const column = Math.max(1, activeMistake.column || 1);
      editor.revealLineInCenter(lineNumber);
      editor.setPosition({ lineNumber, column });
      editor.focus();
    }
  }, [activeMistakeId, mistakes]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    syncAnnotations();

    setTimeout(() => {
      editor.layout();
    }, 100);
  };

  useEffect(() => {
    syncAnnotations();
  }, [language, syncAnnotations]);

  useEffect(() => {
    if (editorRef.current) {
      setTimeout(() => {
        editorRef.current?.layout();
      }, 100);
    }
  }, [language]);

  useEffect(
    () => () => {
      decorationsRef.current?.clear();
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      const model = editor?.getModel();
      if (model && monaco) {
        monaco.editor.setModelMarkers(model, markerOwner, []);
      }
    },
    []
  );

  return (
    <div className="h-full w-full flex flex-col card overflow-hidden">
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
            fontFamily: 'var(--font-mono), Fira Code, Consolas, Monaco, monospace',
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
            fixedOverflowWidgets: true,
            overviewRulerLanes: 3,
            overviewRulerBorder: false,
          }}
        />
      </div>
    </div>
  );
}

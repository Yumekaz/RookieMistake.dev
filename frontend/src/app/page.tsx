'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ResultsPanel from '@/components/ResultsPanel';
import { analyzeCode, saveSnippet, type Language, type AnalyzeResponse } from '@/lib/api';

// Dynamic import for Monaco editor (client-side only)
const CodeEditor = dynamic(() => import('@/components/Editor'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-900 rounded-lg flex items-center justify-center">
      <div className="text-gray-400">Loading editor...</div>
    </div>
  ),
});

const DEFAULT_CODE: Record<Language, string> = {
  javascript: `// Paste your JavaScript code here
async function fetchUser(id) {
  const response = fetch('/api/users/' + id);
  const data = response.json();
  return data;
}

function processItems(items) {
  for (var i = 0; i <= items.length; i++) {
    console.log(items[i]);
    if (items[i] == null) {
      continue;
    }
  }
}

try {
  riskyOperation();
} catch (e) {
  // TODO: handle error
}
`,
  typescript: `// Paste your TypeScript code here
async function fetchUser(id: string): Promise<User> {
  const response = fetch('/api/users/' + id);
  const data = response.json();
  return data;
}

function processItems(items: string[]) {
  for (let i = 0; i <= items.length; i++) {
    console.log(items[i]);
    if (items[i] == null) {
      continue;
    }
  }
}
`,
  python: `# Paste your Python code here
def process_items(items):
    for i in range(len(items) + 1):
        print(items[i])
        
    value = None
    result = value.strip()
    
def risky_operation():
    try:
        do_something()
    except Exception:
        pass
`,
};

export default function HomePage() {
  const [code, setCode] = useState(DEFAULT_CODE.javascript);
  const [language, setLanguage] = useState<Language>('javascript');
  const [results, setResults] = useState<AnalyzeResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const handleLanguageChange = useCallback((newLanguage: Language) => {
    setLanguage(newLanguage);
    setCode(DEFAULT_CODE[newLanguage]);
    setResults(null);
    setError(null);
    setShareUrl(null);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!code.trim()) {
      setError('Please enter some code to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setShareUrl(null);

    try {
      const response = await analyzeCode(code, language);
      setResults(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setResults(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, [code, language]);

  const handleSave = useCallback(async () => {
    if (!results) {
      setError('Please analyze the code first');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { id } = await saveSnippet(code, language, results);
      const url = `${window.location.origin}/s/${id}`;
      setShareUrl(url);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [code, language, results]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                🔍 RookieMistakes.dev
              </h1>
              <p className="text-sm text-gray-400">
                Detect common junior developer mistakes with AST analysis
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as Language)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
              </select>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !results}
                className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save & Share'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error/Success Messages */}
      {(error || shareUrl) && (
        <div className="max-w-7xl mx-auto px-4 py-2 w-full">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
          {shareUrl && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-2 rounded-lg text-sm flex items-center justify-between">
              <span>Saved! Link copied to clipboard.</span>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-green-300"
              >
                {shareUrl}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-4 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-180px)]">
          {/* Editor Panel */}
          <div className="flex flex-col min-h-0">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Code Editor
            </h2>
            <div className="flex-1 min-h-0">
              <CodeEditor
                code={code}
                language={language}
                onChange={setCode}
              />
            </div>
          </div>

          {/* Results Panel */}
          <div className="flex flex-col min-h-0">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Analysis Results
            </h2>
            <div className="flex-1 min-h-0 bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
              {results ? (
                <ResultsPanel
                  mistakes={results.mistakes}
                  score={results.score}
                  isLoading={isAnalyzing}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <p>Click &quot;Analyze&quot; to check your code for common mistakes</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-4 text-center text-sm text-gray-500">
        <p>RookieMistakes.dev — Open-source AST-based code analysis.</p>
      </footer>
    </div>
  );
}

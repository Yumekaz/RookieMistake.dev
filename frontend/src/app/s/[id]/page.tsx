'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import ResultsPanel from '@/components/ResultsPanel';
import { getSnippet, type SnippetResponse } from '@/lib/api';

// Dynamic import for Monaco editor (client-side only)
const CodeEditor = dynamic(() => import('@/components/Editor'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-900 rounded-lg flex items-center justify-center">
      <div className="text-gray-400">Loading editor...</div>
    </div>
  ),
});

export default function SnippetPage() {
  const params = useParams();
  const id = params.id as string;

  const [snippet, setSnippet] = useState<SnippetResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSnippet() {
      try {
        const data = await getSnippet(id);
        setSnippet(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load snippet');
      } finally {
        setIsLoading(false);
      }
    }

    loadSnippet();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-400">Loading snippet...</p>
        </div>
      </div>
    );
  }

  if (error || !snippet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-2">
            Snippet Not Found
          </h1>
          <p className="text-gray-400 mb-4">
            {error || 'This snippet does not exist or has been deleted.'}
          </p>
          <Link
            href="/"
            className="text-blue-400 hover:underline"
          >
            ← Back to editor
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="text-2xl font-bold text-white hover:text-blue-400 transition-colors">
                🔍 RookieMistakes.dev
              </Link>
              <p className="text-sm text-gray-400">
                Viewing saved snippet • {snippet.language} • {new Date(snippet.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                {snippet.language.charAt(0).toUpperCase() + snippet.language.slice(1)}
              </span>
              <Link
                href="/"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
              >
                New Analysis
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-4 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-180px)]">
          {/* Editor Panel */}
          <div className="flex flex-col min-h-0">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Code (Read Only)
            </h2>
            <div className="flex-1 min-h-0">
              <CodeEditor
                code={snippet.code}
                language={snippet.language}
                onChange={() => { }}
                readOnly
              />
            </div>
          </div>

          {/* Results Panel */}
          <div className="flex flex-col min-h-0">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Analysis Results
            </h2>
            <div className="flex-1 min-h-0 bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
              <ResultsPanel
                mistakes={snippet.results.mistakes}
                score={snippet.results.score}
              />
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

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
    <div className="h-full w-full bg-gh-bg-secondary rounded-xl flex items-center justify-center border border-gh-border">
      <div className="flex items-center gap-3 text-gh-text-muted">
        <div className="w-5 h-5 border-2 border-gh-border border-t-gh-accent rounded-full animate-spin" />
        <span className="text-sm">Loading editor...</span>
      </div>
    </div>
  ),
});

// Icons
const ArrowLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const CodeIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

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
      <div className="min-h-screen flex items-center justify-center bg-gh-bg">
        <div className="text-center">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="absolute inset-0 border-2 border-gh-border rounded-full" />
            <div className="absolute inset-0 border-2 border-gh-accent border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gh-text-muted text-sm">Loading snippet...</p>
        </div>
      </div>
    );
  }

  if (error || !snippet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gh-bg px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-gh-error/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gh-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gh-text mb-2">
            Snippet Not Found
          </h1>
          <p className="text-sm text-gh-text-muted mb-6">
            {error || 'This snippet does not exist or has been deleted.'}
          </p>
          <Link
            href="/"
            className="btn-primary inline-flex items-center gap-2"
          >
            <ArrowLeftIcon />
            <span>Back to editor</span>
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(snippet.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen flex flex-col bg-gh-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-gh-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Link 
                href="/" 
                className="text-xl sm:text-2xl font-bold hover:opacity-80 transition-opacity"
              >
                <span className="gradient-text">RookieMistakes.dev</span>
              </Link>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-gh-text-muted mt-1">
                <span className="flex items-center gap-1.5">
                  <DocumentIcon />
                  Saved snippet
                </span>
                <span className="text-gh-border">•</span>
                <span className="flex items-center gap-1.5">
                  <CodeIcon />
                  {snippet.language.charAt(0).toUpperCase() + snippet.language.slice(1)}
                </span>
                <span className="text-gh-border">•</span>
                <span className="flex items-center gap-1.5">
                  <CalendarIcon />
                  {formattedDate}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="px-3 py-2 bg-gh-bg-tertiary border border-gh-border rounded-lg text-sm text-gh-text font-medium">
                {snippet.language.charAt(0).toUpperCase() + snippet.language.slice(1)}
              </span>
              <Link
                href="/"
                className="btn-primary flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Analysis</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-4 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-140px)] min-h-[500px]">
          {/* Editor Panel */}
          <div className="flex flex-col min-h-0">
            <div className="panel-header mb-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span>Code</span>
              <span className="text-gh-text-muted font-normal normal-case">(Read Only)</span>
            </div>
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
            <div className="panel-header mb-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Analysis Results</span>
            </div>
            <div className="flex-1 min-h-0 card overflow-hidden">
              <ResultsPanel
                mistakes={snippet.results.mistakes}
                score={snippet.results.score}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gh-border py-4 bg-gh-bg-secondary/50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-gh-text-muted">
            Open-source AST-based code analysis • Built for junior developers
          </p>
        </div>
      </footer>
    </div>
  );
}

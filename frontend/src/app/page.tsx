'use client';

import Link from 'next/link';
import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ResultsPanel from '@/components/ResultsPanel';
import LanguageSelector from '@/components/LanguageSelector';
import {
  analyzeCode,
  getRecentSnippets,
  saveSnippet,
  submitFindingFeedback,
  type Mistake,
  type Language,
  type AnalyzeResponse,
  type SnippetSummary,
} from '@/lib/api';
import { sortMistakesByPriority } from '@/components/ResultsPanel';

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

// Icons
const PlayIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const MenuIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export default function HomePage() {
  const [code, setCode] = useState(DEFAULT_CODE.javascript);
  const [language, setLanguage] = useState<Language>('javascript');
  const [results, setResults] = useState<AnalyzeResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<{
    tone: 'success' | 'warning';
    message: string;
  } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedMistakeId, setSelectedMistakeId] = useState<number | null>(null);
  const [recentSnippets, setRecentSnippets] = useState<SnippetSummary[]>([]);

  useEffect(() => {
    async function loadRecentSnippets() {
      try {
        const response = await getRecentSnippets(4);
        setRecentSnippets(response.snippets);
      } catch {
        setRecentSnippets([]);
      }
    }

    loadRecentSnippets();
  }, [results, shareUrl]);

  const handleLanguageChange = useCallback((newLanguage: Language) => {
    setLanguage(newLanguage);
    setCode(DEFAULT_CODE[newLanguage]);
    setResults(null);
    setError(null);
    setShareUrl(null);
    setShareFeedback(null);
    setSelectedMistakeId(null);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!code.trim()) {
      setError('Please enter some code to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setShareUrl(null);
    setShareFeedback(null);

    try {
      const response = await analyzeCode(code, language);
      setResults(response);
      const firstMistake = response.mistakes.slice().sort(sortMistakesByPriority)[0];
      setSelectedMistakeId(firstMistake ? firstMistake.id : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setResults(null);
      setSelectedMistakeId(null);
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
    setShareFeedback(null);

    try {
      const { id } = await saveSnippet(code, language, results);
      const url = `${window.location.origin}/s/${id}`;
      setShareUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        setShareFeedback({
          tone: 'success',
          message: 'Link copied to clipboard!',
        });
      } catch {
        setShareFeedback({
          tone: 'warning',
          message: 'Snippet saved, but clipboard copy failed. Use the share link below.',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [code, language, results]);

  const handleFindingFeedback = useCallback(async (mistake: Mistake, verdict: 'good_catch' | 'false_positive') => {
    await submitFindingFeedback({
      verdict,
      finding: mistake,
      language,
      filePath: 'snippet',
    });
  }, [language]);

  // Create ripple effect on button click
  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gh-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-gh-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">
                <span className="gradient-text">RookieMistakes.dev</span>
              </h1>
              <p className="text-xs sm:text-sm text-gh-text-muted mt-0.5 hidden sm:block">
                AST-based code analysis for JavaScript, TypeScript & Python
              </p>
            </div>
            
            {/* Desktop Controls */}
            <div className="hidden md:flex items-center gap-3">
              <LanguageSelector
                value={language}
                onChange={handleLanguageChange}
              />
              
              <button
                onClick={(e) => {
                  createRipple(e);
                  handleAnalyze();
                }}
                disabled={isAnalyzing}
                className="btn-primary flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <PlayIcon />
                    <span>Analyze</span>
                  </>
                )}
              </button>
              
              <button
                onClick={(e) => {
                  createRipple(e);
                  handleSave();
                }}
                disabled={isSaving || !results}
                className="btn-secondary flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gh-text-muted border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <SaveIcon />
                    <span>Share</span>
                  </>
                )}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-gh-bg-tertiary border border-gh-border text-gh-text hover:bg-gh-bg-secondary transition-colors"
            >
              <MenuIcon />
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-gh-border animate-fade-in">
              <div className="flex flex-col gap-3">
                <LanguageSelector
                  value={language}
                  onChange={handleLanguageChange}
                />
                
                <div className="flex gap-3">
                  <button
                    onClick={(e) => {
                      createRipple(e);
                      handleAnalyze();
                      setIsMobileMenuOpen(false);
                    }}
                    disabled={isAnalyzing}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <PlayIcon />
                        <span>Analyze</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={(e) => {
                      createRipple(e);
                      handleSave();
                      setIsMobileMenuOpen(false);
                    }}
                    disabled={isSaving || !results}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gh-text-muted border-t-white rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <SaveIcon />
                        <span>Share</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Notifications */}
      {(error || (shareUrl && shareFeedback)) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 w-full animate-fade-in">
          {error && (
            <div className="flex items-center gap-3 bg-gh-error/10 border border-gh-error/30 text-gh-error px-4 py-3 rounded-lg">
              <AlertIcon />
              <span className="text-sm">{error}</span>
            </div>
          )}
          {shareUrl && shareFeedback && (
            <div
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-lg border ${
                shareFeedback.tone === 'success'
                  ? 'bg-gh-success/10 border-gh-success/30 text-gh-success'
                  : 'bg-gh-warning/10 border-gh-warning/30 text-gh-warning'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {shareFeedback.tone === 'success' ? <CheckIcon /> : <AlertIcon />}
                <span className="text-sm">{shareFeedback.message}</span>
              </div>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline hover:text-white transition-colors truncate"
              >
                {shareUrl}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-4 w-full overflow-hidden">
        <div className="card mb-4 p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted">Product surface</p>
            <h2 className="text-lg sm:text-xl font-semibold text-gh-text mt-1">
              The analyzer is now backed by history, compare, and trust pages instead of a single response panel.
            </h2>
            <p className="text-sm text-gh-text-muted mt-2 max-w-3xl">
              Run an analysis here, save it, then use history, compare, benchmark, detector catalog, and limitations to inspect what changed and why the result is trustworthy.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/history" className="btn-secondary inline-flex items-center gap-2">
              <span>History</span>
            </Link>
            <Link href="/project" className="btn-secondary inline-flex items-center gap-2">
              <span>Project mode</span>
            </Link>
            <Link href="/compare" className="btn-secondary inline-flex items-center gap-2">
              <span>Compare</span>
            </Link>
            <Link href="/benchmark" className="btn-secondary inline-flex items-center gap-2">
              <span>Benchmark</span>
            </Link>
            <Link href="/detectors" className="btn-secondary inline-flex items-center gap-2">
              <span>Detectors</span>
            </Link>
            <Link href="/limitations" className="btn-secondary inline-flex items-center gap-2">
              <span>Limitations</span>
            </Link>
          </div>
        </div>

        {recentSnippets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
            {recentSnippets.map((snippet, index) => (
              <Link
                key={snippet.id}
                href={index > 0 ? `/compare?baseId=${snippet.id}&targetId=${recentSnippets[index - 1].id}` : `/s/${snippet.id}`}
                className="card p-4 hover:border-gh-text-muted/60 transition-colors"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted">
                  {new Date(snippet.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
                <h3 className="text-sm font-semibold text-gh-text mt-2">
                  {snippet.language} score {snippet.score}/10
                </h3>
                <p className="text-xs text-gh-text-muted mt-2 line-clamp-2">
                  {snippet.codePreview || 'Saved run'}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {snippet.topMistakes.slice(0, 2).map((mistake) => (
                    <span key={mistake} className="px-2 py-1 rounded-md bg-gh-bg-secondary border border-gh-border text-[11px] text-gh-text-muted">
                      {mistake}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-140px)] min-h-[400px] sm:min-h-[500px]">
          {/* Editor Panel */}
          <div className="flex flex-col h-full overflow-hidden">
            <div className="panel-header mb-3 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span>Code Editor</span>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              <CodeEditor
                code={code}
                language={language}
                onChange={setCode}
                mistakes={results?.mistakes ?? []}
                activeMistakeId={selectedMistakeId}
              />
            </div>
          </div>

          {/* Results Panel */}
          <div className="flex flex-col h-full overflow-hidden">
            <div className="panel-header mb-3 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Analysis Results</span>
            </div>
            <div className="flex-1 card overflow-hidden">
              {results ? (
                <ResultsPanel
                  mistakes={results.mistakes}
                  score={results.score}
                  isLoading={isAnalyzing}
                  selectedMistakeId={selectedMistakeId}
                  onSelectMistake={(mistake) => setSelectedMistakeId(mistake.id)}
                  onFeedback={handleFindingFeedback}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 sm:p-8 empty-state">
                  <div className="empty-state-icon">
                    <svg className="w-8 h-8 text-gh-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gh-text mb-1">
                    Ready to analyze
                  </h3>
                  <p className="text-xs sm:text-sm text-gh-text-muted max-w-xs">
                    Paste your code and click <span className="text-gh-accent">Analyze</span> to detect common mistakes
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gh-border py-3 sm:py-4 bg-gh-bg-secondary/50">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="text-xs text-gh-text-muted">
            Open-source AST-based code analysis • Built for junior developers
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-gh-text-muted">
            <Link href="/history" className="hover:text-white transition-colors">History</Link>
            <Link href="/project" className="hover:text-white transition-colors">Project</Link>
            <Link href="/compare" className="hover:text-white transition-colors">Compare</Link>
            <Link href="/benchmark" className="hover:text-white transition-colors">Benchmark</Link>
            <Link href="/detectors" className="hover:text-white transition-colors">Detectors</Link>
            <Link href="/limitations" className="hover:text-white transition-colors">Limitations</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ResourceShell from '@/components/ResourceShell';
import { getRecentSnippets, type SnippetSummary } from '@/lib/api';

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function severityClasses(severity: SnippetSummary['topSeverity']) {
  if (severity === 'error') return 'text-gh-error border-gh-error/30 bg-gh-error/10';
  if (severity === 'warning') return 'text-gh-warning border-gh-warning/30 bg-gh-warning/10';
  if (severity === 'info') return 'text-gh-accent border-gh-accent/30 bg-gh-accent/10';
  return 'text-gh-text-muted border-gh-border bg-gh-bg-secondary';
}

export default function HistoryPage() {
  const [snippets, setSnippets] = useState<SnippetSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecentSnippets() {
      try {
        const response = await getRecentSnippets(18);
        setSnippets(response.snippets);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setIsLoading(false);
      }
    }

    loadRecentSnippets();
  }, []);

  return (
    <ResourceShell
      eyebrow="Recent analyses"
      title="Saved runs and quick compare"
      description="The app now keeps memory. Use recent saved analyses to reopen a result, compare it to the previous run, or inspect which detectors keep surfacing."
      actions={
        <Link href="/" className="btn-primary inline-flex items-center gap-2">
          <span>Run new analysis</span>
        </Link>
      }
    >
      {error ? (
        <div className="card p-5 border-gh-error/30 text-gh-error">{error}</div>
      ) : null}

      {isLoading ? (
        <div className="card p-8 text-center text-gh-text-muted">Loading recent analyses...</div>
      ) : null}

      {!isLoading && !error && snippets.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="text-xl font-semibold text-gh-text">No saved analyses yet</h2>
          <p className="text-gh-text-muted mt-2">
            Save a run from the main analyzer and it will show up here with compare actions.
          </p>
        </div>
      ) : null}

      {!isLoading && !error && snippets.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {snippets.map((snippet, index) => {
            const previous = snippets[index + 1];
            const compareHref = previous
              ? `/compare?baseId=${previous.id}&targetId=${snippet.id}`
              : `/compare?baseId=${snippet.id}`;

            return (
              <article key={snippet.id} className="card p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted">{formatTimestamp(snippet.created_at)}</p>
                    <h2 className="text-lg font-semibold text-gh-text mt-2">
                      {snippet.language} score {snippet.score}/10
                    </h2>
                    <p className="text-sm text-gh-text-muted mt-2">{snippet.codePreview || 'Saved code snippet'}</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${severityClasses(snippet.topSeverity)}`}>
                    {snippet.topSeverity === 'none' ? 'clean run' : `top ${snippet.topSeverity}`}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-gh-text-muted">
                  <span className="px-2.5 py-1 rounded-md bg-gh-bg-secondary border border-gh-border">
                    {snippet.mistakeCount} finding{snippet.mistakeCount !== 1 ? 's' : ''}
                  </span>
                  {snippet.topMistakes.slice(0, 3).map((mistake) => (
                    <span key={mistake} className="px-2.5 py-1 rounded-md bg-gh-bg-secondary border border-gh-border">
                      {mistake}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href={`/s/${snippet.id}`} className="btn-secondary inline-flex items-center gap-2">
                    <span>Open result</span>
                  </Link>
                  <Link href={compareHref} className="btn-primary inline-flex items-center gap-2">
                    <span>{previous ? 'Compare to previous run' : 'Start compare'}</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </ResourceShell>
  );
}

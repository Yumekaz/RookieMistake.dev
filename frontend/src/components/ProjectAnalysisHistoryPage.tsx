'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ResourceShell from '@/components/ResourceShell';
import {
  buildProjectAnalysisHref,
  buildProjectWorkspaceHref,
  getRecentProjectAnalyses,
  type ProjectAnalysisHistoryEntry,
} from '@/lib/api';

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ProjectAnalysisHistoryPage() {
  const [analyses, setAnalyses] = useState<ProjectAnalysisHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjectAnalyses() {
      try {
        const response = await getRecentProjectAnalyses(18);
        setAnalyses(response.analyses);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project history');
      } finally {
        setIsLoading(false);
      }
    }

    loadProjectAnalyses();
  }, []);

  return (
    <ResourceShell
      eyebrow="Project memory"
      title="Saved project runs"
      description="Every analyzed workspace is kept as a reusable result. Open a past run, reopen it in the workspace, or jump straight into the saved analysis page."
      actions={
        <Link href="/project" className="btn-primary inline-flex items-center gap-2">
          <span>Run new project analysis</span>
        </Link>
      }
    >
      {error ? <div className="card p-5 border-gh-error/30 text-gh-error">{error}</div> : null}

      {isLoading ? <div className="card p-8 text-center text-gh-text-muted">Loading saved project runs...</div> : null}

      {!isLoading && !error && analyses.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="text-xl font-semibold text-gh-text">No saved project analyses yet</h2>
          <p className="text-gh-text-muted mt-2">
            Run a project analysis and it will appear here with a shareable result page and reopen link.
          </p>
        </div>
      ) : null}

      {!isLoading && !error && analyses.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {analyses.map((analysis) => (
            <article key={analysis.id} className="card p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted">{formatTimestamp(analysis.createdAt)}</p>
                  <h2 className="text-lg font-semibold text-gh-text mt-2 truncate">{analysis.title}</h2>
                  <p className="text-sm text-gh-text-muted mt-2">
                    {analysis.fileCount} files - {analysis.findingCount} findings - {analysis.parseErrorCount} parse errors
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-semibold text-gh-text">{analysis.score}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted mt-1">project score</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gh-text-muted">
                <span className="px-2.5 py-1 rounded-md bg-gh-bg-secondary border border-gh-border">
                  {analysis.feedbackSummary.total} reviewed
                </span>
                <span className="px-2.5 py-1 rounded-md bg-gh-bg-secondary border border-gh-border">
                  {analysis.feedbackSummary.goodCatch} good catches
                </span>
                <span className="px-2.5 py-1 rounded-md bg-gh-bg-secondary border border-gh-border">
                  {analysis.feedbackSummary.falsePositive} false positives
                </span>
                <span className="px-2.5 py-1 rounded-md bg-gh-bg-secondary border border-gh-border">
                  {analysis.feedbackSummary.pending} pending
                </span>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-gh-text-muted">
                {analysis.filePaths.slice(0, 3).map((path) => (
                  <span key={path} className="px-2.5 py-1 rounded-md bg-gh-bg-secondary border border-gh-border">
                    {path}
                  </span>
                ))}
                {analysis.topFindings.slice(0, 3).map((finding) => (
                  <span key={finding} className="px-2.5 py-1 rounded-md bg-gh-bg-secondary border border-gh-border">
                    {finding}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href={buildProjectAnalysisHref(analysis.id)} className="btn-secondary inline-flex items-center gap-2">
                  <span>Open result</span>
                </Link>
                <Link href={buildProjectWorkspaceHref(analysis.id)} className="btn-primary inline-flex items-center gap-2">
                  <span>Reopen workspace</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </ResourceShell>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ResourceShell from '@/components/ResourceShell';
import {
  buildProjectAnalysisHref,
  buildProjectWorkspaceHref,
  compareProjectAnalyses,
  getRecentProjectAnalyses,
  type ProjectAnalysisHistoryEntry,
  type ProjectComparisonResponse,
} from '@/lib/api';

interface ProjectComparePageClientProps {
  initialBaseId: string;
  initialTargetId: string;
}

function formatProjectLabel(entry: ProjectAnalysisHistoryEntry) {
  const date = new Date(entry.updatedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${date} - ${entry.title} - score ${entry.score}/10`;
}

export default function ProjectComparePageClient({
  initialBaseId,
  initialTargetId,
}: ProjectComparePageClientProps) {
  const [analyses, setAnalyses] = useState<ProjectAnalysisHistoryEntry[]>([]);
  const [comparison, setComparison] = useState<ProjectComparisonResponse | null>(null);
  const [baseId, setBaseId] = useState(initialBaseId);
  const [targetId, setTargetId] = useState(initialTargetId);
  const [isLoading, setIsLoading] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalyses() {
      try {
        const response = await getRecentProjectAnalyses(18);
        setAnalyses(response.analyses);
        setBaseId((current) => current || response.analyses[1]?.analysisId || response.analyses[0]?.analysisId || '');
        setTargetId((current) => current || response.analyses[0]?.analysisId || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project runs');
      } finally {
        setIsLoading(false);
      }
    }

    loadAnalyses();
  }, []);

  useEffect(() => {
    async function loadComparison() {
      if (!baseId || !targetId || baseId === targetId) {
        setComparison(null);
        return;
      }

      setIsComparing(true);
      setError(null);

      try {
        const response = await compareProjectAnalyses(baseId, targetId);
        setComparison(response);
      } catch (err) {
        setComparison(null);
        setError(err instanceof Error ? err.message : 'Failed to compare project analyses');
      } finally {
        setIsComparing(false);
      }
    }

    loadComparison();
  }, [baseId, targetId]);

  const options = useMemo(
    () =>
      analyses.map((entry) => ({
        value: entry.analysisId,
        label: formatProjectLabel(entry),
      })),
    [analyses]
  );

  return (
    <ResourceShell
      eyebrow="Before / after"
      title="Compare project runs, not guesses"
      description="Pick two saved project analyses and measure whether the score, file coverage, and findings actually moved in the right direction."
      actions={
        <Link href="/project/history" className="btn-secondary inline-flex items-center gap-2">
          <span>Project history</span>
        </Link>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5 space-y-3">
          <label className="block text-sm font-medium text-gh-text">
            Baseline run
            <select
              className="language-select w-full mt-2"
              value={baseId}
              onChange={(event) => setBaseId(event.target.value)}
            >
              <option value="">Select a baseline</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="card p-5 space-y-3">
          <label className="block text-sm font-medium text-gh-text">
            Candidate run
            <select
              className="language-select w-full mt-2"
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
            >
              <option value="">Select a candidate</option>
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isLoading ? <div className="card p-8 text-center text-gh-text-muted">Loading project runs...</div> : null}
      {isComparing ? <div className="card p-8 text-center text-gh-text-muted">Comparing project runs...</div> : null}
      {error ? <div className="card p-5 border-gh-error/30 text-gh-error">{error}</div> : null}

      {!isLoading && !comparison && !error ? (
        <div className="card p-8 text-center text-gh-text-muted">
          Pick two different project runs to compare them.
        </div>
      ) : null}

      {comparison ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted">Score delta</p>
              <p className={`text-3xl font-semibold mt-3 ${comparison.summary.scoreDelta >= 0 ? 'text-green-400' : 'text-gh-error'}`}>
                {comparison.summary.scoreDelta >= 0 ? '+' : ''}
                {comparison.summary.scoreDelta}
              </p>
              <p className="text-sm text-gh-text-muted mt-2">
                {comparison.baseline.score}/10 to {comparison.candidate.score}/10
              </p>
            </div>

            <div className="card p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted">Finding delta</p>
              <p className={`text-3xl font-semibold mt-3 ${comparison.summary.findingDelta <= 0 ? 'text-green-400' : 'text-gh-error'}`}>
                {comparison.summary.findingDelta >= 0 ? '+' : ''}
                {comparison.summary.findingDelta}
              </p>
              <p className="text-sm text-gh-text-muted mt-2">
                {comparison.baseline.findingCount} to {comparison.candidate.findingCount} findings
              </p>
            </div>

            <div className="card p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted">File delta</p>
              <p className={`text-3xl font-semibold mt-3 ${comparison.summary.fileDelta >= 0 ? 'text-gh-text' : 'text-gh-warning'}`}>
                {comparison.summary.fileDelta >= 0 ? '+' : ''}
                {comparison.summary.fileDelta}
              </p>
              <p className="text-sm text-gh-text-muted mt-2">
                {comparison.baseline.fileCount} to {comparison.candidate.fileCount} files analyzed
              </p>
            </div>

            <div className="card p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted">Parse errors</p>
              <p className={`text-3xl font-semibold mt-3 ${comparison.summary.parseErrorDelta <= 0 ? 'text-green-400' : 'text-gh-error'}`}>
                {comparison.summary.parseErrorDelta >= 0 ? '+' : ''}
                {comparison.summary.parseErrorDelta}
              </p>
              <p className="text-sm text-gh-text-muted mt-2">
                {comparison.baseline.parseErrorCount} to {comparison.candidate.parseErrorCount} parse errors
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <section className="card p-5">
              <h2 className="text-lg font-semibold text-gh-text">Resolved</h2>
              <p className="text-sm text-gh-text-muted mt-2">Findings present in the baseline but gone in the candidate.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {comparison.summary.resolvedFindings.length > 0 ? comparison.summary.resolvedFindings.map((item) => (
                  <span key={item} className="px-2.5 py-1 rounded-md border border-green-500/25 bg-green-500/10 text-green-400 text-sm">
                    {item}
                  </span>
                )) : <span className="text-gh-text-muted text-sm">No resolved findings.</span>}
              </div>
            </section>

            <section className="card p-5">
              <h2 className="text-lg font-semibold text-gh-text">Persisted</h2>
              <p className="text-sm text-gh-text-muted mt-2">Findings still present after the latest changes.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {comparison.summary.persistedFindings.length > 0 ? comparison.summary.persistedFindings.map((item) => (
                  <span key={item} className="px-2.5 py-1 rounded-md border border-gh-border bg-gh-bg-secondary text-gh-text text-sm">
                    {item}
                  </span>
                )) : <span className="text-gh-text-muted text-sm">No persisted findings.</span>}
              </div>
            </section>

            <section className="card p-5">
              <h2 className="text-lg font-semibold text-gh-text">New regressions</h2>
              <p className="text-sm text-gh-text-muted mt-2">Findings introduced in the candidate run.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {comparison.summary.newFindings.length > 0 ? comparison.summary.newFindings.map((item) => (
                  <span key={item} className="px-2.5 py-1 rounded-md border border-gh-error/25 bg-gh-error/10 text-gh-error text-sm">
                    {item}
                  </span>
                )) : <span className="text-gh-text-muted text-sm">No new regressions.</span>}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[comparison.baseline, comparison.candidate].map((entry, index) => (
              <article key={entry.analysisId} className="card p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted">
                      {index === 0 ? 'Baseline' : 'Candidate'}
                    </p>
                    <h2 className="text-lg font-semibold text-gh-text mt-2 truncate">{entry.title}</h2>
                    <p className="text-sm text-gh-text-muted mt-2">
                      {entry.fileCount} files, {entry.findingCount} findings, score {entry.score}/10
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gh-text-muted">
                  {entry.filePaths.slice(0, 3).map((path) => (
                    <span key={path} className="px-2.5 py-1 rounded-md bg-gh-bg-secondary border border-gh-border">
                      {path}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={buildProjectAnalysisHref(entry.analysisId)} className="btn-secondary inline-flex items-center gap-2">
                    <span>Open result</span>
                  </Link>
                  <Link href={buildProjectWorkspaceHref(entry.analysisId)} className="btn-primary inline-flex items-center gap-2">
                    <span>Reopen workspace</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </ResourceShell>
  );
}

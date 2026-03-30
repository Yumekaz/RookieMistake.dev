'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ResourceShell from '@/components/ResourceShell';
import {
  compareSnippets,
  getRecentSnippets,
  type SnippetComparisonResponse,
  type SnippetSummary,
} from '@/lib/api';

interface ComparePageClientProps {
  initialBaseId: string;
  initialTargetId: string;
}

function formatSnippetLabel(snippet: SnippetSummary) {
  const date = new Date(snippet.created_at).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${date} • ${snippet.language} • score ${snippet.score}/10`;
}

export default function ComparePageClient({
  initialBaseId,
  initialTargetId,
}: ComparePageClientProps) {
  const [snippets, setSnippets] = useState<SnippetSummary[]>([]);
  const [comparison, setComparison] = useState<SnippetComparisonResponse | null>(null);
  const [baseId, setBaseId] = useState(initialBaseId);
  const [targetId, setTargetId] = useState(initialTargetId);
  const [isLoading, setIsLoading] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecentSnippets() {
      try {
        const response = await getRecentSnippets(18);
        setSnippets(response.snippets);

        setBaseId((current) => current || response.snippets[1]?.id || response.snippets[0]?.id || '');
        setTargetId((current) => current || response.snippets[0]?.id || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recent analyses');
      } finally {
        setIsLoading(false);
      }
    }

    loadRecentSnippets();
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
        const response = await compareSnippets(baseId, targetId);
        setComparison(response);
      } catch (err) {
        setComparison(null);
        setError(err instanceof Error ? err.message : 'Failed to compare analyses');
      } finally {
        setIsComparing(false);
      }
    }

    loadComparison();
  }, [baseId, targetId]);

  const options = useMemo(
    () =>
      snippets.map((snippet) => ({
        value: snippet.id,
        label: formatSnippetLabel(snippet),
      })),
    [snippets]
  );

  return (
    <ResourceShell
      eyebrow="Before / after"
      title="Compare saved analysis runs"
      description="Pick two saved runs and see whether the score improved, which detectors disappeared, and what new regressions showed up."
      actions={
        <Link href="/history" className="btn-secondary inline-flex items-center gap-2">
          <span>Open history</span>
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

      {isLoading ? <div className="card p-8 text-center text-gh-text-muted">Loading comparison candidates...</div> : null}
      {isComparing ? <div className="card p-8 text-center text-gh-text-muted">Comparing runs...</div> : null}
      {error ? <div className="card p-5 border-gh-error/30 text-gh-error">{error}</div> : null}

      {comparison ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <p className={`text-3xl font-semibold mt-3 ${comparison.summary.mistakeDelta <= 0 ? 'text-green-400' : 'text-gh-error'}`}>
                {comparison.summary.mistakeDelta >= 0 ? '+' : ''}
                {comparison.summary.mistakeDelta}
              </p>
              <p className="text-sm text-gh-text-muted mt-2">
                {comparison.baseline.mistakeCount} to {comparison.candidate.mistakeCount} findings
              </p>
            </div>

            <div className="card p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted">Runs</p>
              <div className="mt-3 space-y-2 text-sm text-gh-text-muted">
                <p>Baseline: {comparison.baseline.id}</p>
                <p>Candidate: {comparison.candidate.id}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <section className="card p-5">
              <h2 className="text-lg font-semibold text-gh-text">Resolved</h2>
              <p className="text-sm text-gh-text-muted mt-2">Detectors present in the baseline but gone in the candidate.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {comparison.summary.resolvedMistakes.length > 0 ? comparison.summary.resolvedMistakes.map((item) => (
                  <span key={item} className="px-2.5 py-1 rounded-md border border-green-500/25 bg-green-500/10 text-green-400 text-sm">
                    {item}
                  </span>
                )) : <span className="text-gh-text-muted text-sm">No resolved detectors.</span>}
              </div>
            </section>

            <section className="card p-5">
              <h2 className="text-lg font-semibold text-gh-text">Persisted</h2>
              <p className="text-sm text-gh-text-muted mt-2">Detectors still showing up after the changes.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {comparison.summary.persistedMistakes.length > 0 ? comparison.summary.persistedMistakes.map((item) => (
                  <span key={item} className="px-2.5 py-1 rounded-md border border-gh-border bg-gh-bg-secondary text-gh-text text-sm">
                    {item}
                  </span>
                )) : <span className="text-gh-text-muted text-sm">No persisted detectors.</span>}
              </div>
            </section>

            <section className="card p-5">
              <h2 className="text-lg font-semibold text-gh-text">New regressions</h2>
              <p className="text-sm text-gh-text-muted mt-2">Detectors introduced in the candidate run.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {comparison.summary.newMistakes.length > 0 ? comparison.summary.newMistakes.map((item) => (
                  <span key={item} className="px-2.5 py-1 rounded-md border border-gh-error/25 bg-gh-error/10 text-gh-error text-sm">
                    {item}
                  </span>
                )) : <span className="text-gh-text-muted text-sm">No new regressions.</span>}
              </div>
            </section>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={`/s/${comparison.baseline.id}`} className="btn-secondary inline-flex items-center gap-2">
              <span>Open baseline</span>
            </Link>
            <Link href={`/s/${comparison.candidate.id}`} className="btn-primary inline-flex items-center gap-2">
              <span>Open candidate</span>
            </Link>
          </div>
        </>
      ) : null}
    </ResourceShell>
  );
}

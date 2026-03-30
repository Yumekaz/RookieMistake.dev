'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ResourceShell from '@/components/ResourceShell';
import ResultsPanel, { sortMistakesByPriority } from '@/components/ResultsPanel';
import {
  buildProjectAnalysisHref,
  buildProjectWorkspaceHref,
  getProjectAnalysisRecord,
  submitFindingFeedback,
  summarizeProjectFeedback,
  updateProjectAnalysisFeedbackRecord,
  type Mistake,
  type ProjectAnalysisRecord,
} from '@/lib/api';

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

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toAnalysisView(record: ProjectAnalysisRecord) {
  return {
    analysisId: record.analysisId,
    profile: record.profile,
    source: record.source,
    summary: record.summary,
    files: record.files,
    findings: record.findings,
  };
}

export default function ProjectAnalysisResultPage() {
  const params = useParams();
  const id = params.id as string;

  const [record, setRecord] = useState<ProjectAnalysisRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedMistakeId, setSelectedMistakeId] = useState<number | null>(null);
  const [activeFilePath, setActiveFilePath] = useState<string>('');

  useEffect(() => {
    async function loadRecord() {
      try {
        const data = await getProjectAnalysisRecord(id);
        if (!data) {
          setError('This saved project analysis could not be found.');
          return;
        }

        setRecord(data);
        const rankedFiles = data.files
          .slice()
          .sort((left, right) => right.findingCount - left.findingCount || left.score - right.score);
        const topFile = rankedFiles[0];

        setActiveFilePath(topFile?.path ?? data.filesInput[0]?.path ?? data.files[0]?.path ?? '');
        setSelectedMistakeId(topFile?.findings.slice().sort(sortMistakesByPriority)[0]?.id ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project analysis');
      } finally {
        setIsLoading(false);
      }
    }

    loadRecord();
  }, [id]);

  const analysis = useMemo(() => (record ? toAnalysisView(record) : null), [record]);
  const activeFile = useMemo(
    () => record?.filesInput.find((file) => file.path === activeFilePath) ?? record?.filesInput[0] ?? null,
    [activeFilePath, record?.filesInput]
  );
  const activeAnalysis = useMemo(
    () => record?.files.find((file) => file.path === activeFile?.path) ?? null,
    [activeFile?.path, record?.files]
  );
  const activeMistakes = activeAnalysis?.findings ?? [];
  const feedbackSummary = useMemo(
    () =>
      record
        ? record.feedbackSummary ?? summarizeProjectFeedback(record.feedbackByFindingId ?? {}, record.findings.length)
        : summarizeProjectFeedback({}, 0),
    [record]
  );

  const handleFeedback = useCallback(
    async (mistake: Mistake, verdict: 'good_catch' | 'false_positive') => {
      if (!record || !activeFile) {
        return;
      }

      const findingId =
        record.findings.find(
          (entry) => entry.id === mistake.id && entry.line === mistake.line && entry.column === mistake.column
        )?.findingId ?? '';

      const response = await submitFindingFeedback({
        analysisId: record.analysisId,
        verdict,
        finding: mistake,
        language: activeFile.language,
        filePath: activeFile.path,
        profile: record.profile,
      });

      if (findingId) {
        const updatedRecord = updateProjectAnalysisFeedbackRecord(record.id, findingId, verdict);
        if (updatedRecord) {
          setRecord(updatedRecord);
        }
      }

      setStatus(
        response.verdict === 'good_catch'
          ? `Marked ${mistake.name} as a good catch.`
          : `Marked ${mistake.name} as a false positive.`
      );
    },
    [activeFile, record]
  );

  const handleCopyShareLink = useCallback(async () => {
    if (!record || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    setIsCopyingLink(true);
    try {
      const url = new URL(buildProjectAnalysisHref(record.id), window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      setStatus('Copied the project share link to your clipboard.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy project link');
    } finally {
      setIsCopyingLink(false);
    }
  }, [record]);

  if (isLoading) {
    return (
      <ResourceShell
        eyebrow="Project result"
        title="Loading saved project analysis"
        description="Fetching the persisted project result."
        actions={
          <Link href="/project/history" className="btn-secondary inline-flex items-center gap-2">
            <span>Project history</span>
          </Link>
        }
      >
        <div className="card p-8 text-center text-gh-text-muted">Loading saved project analysis...</div>
      </ResourceShell>
    );
  }

  if (error || !record) {
    return (
      <ResourceShell
        eyebrow="Project result"
        title="Saved project analysis not found"
        description="The saved result could not be loaded. Open history or run a fresh project analysis."
        actions={
          <Link href="/project" className="btn-primary inline-flex items-center gap-2">
            <span>Run project analysis</span>
          </Link>
        }
      >
        <div className="card p-6 space-y-4">
          <p className="text-sm text-gh-error">{error || 'This saved project analysis does not exist.'}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/project/history" className="btn-secondary inline-flex items-center gap-2">
              <span>Open history</span>
            </Link>
            <Link href="/project" className="btn-primary inline-flex items-center gap-2">
              <span>Run new analysis</span>
            </Link>
          </div>
        </div>
      </ResourceShell>
    );
  }

  return (
    <ResourceShell
      eyebrow="Project result"
      title={record.title}
      description="A persisted project analysis with saved feedback, reopen links, and the same detector view as the workspace."
      actions={
        <>
          <Link href="/project/history" className="btn-secondary inline-flex items-center gap-2">
            <span>Project history</span>
          </Link>
          <Link href={buildProjectWorkspaceHref(record.id)} className="btn-secondary inline-flex items-center gap-2">
            <span>Reopen workspace</span>
          </Link>
          <button
            type="button"
            onClick={handleCopyShareLink}
            disabled={isCopyingLink}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <span>{isCopyingLink ? 'Copying...' : 'Copy share link'}</span>
          </button>
          <Link href="/project" className="btn-primary inline-flex items-center gap-2">
            <span>Run new analysis</span>
          </Link>
        </>
      }
    >
      {status ? <div className="card p-4 text-sm text-gh-success">{status}</div> : null}

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4">
        <aside className="card p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gh-border bg-gh-bg-secondary/60 p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gh-text-muted">Project score</p>
              <p className="text-3xl font-semibold text-gh-text mt-2">{record.summary.score}</p>
            </div>
            <div className="rounded-xl border border-gh-border bg-gh-bg-secondary/60 p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gh-text-muted">Files</p>
              <p className="text-3xl font-semibold text-gh-text mt-2">{record.summary.fileCount}</p>
            </div>
            <div className="rounded-xl border border-gh-border bg-gh-bg-secondary/60 p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gh-text-muted">Findings</p>
              <p className="text-3xl font-semibold text-gh-text mt-2">{record.summary.findingCount}</p>
            </div>
            <div className="rounded-xl border border-gh-border bg-gh-bg-secondary/60 p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gh-text-muted">Parse errors</p>
              <p className="text-3xl font-semibold text-gh-text mt-2">{record.summary.parseErrorCount}</p>
            </div>
          </div>

          <div className="rounded-xl border border-gh-border bg-gh-bg-secondary/45 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-gh-border bg-gh-bg-tertiary/80 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-gh-text-muted">Reviewed</p>
                <p className="text-gh-text font-semibold mt-1">{feedbackSummary.total} reviewed</p>
              </div>
              <div className="rounded-lg border border-gh-border bg-gh-bg-tertiary/80 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-gh-text-muted">Good catches</p>
                <p className="text-gh-success font-semibold mt-1">{feedbackSummary.goodCatch} good catches</p>
              </div>
              <div className="rounded-lg border border-gh-border bg-gh-bg-tertiary/80 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-gh-text-muted">False positives</p>
                <p className="text-gh-warning font-semibold mt-1">
                  {feedbackSummary.falsePositive} false positives
                </p>
              </div>
              <div className="rounded-lg border border-gh-border bg-gh-bg-tertiary/80 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-gh-text-muted">Pending</p>
                <p className="text-gh-text font-semibold mt-1">{feedbackSummary.pending} pending</p>
              </div>
            </div>
            <p className="text-xs text-gh-text-muted">
              Feedback is persisted with the saved run, so this page stays in sync with history and the workspace reopen link.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted">Files</p>
              <span className="text-xs text-gh-text-muted">{formatTimestamp(record.createdAt)}</span>
            </div>
            <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
              {record.filesInput.map((file) => {
                const fileAnalysis = record.files.find((entry) => entry.path === file.path);
                const topFinding = fileAnalysis?.findings.slice().sort(sortMistakesByPriority)[0];
                const isActive = file.path === activeFile?.path;

                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => setActiveFilePath(file.path)}
                    className={`w-full text-left rounded-xl border p-3 transition-all ${
                      isActive
                        ? 'border-blue-400/50 bg-blue-500/5'
                        : 'border-gh-border bg-gh-bg-secondary/40 hover:border-gh-text-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gh-text truncate">{file.path}</p>
                        <p className="text-xs text-gh-text-muted mt-1 capitalize">{file.language}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-md border border-gh-border bg-gh-bg-tertiary text-gh-text-muted">
                        {fileAnalysis ? `${fileAnalysis.score}/10` : 'Draft'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-[11px] px-2 py-1 rounded-md border border-gh-border bg-gh-bg-tertiary text-gh-text-muted">
                        {fileAnalysis ? `${fileAnalysis.findingCount} findings` : 'Not analyzed'}
                      </span>
                      {fileAnalysis?.status === 'parse_error' ? (
                        <span className="text-[11px] px-2 py-1 rounded-md border border-gh-error/30 bg-gh-error/10 text-gh-error">
                          Parse error
                        </span>
                      ) : null}
                      {topFinding ? (
                        <span className="text-[11px] px-2 py-1 rounded-md border border-gh-border bg-gh-bg-tertiary text-gh-text-muted">
                          Top: {topFinding.name}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4 min-h-[720px]">
          <div className="flex flex-col h-full overflow-hidden">
            <div className="card p-4 space-y-4 flex-1 overflow-hidden">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted">Active file</p>
                  <div className="mt-2 rounded-lg border border-gh-border bg-gh-bg-secondary px-3 py-2 text-sm text-gh-text">
                    {activeFile?.path ?? 'No file selected'}
                  </div>
                </div>
                <div className="min-w-[180px]">
                  <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted mb-2">Language</p>
                  <div className="rounded-lg border border-gh-border bg-gh-bg-secondary px-3 py-2 text-sm text-gh-text capitalize">
                    {activeFile?.language ?? 'n/a'}
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-[520px]">
                {activeFile ? (
                  <CodeEditor
                    code={activeFile.code}
                    language={activeFile.language}
                    onChange={() => undefined}
                    readOnly
                    mistakes={activeMistakes}
                    activeMistakeId={selectedMistakeId}
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col h-full overflow-hidden">
            <div className="card p-4 flex-1 overflow-hidden">
              {analysis && activeAnalysis?.status === 'parse_error' ? (
                <div className="h-full flex flex-col justify-center p-6">
                  <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted">Parser</p>
                  <h3 className="text-lg font-semibold text-gh-text mt-2">This file did not parse</h3>
                  <p className="text-sm text-gh-text-muted mt-2">
                    {activeAnalysis.error || 'The parser could not build an AST for this file.'}
                  </p>
                </div>
              ) : analysis && activeAnalysis ? (
                <ResultsPanel
                  mistakes={activeAnalysis.findings}
                  score={activeAnalysis.score}
                  selectedMistakeId={selectedMistakeId}
                  onSelectMistake={(mistake) => {
                    setSelectedMistakeId(mistake.id);
                    setStatus(`Jumped to ${mistake.name} in ${activeFile?.path ?? 'the active file'}.`);
                  }}
                  onFeedback={handleFeedback}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 sm:p-8 empty-state">
                  <div className="empty-state-icon">
                    <svg className="w-8 h-8 text-gh-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gh-text mb-1">Saved results will appear here</h3>
                  <p className="text-xs sm:text-sm text-gh-text-muted max-w-xs">
                    Open a saved file to inspect findings, jump to lines, and leave feedback directly from the result page.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </ResourceShell>
  );
}

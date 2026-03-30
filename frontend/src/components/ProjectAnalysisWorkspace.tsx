'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ResourceShell from '@/components/ResourceShell';
import LanguageSelector from '@/components/LanguageSelector';
import ResultsPanel, { sortMistakesByPriority } from '@/components/ResultsPanel';
import {
  ANALYSIS_PROFILES,
  buildProjectAnalysisHref,
  buildProjectWorkspaceHref,
  analyzeProject,
  getRecentProjectAnalyses,
  getProjectAnalysisRecord,
  persistProjectAnalysisRecord,
  submitFindingFeedback,
  summarizeProjectFeedback,
  updateProjectAnalysisFeedbackRecord,
  type AnalysisProfile,
  type Language,
  type Mistake,
  type ProjectAnalysisHistoryEntry,
  type ProjectAnalysisRecord,
  type ProjectAnalysisResponse,
  type ProjectFileInput,
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

const STORAGE_KEY = 'rookie-mistakes.project-workspace';

function createId(prefix = 'file') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function createProjectFile(path: string, language: Language, code: string): ProjectFileInput {
  return {
    id: createId(),
    path,
    language,
    code,
  };
}

function createDefaultFiles(): ProjectFileInput[] {
  return [
    createProjectFile(
      'src/app.ts',
      'typescript',
      `export async function loadUser(id: string) {
  const response = fetch('/api/users/' + id);
  const user = response.json();

  if (user == null) {
    return null;
  }

  return user;
}
`
    ),
    createProjectFile(
      'src/service.ts',
      'typescript',
      `export function processItems(items: string[]) {
  for (let i = 0; i <= items.length; i++) {
    console.log(items[i]);
  }
}

try {
  riskyOperation();
} catch (error) {}
`
    ),
  ];
}

function getProfileMeta(profile: AnalysisProfile) {
  return ANALYSIS_PROFILES.find((option) => option.value === profile) ?? ANALYSIS_PROFILES[0];
}

function toAnalysisResponse(record: ProjectAnalysisRecord): ProjectAnalysisResponse {
  return {
    analysisId: record.analysisId,
    profile: record.profile,
    source: record.source,
    summary: record.summary,
    files: record.files,
    findings: record.findings,
  };
}

export default function ProjectAnalysisWorkspace() {
  const searchParams = useSearchParams();
  const sharedAnalysisId = searchParams.get('analysisId') ?? searchParams.get('projectId') ?? '';
  const [files, setFiles] = useState<ProjectFileInput[]>(createDefaultFiles);
  const [profile, setProfile] = useState<AnalysisProfile>('balanced');
  const [activeFileId, setActiveFileId] = useState<string>(files[0]?.id ?? '');
  const [analysis, setAnalysis] = useState<ProjectAnalysisResponse | null>(null);
  const [savedRecord, setSavedRecord] = useState<ProjectAnalysisRecord | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<ProjectAnalysisHistoryEntry[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingSharedAnalysis, setIsLoadingSharedAnalysis] = useState(false);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: 'success' | 'warning'; message: string } | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [selectedMistakeId, setSelectedMistakeId] = useState<number | null>(null);
  const activeFeedbackSummary = useMemo(
    () =>
      summarizeProjectFeedback(
        savedRecord?.feedbackByFindingId ?? {},
        analysis?.findings.length ?? savedRecord?.findings.length ?? 0
      ),
    [analysis?.findings.length, savedRecord?.feedbackByFindingId, savedRecord?.findings.length]
  );
  const savedProjectHref = savedRecord ? buildProjectAnalysisHref(savedRecord.analysisId) : '';
  const reopenWorkspaceHref = savedRecord ? buildProjectWorkspaceHref(savedRecord.analysisId) : '';
  const comparisonCandidate = useMemo(
    () => recentAnalyses.find((entry) => entry.analysisId !== savedRecord?.analysisId) ?? null,
    [recentAnalyses, savedRecord?.analysisId]
  );
  const compareProjectHref =
    savedRecord && comparisonCandidate
      ? `/project/compare?baseId=${comparisonCandidate.analysisId}&targetId=${savedRecord.analysisId}`
      : '/project/compare';

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setHasHydrated(true);
        return;
      }

      const parsed = JSON.parse(saved) as {
        files?: ProjectFileInput[];
        profile?: AnalysisProfile;
        activeFileId?: string;
      };

      if (Array.isArray(parsed.files) && parsed.files.length > 0) {
        setFiles(parsed.files);
        setActiveFileId(
          parsed.activeFileId && parsed.files.some((file) => file.id === parsed.activeFileId)
            ? parsed.activeFileId
            : parsed.files[0].id
        );
      }

      if (parsed.profile) {
        setProfile(parsed.profile);
      }
    } catch {
      // Ignore invalid local storage and keep the default workspace.
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    async function loadProjectHistory() {
      try {
        const response = await getRecentProjectAnalyses(6);
        setRecentAnalyses(response.analyses);
      } catch {
        setRecentAnalyses([]);
      }
    }

    loadProjectHistory();
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated || !sharedAnalysisId) {
      return;
    }

    let cancelled = false;

    async function loadSharedAnalysis() {
      setIsLoadingSharedAnalysis(true);
      try {
        const record = await getProjectAnalysisRecord(sharedAnalysisId);
        if (!record || cancelled) {
          return;
        }

        setFiles(record.filesInput);
        setProfile(record.profile);
        setActiveFileId(record.filesInput[0]?.id ?? '');
        setAnalysis(toAnalysisResponse(record));
        setSavedRecord(record);
        setStatus({
          tone: 'success',
          message: 'Loaded a saved project analysis. You can reopen, share, or continue editing from here.',
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load saved project analysis');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSharedAnalysis(false);
        }
      }
    }

    loadSharedAnalysis();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, sharedAnalysisId]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        files,
        profile,
        activeFileId,
      })
    );
  }, [activeFileId, files, hasHydrated, profile]);

  const activeFile = useMemo(
    () => files.find((file) => file.id === activeFileId) ?? files[0] ?? null,
    [activeFileId, files]
  );

  const activeAnalysis = useMemo(
    () => analysis?.files.find((file) => file.path === activeFile?.path) ?? null,
    [analysis, activeFile?.path]
  );

  const activeMistakes = activeAnalysis?.findings ?? [];
  const activeTopMistake = activeMistakes.slice().sort(sortMistakesByPriority)[0] ?? null;
  const profileMeta = getProfileMeta(profile);
  const summary =
    analysis?.summary ??
    savedRecord?.summary ?? {
      profile,
      score: 10,
      averageFileScore: 10,
      fileCount: files.length,
      filesWithFindings: 0,
      parseErrorCount: 0,
      findingCount: 0,
      severityCounts: {
        error: 0,
        warning: 0,
        info: 0,
      },
    };
  const feedbackSummaryLabel = savedRecord ? 'Saved analysis feedback' : 'Feedback summary';

  useEffect(() => {
    setSelectedMistakeId(activeTopMistake?.id ?? null);
  }, [activeTopMistake?.id]);

  const updateFile = useCallback((fileId: string, patch: Partial<ProjectFileInput>) => {
    setFiles((current) =>
      current.map((file) => (file.id === fileId ? { ...file, ...patch } : file))
    );
    setAnalysis(null);
    setStatus(null);
    setError(null);
  }, []);

  const refreshRecentAnalyses = useCallback(async () => {
    try {
      const response = await getRecentProjectAnalyses(6);
      setRecentAnalyses(response.analyses);
    } catch {
      setRecentAnalyses([]);
    }
  }, []);

  const handleAddFile = useCallback(() => {
    const nextFile = createProjectFile(
      `src/module-${files.length + 1}.ts`,
      'typescript',
      `export function helper() {
  return true;
}
`
    );

    setFiles((current) => [...current, nextFile]);
    setActiveFileId(nextFile.id);
    setAnalysis(null);
    setStatus({ tone: 'success', message: 'New file added to the workspace.' });
    setError(null);
  }, [files.length]);

  const handleRemoveFile = useCallback(
    (fileId: string) => {
      setFiles((current) => {
        if (current.length === 1) {
          return current;
        }

        const nextFiles = current.filter((file) => file.id !== fileId);
        if (activeFileId === fileId) {
          setActiveFileId(nextFiles[0]?.id ?? '');
        }

        return nextFiles;
      });

      setAnalysis(null);
      setStatus(null);
      setError(null);
    },
    [activeFileId]
  );

  const handleAnalyzeProject = useCallback(async () => {
    if (files.length === 0) {
      setError('Add at least one file before analyzing the project.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setStatus(null);

    try {
      const response = await analyzeProject({ files, profile });
      setAnalysis(response);
      const record = persistProjectAnalysisRecord(response, files);
      setSavedRecord(record);
      await refreshRecentAnalyses();

      const rankedFiles = response.files
        .slice()
        .sort((left, right) => right.findingCount - left.findingCount || left.score - right.score);
      const topFile = rankedFiles[0];
      const workspaceFile = files.find((file) => file.path === topFile?.path) ?? files[0] ?? null;
      const topMistake = topFile?.findings.slice().sort(sortMistakesByPriority)[0] ?? null;

      setActiveFileId(workspaceFile?.id ?? '');
      setSelectedMistakeId(topMistake?.id ?? null);
      setStatus({
        tone: 'success',
        message:
          response.source === 'backend'
            ? 'Project analyzed through the backend project route and saved locally.'
            : 'Project analyzed with the local frontend fallback and saved locally.',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Project analysis failed');
      setAnalysis(null);
      setSelectedMistakeId(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, [files, profile, refreshRecentAnalyses]);

  const handleFeedback = useCallback(
    async (mistake: Mistake, verdict: 'good_catch' | 'false_positive') => {
      if (!activeFile) {
        return;
      }

      const findingId =
        analysis?.findings.find(
          (entry) => entry.id === mistake.id && entry.line === mistake.line && entry.column === mistake.column
        )?.findingId ??
        savedRecord?.findings.find(
          (entry) => entry.id === mistake.id && entry.line === mistake.line && entry.column === mistake.column
        )?.findingId;

      const response = await submitFindingFeedback({
        analysisId: analysis?.analysisId,
        verdict,
        finding: mistake,
        language: activeFile.language,
        filePath: activeFile.path,
        profile,
      });

      if (savedRecord && findingId) {
        const updatedRecord = updateProjectAnalysisFeedbackRecord(savedRecord.id, findingId, verdict);
        if (updatedRecord) {
          setSavedRecord(updatedRecord);
          await refreshRecentAnalyses();
        }
      }

      setStatus({
        tone: 'success',
        message:
          response.verdict === 'good_catch'
            ? `Marked ${mistake.name} as a good catch.`
            : `Marked ${mistake.name} as a false positive.`,
      });
    },
    [activeFile, analysis, profile, refreshRecentAnalyses, savedRecord]
  );

  const handleCopyShareLink = useCallback(async () => {
    if (!savedRecord || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    setIsCopyingLink(true);

    try {
      const url = new URL(buildProjectAnalysisHref(savedRecord.analysisId), window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      setStatus({ tone: 'success', message: 'Copied the project share link to your clipboard.' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy project link');
    } finally {
      setIsCopyingLink(false);
    }
  }, [savedRecord]);

  return (
    <ResourceShell
      eyebrow="Project analysis"
      title="Analyze the whole workspace, not just one snippet"
      description="This view keeps multiple files, ruleset calibration, and inline feedback in one place so the analyzer feels closer to a daily workflow than a demo."
      actions={
        <>
          <Link href="/project/history" className="btn-secondary inline-flex items-center gap-2">
            <span>Project history</span>
          </Link>
          {savedRecord ? (
            <Link href={savedProjectHref} className="btn-secondary inline-flex items-center gap-2">
              <span>Open saved result</span>
            </Link>
          ) : null}
          {savedRecord ? (
            <Link href={reopenWorkspaceHref} className="btn-secondary inline-flex items-center gap-2">
              <span>Reopen saved run</span>
            </Link>
          ) : null}
          {savedRecord ? (
            <Link href={compareProjectHref} className="btn-secondary inline-flex items-center gap-2">
              <span>Compare run</span>
            </Link>
          ) : null}
          {savedRecord ? (
            <button
              type="button"
              onClick={handleCopyShareLink}
              disabled={isCopyingLink}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <span>{isCopyingLink ? 'Copying...' : 'Copy share link'}</span>
            </button>
          ) : null}
          <Link href="/" className="btn-secondary inline-flex items-center gap-2">
            <span>Single file</span>
          </Link>
          <button
            onClick={handleAnalyzeProject}
            disabled={isAnalyzing || isLoadingSharedAnalysis}
            className="btn-primary inline-flex items-center gap-2"
          >
            <span>{isAnalyzing || isLoadingSharedAnalysis ? 'Analyzing...' : 'Analyze project'}</span>
          </button>
        </>
      }
    >
      {(error || status) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 card p-4">
          <div
            className={`text-sm ${
              error
                ? 'text-gh-error'
                : status?.tone === 'success'
                  ? 'text-gh-success'
                  : 'text-gh-warning'
            }`}
          >
            {error || status?.message}
          </div>
          <button
            type="button"
            onClick={() => {
              setStatus(null);
              setError(null);
            }}
            className="text-xs text-gh-text-muted hover:text-white transition-colors self-start sm:self-auto"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4">
        <aside className="card p-4 space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted">Ruleset</p>
            <select
              className="language-select w-full"
              value={profile}
              onChange={(event) => {
                setProfile(event.target.value as AnalysisProfile);
                setAnalysis(null);
                setStatus(null);
              }}
            >
              {ANALYSIS_PROFILES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gh-text-muted">{profileMeta.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gh-border bg-gh-bg-secondary/60 p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gh-text-muted">Project score</p>
              <p className="text-3xl font-semibold text-gh-text mt-2">{summary.score}</p>
            </div>
            <div className="rounded-xl border border-gh-border bg-gh-bg-secondary/60 p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gh-text-muted">Files</p>
              <p className="text-3xl font-semibold text-gh-text mt-2">{summary.fileCount}</p>
            </div>
            <div className="rounded-xl border border-gh-border bg-gh-bg-secondary/60 p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gh-text-muted">Findings</p>
              <p className="text-3xl font-semibold text-gh-text mt-2">{summary.findingCount}</p>
            </div>
            <div className="rounded-xl border border-gh-border bg-gh-bg-secondary/60 p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-gh-text-muted">Parse errors</p>
              <p className="text-3xl font-semibold text-gh-text mt-2">{summary.parseErrorCount}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-gh-text-muted">
            <span className="px-2.5 py-1 rounded-md bg-gh-bg-secondary border border-gh-border">
              {summary.severityCounts.error} errors
            </span>
            <span className="px-2.5 py-1 rounded-md bg-gh-bg-secondary border border-gh-border">
              {summary.severityCounts.warning} warnings
            </span>
            <span className="px-2.5 py-1 rounded-md bg-gh-bg-secondary border border-gh-border">
              {summary.severityCounts.info} notes
            </span>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-gh-border bg-gh-bg-secondary/45 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gh-text-muted">{feedbackSummaryLabel}</p>
                {savedRecord ? (
                  <Link href={savedProjectHref} className="text-xs text-gh-text-muted hover:text-white transition-colors">
                    Open result
                  </Link>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-gh-border bg-gh-bg-tertiary/80 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-gh-text-muted">Reviewed</p>
                  <p className="text-gh-text font-semibold mt-1">{activeFeedbackSummary.total} reviewed</p>
                </div>
                <div className="rounded-lg border border-gh-border bg-gh-bg-tertiary/80 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-gh-text-muted">Good catches</p>
                  <p className="text-gh-success font-semibold mt-1">{activeFeedbackSummary.goodCatch} good catches</p>
                </div>
                <div className="rounded-lg border border-gh-border bg-gh-bg-tertiary/80 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-gh-text-muted">False positives</p>
                  <p className="text-gh-warning font-semibold mt-1">
                    {activeFeedbackSummary.falsePositive} false positives
                  </p>
                </div>
                <div className="rounded-lg border border-gh-border bg-gh-bg-tertiary/80 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-gh-text-muted">Pending</p>
                  <p className="text-gh-text font-semibold mt-1">{activeFeedbackSummary.pending} pending</p>
                </div>
              </div>
              <p className="text-xs text-gh-text-muted">
                Feedback is stored with the saved project run so the result page and history stay in sync.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gh-text-muted">Recent project runs</p>
                <Link href="/project/history" className="text-xs text-gh-text-muted hover:text-white transition-colors">
                  Open history
                </Link>
              </div>

              {recentAnalyses.length > 0 ? (
                recentAnalyses.slice(0, 3).map((entry) => (
                  <article key={entry.id} className="rounded-xl border border-gh-border bg-gh-bg-secondary/45 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gh-text truncate">{entry.title}</p>
                        <p className="text-xs text-gh-text-muted mt-1">
                          {entry.fileCount} files - {entry.findingCount} findings - score {entry.score}/10
                        </p>
                      </div>
                      <span className="text-[11px] px-2 py-1 rounded-md border border-gh-border bg-gh-bg-tertiary text-gh-text-muted">
                        {entry.feedbackSummary.total} reviewed
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-gh-text-muted">
                      {entry.filePaths.slice(0, 2).map((path) => (
                        <span key={path} className="px-2 py-1 rounded-md border border-gh-border bg-gh-bg-tertiary">
                          {path}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={buildProjectAnalysisHref(entry.id)} className="btn-secondary inline-flex items-center gap-2 px-3 py-1.5 text-xs">
                        <span>Open result</span>
                      </Link>
                      <Link href={buildProjectWorkspaceHref(entry.id)} className="btn-primary inline-flex items-center gap-2 px-3 py-1.5 text-xs">
                        <span>Reopen</span>
                      </Link>
                      <Link href={`/project/compare?baseId=${entry.analysisId}`} className="btn-secondary inline-flex items-center gap-2 px-3 py-1.5 text-xs">
                        <span>Compare</span>
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-gh-border bg-gh-bg-secondary/35 p-4 text-sm text-gh-text-muted">
                  Save a run and it will appear here for quick reopen and sharing.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted">Files</p>
              <button
                type="button"
                onClick={handleAddFile}
                className="text-xs px-3 py-1.5 rounded-lg border border-gh-border bg-gh-bg-secondary text-gh-text-muted hover:text-white hover:border-gh-text-muted transition-colors"
              >
                Add file
              </button>
            </div>

            <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
              {files.map((file) => {
                const fileAnalysis = analysis?.files.find((entry) => entry.path === file.path);
                const topFinding = fileAnalysis?.findings.slice().sort(sortMistakesByPriority)[0];
                const isActive = file.id === activeFile?.id;

                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => setActiveFileId(file.id)}
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

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleRemoveFile(activeFileId)}
              className="btn-secondary inline-flex items-center gap-2"
              disabled={files.length === 1}
            >
              Remove active file
            </button>
          </div>
        </aside>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4 min-h-[720px]">
          <div className="flex flex-col h-full overflow-hidden">
            <div className="card p-4 space-y-4 flex-1 overflow-hidden">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted">Active file</p>
                  <input
                    value={activeFile?.path ?? ''}
                    onChange={(event) =>
                      activeFile && updateFile(activeFile.id, { path: event.target.value })
                    }
                    className="mt-2 w-full bg-gh-bg-secondary border border-gh-border rounded-lg px-3 py-2 text-sm text-gh-text focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                  />
                </div>
                <div className="min-w-[180px]">
                  <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted mb-2">Language</p>
                  {activeFile ? (
                    <LanguageSelector
                      value={activeFile.language}
                      onChange={(language) => updateFile(activeFile.id, { language })}
                    />
                  ) : null}
                </div>
              </div>

              <div className="flex-1 min-h-[520px]">
                {activeFile ? (
                  <CodeEditor
                    code={activeFile.code}
                    language={activeFile.language}
                    onChange={(code) => updateFile(activeFile.id, { code })}
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
                    setStatus({
                      tone: 'success',
                      message: `Jumped to ${mistake.name} in ${activeFile?.path ?? 'the active file'}.`,
                    });
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
                  <h3 className="text-base sm:text-lg font-semibold text-gh-text mb-1">
                    Project results will land here
                  </h3>
                  <p className="text-xs sm:text-sm text-gh-text-muted max-w-xs">
                    Edit any file, pick a ruleset, and run the analysis to see grouped findings, jump-to-line navigation, and feedback controls.
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

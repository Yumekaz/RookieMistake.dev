export type Language = 'javascript' | 'typescript' | 'python';

export type Severity = 'error' | 'warning' | 'info';

export type Certainty = 'definite' | 'possible' | 'heuristic';

export type Scope = 'local' | 'function' | 'module';

export type AnalysisProfile = 'balanced' | 'focused' | 'strict';

export type FindingFeedbackKind = 'good_catch' | 'false_positive';

export interface Mistake {
  id: number;
  name: string;
  line: number;
  column: number;
  severity: Severity;
  certainty: Certainty;
  confidence: number;
  scope: Scope;
  message: string;
  ast_facts: Record<string, unknown>;
  explanation: string;
  fix: string;
  codeExample?: string;
}

export interface AnalyzeResponse {
  mistakes: Mistake[];
  score: number;
}

export interface ProjectFileInput {
  id: string;
  path: string;
  language: Language;
  code: string;
}

export interface ProjectFinding extends Mistake {
  findingId: string;
  filePath: string;
  language: Language;
}

export interface ProjectFileAnalysis {
  path: string;
  language: Language;
  lineCount: number;
  score: number;
  findingCount: number;
  findings: ProjectFinding[];
  status: 'ok' | 'parse_error';
  error?: string;
}

export interface ProjectAnalysisSummary {
  profile: AnalysisProfile;
  score: number;
  averageFileScore: number;
  fileCount: number;
  filesWithFindings: number;
  parseErrorCount: number;
  findingCount: number;
  severityCounts: Record<Severity, number>;
}

export interface ProjectAnalysisRequest {
  files: ProjectFileInput[];
  profile: AnalysisProfile;
}

export interface ProjectAnalysisResponse {
  analysisId: string;
  profile: AnalysisProfile;
  source: 'backend' | 'local';
  summary: ProjectAnalysisSummary;
  files: ProjectFileAnalysis[];
  findings: ProjectFinding[];
}

export interface FindingFeedbackRequest {
  verdict: FindingFeedbackKind;
  finding: Mistake;
  language: Language;
  analysisId?: string;
  filePath?: string;
  profile?: AnalysisProfile;
  note?: string;
}

export interface FindingFeedbackResponse {
  accepted: boolean;
  source: 'backend' | 'local';
  verdict: FindingFeedbackKind;
  recordedAt: string;
  id?: string;
  analysisId?: string;
  findingId?: string;
  note?: string;
}

export interface SaveResponse {
  id: string;
}

export interface ApiErrorPayload {
  error?: string;
  message?: string;
  details?: unknown;
  requestId?: string;
  statusCode?: number;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  requestId?: string;

  constructor(message: string, status: number, details?: unknown, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

export interface SnippetResponse {
  id: string;
  code: string;
  language: Language;
  results: AnalyzeResponse;
  created_at: string;
}

export interface SnippetSummary {
  id: string;
  language: Language;
  score: number;
  mistakeCount: number;
  created_at: string;
  codePreview: string;
  topSeverity: Severity | 'none';
  detectorNames: string[];
  topMistakes: string[];
}

export interface RecentSnippetsResponse {
  snippets: SnippetSummary[];
  total: number;
}

export interface ProjectFeedbackSummary {
  total: number;
  goodCatch: number;
  falsePositive: number;
  pending: number;
}

export interface ProjectAnalysisRecord extends ProjectAnalysisResponse {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  filesInput: ProjectFileInput[];
  feedbackByFindingId: Record<string, FindingFeedbackKind>;
  feedbackSummary: ProjectFeedbackSummary;
}

export interface ProjectAnalysisHistoryEntry {
  id: string;
  analysisId: string;
  title: string;
  profile: AnalysisProfile;
  source: 'backend' | 'local';
  score: number;
  averageFileScore: number;
  fileCount: number;
  filesWithFindings: number;
  findingCount: number;
  parseErrorCount: number;
  topSeverity: Severity | 'none';
  feedbackSummary: ProjectFeedbackSummary;
  createdAt: string;
  updatedAt: string;
  filePaths: string[];
  topFindings: string[];
}

export interface ProjectAnalysisHistoryResponse {
  analyses: ProjectAnalysisHistoryEntry[];
  total: number;
  source: 'backend' | 'local';
}

export interface ProjectComparisonSummary {
  scoreDelta: number;
  findingDelta: number;
  fileDelta: number;
  parseErrorDelta: number;
  persistedFindings: string[];
  newFindings: string[];
  resolvedFindings: string[];
}

export interface ProjectComparisonResponse {
  baseline: ProjectAnalysisHistoryEntry;
  candidate: ProjectAnalysisHistoryEntry;
  summary: ProjectComparisonSummary;
  source: 'backend' | 'local';
}

export interface ProjectFeedbackRecord {
  id: string;
  analysisId: string;
  findingId: string;
  status: FindingFeedbackKind;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFeedbackSummaryDetail {
  analysisId: string;
  totalFindings: number;
  reviewedFindings: number;
  unreviewedFindings: number;
  goodCatchCount: number;
  falsePositiveCount: number;
  latestFeedback: ProjectFeedbackRecord | null;
  feedback: ProjectFeedbackRecord[];
}

export interface ProjectFeedbackSummaryResponse {
  analysisId: string;
  summary: ProjectFeedbackSummaryDetail;
  source: 'backend' | 'local';
}

export interface SnippetComparisonSummary {
  scoreDelta: number;
  mistakeDelta: number;
  persistedMistakes: string[];
  newMistakes: string[];
  resolvedMistakes: string[];
}

export interface SnippetComparisonResponse {
  baseline: SnippetSummary;
  candidate: SnippetSummary;
  summary: SnippetComparisonSummary;
}

type ProjectAnalysisPayload = Omit<ProjectAnalysisResponse, 'source'>;

type ProjectAnalysisRecordPayload = ProjectAnalysisPayload & {
  request: {
    profile: AnalysisProfile;
    files: Array<{
      path: string;
      language: Language;
      code: string;
    }>;
  };
  created_at: string;
};

type ProjectAnalysisSummaryCardPayload = {
  id: string;
  profile: AnalysisProfile;
  score: number;
  averageFileScore: number;
  fileCount: number;
  filesWithFindings: number;
  parseErrorCount: number;
  findingCount: number;
  created_at: string;
  topSeverity: Severity | 'none';
  topFiles: string[];
  topFindings: string[];
};

type ProjectComparisonPayload = {
  baseline: ProjectAnalysisSummaryCardPayload;
  candidate: ProjectAnalysisSummaryCardPayload;
  summary: ProjectComparisonSummary;
};

type FindingFeedbackPayload = {
  id: string;
  analysisId: string;
  findingId: string;
  status: FindingFeedbackKind;
  note?: string;
  created_at: string;
  updated_at: string;
};

type ProjectFeedbackSummaryPayload = {
  analysisId: string;
  summary: {
    analysisId: string;
    totalFindings: number;
    reviewedFindings: number;
    unreviewedFindings: number;
    goodCatchCount: number;
    falsePositiveCount: number;
    latestFeedback: FindingFeedbackPayload | null;
    feedback: FindingFeedbackPayload[];
  };
};

const PROJECT_ANALYSIS_STORAGE_KEY = 'rookie-mistakes.project-analyses';

export const ANALYSIS_PROFILES: Array<{
  value: AnalysisProfile;
  label: string;
  description: string;
}> = [
  {
    value: 'balanced',
    label: 'Balanced',
    description: 'Default weighting that keeps obvious bugs high while staying readable.',
  },
  {
    value: 'focused',
    label: 'Focused',
    description: 'Filters lower-signal notes so the result stays sharp and less noisy.',
  },
  {
    value: 'strict',
    label: 'Strict',
    description: 'Penalizes findings harder and pushes riskier code lower on the score.',
  },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

async function parseError(response: Response, fallback: string): Promise<ApiError> {
  const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
  const message = payload.message || payload.error || fallback;
  return new ApiError(message, response.status, payload.details, payload.requestId);
}

async function fetchJson<T>(input: string, init?: RequestInit, fallbackError: string = 'Request failed'): Promise<T> {
  const response = init ? await fetch(input, init) : await fetch(input);

  if (!response.ok) {
    throw await parseError(response, fallbackError);
  }

  return response.json() as Promise<T>;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(10, Number(score.toFixed(1))));
}

function getProfileMultiplier(profile: AnalysisProfile) {
  switch (profile) {
    case 'focused':
      return 0.9;
    case 'strict':
      return 1.15;
    default:
      return 1;
  }
}

function shouldIncludeFinding(profile: AnalysisProfile, mistake: Mistake) {
  if (profile !== 'focused') {
    return true;
  }

  return mistake.severity !== 'info' || mistake.confidence >= 0.75 || mistake.certainty === 'definite';
}

function getFindingPenalty(mistake: Mistake) {
  const severityWeight = {
    error: 2.5,
    warning: 1.35,
    info: 0.6,
  }[mistake.severity];

  const certaintyWeight = {
    definite: 1,
    possible: 0.84,
    heuristic: 0.68,
  }[mistake.certainty];

  const confidenceWeight = 0.75 + mistake.confidence * 0.5;

  return severityWeight * certaintyWeight * confidenceWeight;
}

function scoreFindings(findings: Mistake[], lineCount: number, profile: AnalysisProfile) {
  const weightedPenalty = findings.reduce((total, mistake) => total + getFindingPenalty(mistake), 0);
  const densityPenalty = weightedPenalty / Math.max(1, Math.sqrt(lineCount));
  return clampScore(10 - densityPenalty * getProfileMultiplier(profile));
}

function countLines(code: string) {
  return code.split(/\r?\n/).length;
}

function toProjectFinding(file: ProjectFileInput, mistake: Mistake, index: number): ProjectFinding {
  return {
    ...mistake,
    findingId: `${file.path}:${mistake.name}:${mistake.line}:${mistake.column}:${index + 1}`,
    filePath: file.path,
    language: file.language,
  };
}

function computeProjectScore(files: ProjectFileAnalysis[]) {
  if (files.length === 0) {
    return 10;
  }

  const totalWeight = files.reduce((sum, file) => sum + Math.max(1, Math.log2(file.lineCount + 1)), 0);
  const weightedScore = files.reduce(
    (sum, file) => sum + file.score * Math.max(1, Math.log2(file.lineCount + 1)),
    0
  );

  return clampScore(totalWeight > 0 ? weightedScore / totalWeight : 10);
}

function summarizeProjectFiles(files: ProjectFileAnalysis[], profile: AnalysisProfile): ProjectAnalysisSummary {
  const severityCounts: Record<Severity, number> = {
    error: 0,
    warning: 0,
    info: 0,
  };

  let findingCount = 0;

  files.forEach((file) => {
    file.findings.forEach((finding) => {
      findingCount += 1;
      severityCounts[finding.severity] += 1;
    });
  });

  const averageFileScore = files.length
    ? clampScore(files.reduce((sum, file) => sum + file.score, 0) / files.length)
    : 10;

  return {
    profile,
    score: computeProjectScore(files),
    averageFileScore,
    fileCount: files.length,
    filesWithFindings: files.filter((file) => file.findingCount > 0).length,
    parseErrorCount: files.filter((file) => file.status === 'parse_error').length,
    findingCount,
    severityCounts,
  };
}

export function summarizeProjectFeedback(
  feedbackByFindingId: Record<string, FindingFeedbackKind>,
  findingCount: number
): ProjectFeedbackSummary {
  const summary: ProjectFeedbackSummary = {
    total: 0,
    goodCatch: 0,
    falsePositive: 0,
    pending: Math.max(0, findingCount),
  };

  Object.values(feedbackByFindingId).forEach((verdict) => {
    summary.total += 1;
    if (verdict === 'good_catch') {
      summary.goodCatch += 1;
    } else if (verdict === 'false_positive') {
      summary.falsePositive += 1;
    }
  });

  summary.pending = Math.max(0, findingCount - summary.total);

  return summary;
}

function createProjectAnalysisTitle(files: ProjectFileInput[], profile: AnalysisProfile) {
  const primaryFile = files[0]?.path || 'project';
  const extraCount = Math.max(0, files.length - 1);
  const label = extraCount > 0 ? `${primaryFile} + ${extraCount} more` : primaryFile;
  return `${label} - ${profile}`;
}

function createProjectAnalysisRecord(
  response: ProjectAnalysisResponse,
  filesInput: ProjectFileInput[],
  overrides: Partial<Pick<ProjectAnalysisRecord, 'id' | 'createdAt' | 'updatedAt' | 'title' | 'feedbackByFindingId'>> = {}
): ProjectAnalysisRecord {
  const feedbackByFindingId = overrides.feedbackByFindingId ?? {};
  const createdAt = overrides.createdAt ?? new Date().toISOString();
  const updatedAt = overrides.updatedAt ?? createdAt;

  return {
    ...response,
    id: overrides.id ?? response.analysisId,
    createdAt,
    updatedAt,
    title: overrides.title ?? createProjectAnalysisTitle(filesInput, response.profile),
    filesInput,
    feedbackByFindingId,
    feedbackSummary: summarizeProjectFeedback(feedbackByFindingId, response.findings.length),
  };
}

function getProjectTopSeverity(severityCounts: ProjectAnalysisSummary['severityCounts']): Severity | 'none' {
  if (severityCounts.error > 0) {
    return 'error';
  }

  if (severityCounts.warning > 0) {
    return 'warning';
  }

  if (severityCounts.info > 0) {
    return 'info';
  }

  return 'none';
}

function getProjectTopFindings(findings: ProjectFinding[]) {
  return Array.from(new Set(findings.map((finding) => `${finding.filePath}: ${finding.name}`))).slice(0, 3);
}

function toProjectAnalysisHistoryEntry(record: ProjectAnalysisRecord): ProjectAnalysisHistoryEntry {
  return {
    id: record.analysisId,
    analysisId: record.analysisId,
    title: record.title,
    profile: record.profile,
    source: record.source,
    score: record.summary.score,
    averageFileScore: record.summary.averageFileScore,
    fileCount: record.summary.fileCount,
    filesWithFindings: record.summary.filesWithFindings,
    findingCount: record.summary.findingCount,
    parseErrorCount: record.summary.parseErrorCount,
    topSeverity: getProjectTopSeverity(record.summary.severityCounts),
    feedbackSummary: record.feedbackSummary,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    filePaths: record.filesInput.map((file) => file.path),
    topFindings: getProjectTopFindings(record.findings),
  };
}

function createProjectHistoryEntryFromCard(
  payload: ProjectAnalysisSummaryCardPayload
): ProjectAnalysisHistoryEntry {
  const filePaths = payload.topFiles;
  const primaryPath = filePaths[0] ?? 'project';
  const extraFiles = Math.max(0, payload.fileCount - 1);
  const label = extraFiles > 0 ? `${primaryPath} + ${extraFiles} more` : primaryPath;

  return {
    id: payload.id,
    analysisId: payload.id,
    title: `${label} - ${payload.profile}`,
    profile: payload.profile,
    source: 'backend',
    score: payload.score,
    averageFileScore: payload.averageFileScore,
    fileCount: payload.fileCount,
    filesWithFindings: payload.filesWithFindings,
    findingCount: payload.findingCount,
    parseErrorCount: payload.parseErrorCount,
    topSeverity: payload.topSeverity,
    feedbackSummary: {
      total: 0,
      goodCatch: 0,
      falsePositive: 0,
      pending: payload.findingCount,
    },
    createdAt: payload.created_at,
    updatedAt: payload.created_at,
    filePaths,
    topFindings: payload.topFindings,
  };
}

function normalizeProjectFeedbackRecord(payload: FindingFeedbackPayload): ProjectFeedbackRecord {
  return {
    id: payload.id,
    analysisId: payload.analysisId,
    findingId: payload.findingId,
    status: payload.status,
    note: payload.note,
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,
  };
}

function normalizeStoredProjectAnalysisRecord(
  value: Partial<ProjectAnalysisRecord> & {
    request?: {
      files?: Array<ProjectFileInput & { id?: string }>;
    };
    created_at?: string;
  }
): ProjectAnalysisRecord | null {
  const analysisId =
    typeof value.analysisId === 'string'
      ? value.analysisId
      : typeof value.id === 'string'
        ? value.id
        : null;

  if (!analysisId || !value.summary || !Array.isArray(value.files) || !Array.isArray(value.findings)) {
    return null;
  }

  const filesInput =
    Array.isArray(value.filesInput) && value.filesInput.length > 0
      ? value.filesInput
      : Array.isArray(value.request?.files) && value.request.files.length > 0
        ? value.request.files.map((file, index) => ({
            id: file.id ?? `${analysisId}-file-${index + 1}`,
            path: file.path,
            language: file.language,
            code: file.code,
          }))
        : value.files.map((file, index) => ({
            id: `${analysisId}-file-${index + 1}`,
            path: file.path,
            language: file.language,
            code: '',
          }));

  const createdAt = value.createdAt ?? value.created_at ?? new Date().toISOString();
  const updatedAt = value.updatedAt ?? createdAt;
  const feedbackByFindingId = value.feedbackByFindingId ?? {};
  const profile = value.profile ?? 'balanced';

  return {
    ...(value as ProjectAnalysisRecord),
    id: analysisId,
    analysisId,
    profile,
    source: value.source ?? (analysisId.startsWith('local-') ? 'local' : 'backend'),
    title: value.title ?? createProjectAnalysisTitle(filesInput, profile),
    createdAt,
    updatedAt,
    filesInput,
    feedbackByFindingId,
    feedbackSummary:
      value.feedbackSummary ?? summarizeProjectFeedback(feedbackByFindingId, value.findings.length),
  };
}

function readProjectAnalysisRecords(): ProjectAnalysisRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(PROJECT_ANALYSIS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Array<Partial<ProjectAnalysisRecord>>;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((record) => normalizeStoredProjectAnalysisRecord(record))
      .filter((record): record is ProjectAnalysisRecord => Boolean(record))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch {
    return [];
  }
}

function writeProjectAnalysisRecords(records: ProjectAnalysisRecord[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(PROJECT_ANALYSIS_STORAGE_KEY, JSON.stringify(records));
}

function upsertProjectAnalysisRecord(record: ProjectAnalysisRecord) {
  const records = readProjectAnalysisRecords();
  const nextRecords = [
    record,
    ...records.filter(
      (entry) => entry.id !== record.id && entry.analysisId !== record.analysisId
    ),
  ];

  writeProjectAnalysisRecords(nextRecords);
}

function findProjectAnalysisRecord(
  records: ProjectAnalysisRecord[],
  id: string
): ProjectAnalysisRecord | null {
  return records.find((record) => record.id === id || record.analysisId === id) ?? null;
}

function normalizeProjectAnalysisRecordPayload(
  payload: ProjectAnalysisRecordPayload,
  existingRecord?: ProjectAnalysisRecord | null
): ProjectAnalysisRecord {
  const filesInput = payload.request.files.map((file, index) => ({
    id: existingRecord?.filesInput[index]?.id ?? `${payload.analysisId}-file-${index + 1}`,
    path: file.path,
    language: file.language,
    code: file.code,
  }));

  return createProjectAnalysisRecord(
    normalizeProjectAnalysis(payload),
    filesInput,
    {
      id: payload.analysisId,
      createdAt: payload.created_at,
      updatedAt: existingRecord?.updatedAt ?? payload.created_at,
      title: existingRecord?.title ?? createProjectAnalysisTitle(filesInput, payload.profile),
      feedbackByFindingId: existingRecord?.feedbackByFindingId ?? {},
    }
  );
}

function mergeProjectAnalysisHistoryEntries(
  preferredEntries: ProjectAnalysisHistoryEntry[],
  fallbackEntries: ProjectAnalysisHistoryEntry[],
  limit: number
) {
  const merged = new Map<string, ProjectAnalysisHistoryEntry>();

  for (const entry of [...preferredEntries, ...fallbackEntries]) {
    const key = entry.analysisId || entry.id;
    if (!merged.has(key)) {
      merged.set(key, entry);
    }
  }

  return Array.from(merged.values())
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, Math.max(0, limit));
}

function getProjectFindingSignature(finding: ProjectFinding) {
  return `${finding.filePath}::${finding.name}::${finding.severity}::${finding.scope}::${finding.line}::${finding.column}`;
}

function compareLocalProjectAnalyses(
  baseId: string,
  targetId: string
): ProjectComparisonResponse | null {
  const records = readProjectAnalysisRecords();
  const baseline = findProjectAnalysisRecord(records, baseId);
  const candidate = findProjectAnalysisRecord(records, targetId);

  if (!baseline || !candidate) {
    return null;
  }

  const baselineFindings = new Map(
    baseline.findings.map((finding) => [getProjectFindingSignature(finding), `${finding.filePath}: ${finding.name}`])
  );
  const candidateFindings = new Map(
    candidate.findings.map((finding) => [getProjectFindingSignature(finding), `${finding.filePath}: ${finding.name}`])
  );

  return {
    baseline: toProjectAnalysisHistoryEntry(baseline),
    candidate: toProjectAnalysisHistoryEntry(candidate),
    summary: {
      scoreDelta: Number((candidate.summary.score - baseline.summary.score).toFixed(1)),
      findingDelta: candidate.summary.findingCount - baseline.summary.findingCount,
      fileDelta: candidate.summary.fileCount - baseline.summary.fileCount,
      parseErrorDelta: candidate.summary.parseErrorCount - baseline.summary.parseErrorCount,
      persistedFindings: Array.from(baselineFindings.entries())
        .filter(([signature]) => candidateFindings.has(signature))
        .map(([, label]) => label),
      newFindings: Array.from(candidateFindings.entries())
        .filter(([signature]) => !baselineFindings.has(signature))
        .map(([, label]) => label),
      resolvedFindings: Array.from(baselineFindings.entries())
        .filter(([signature]) => !candidateFindings.has(signature))
        .map(([, label]) => label),
    },
    source: 'local',
  };
}

function normalizeProjectAnalysis(payload: ProjectAnalysisPayload): ProjectAnalysisResponse {
  return {
    ...payload,
    source: 'backend',
  };
}

function createLocalFeedbackResponse(request: FindingFeedbackRequest): FindingFeedbackResponse {
  return {
    accepted: true,
    source: 'local',
    verdict: request.verdict,
    recordedAt: new Date().toISOString(),
  };
}

function isProjectFinding(finding: Mistake): finding is ProjectFinding {
  return typeof (finding as ProjectFinding).findingId === 'string';
}

async function analyzeProjectLocally(request: ProjectAnalysisRequest): Promise<ProjectAnalysisResponse> {
  const files = await Promise.all(
    request.files.map(async (file) => {
      const lineCount = countLines(file.code);

      try {
        const results = await analyzeCode(file.code, file.language);
        const findings = results.mistakes
          .filter((mistake) => shouldIncludeFinding(request.profile, mistake))
          .map((mistake, index) => toProjectFinding(file, mistake, index));

        return {
          path: file.path,
          language: file.language,
          lineCount,
          score: scoreFindings(findings, lineCount, request.profile),
          findingCount: findings.length,
          findings,
          status: 'ok' as const,
        };
      } catch (error) {
        return {
          path: file.path,
          language: file.language,
          lineCount,
          score: 0,
          findingCount: 0,
          findings: [],
          status: 'parse_error' as const,
          error: error instanceof Error ? error.message : 'Failed to analyze file',
        };
      }
    })
  );

  const summary = summarizeProjectFiles(files, request.profile);

  return {
    analysisId: `local-${Date.now()}`,
    profile: request.profile,
    source: 'local',
    summary,
    files,
    findings: files.flatMap((file) => file.findings),
  };
}

export function persistProjectAnalysisRecord(
  response: ProjectAnalysisResponse,
  filesInput: ProjectFileInput[],
  overrides: Partial<Pick<ProjectAnalysisRecord, 'id' | 'createdAt' | 'updatedAt' | 'title' | 'feedbackByFindingId'>> = {}
): ProjectAnalysisRecord {
  const record = createProjectAnalysisRecord(response, filesInput, overrides);
  upsertProjectAnalysisRecord(record);
  return record;
}

export function updateProjectAnalysisFeedbackRecord(
  recordId: string,
  findingId: string,
  verdict: FindingFeedbackKind
): ProjectAnalysisRecord | null {
  const records = readProjectAnalysisRecords();
  const index = records.findIndex(
    (record) => record.id === recordId || record.analysisId === recordId
  );

  if (index === -1) {
    return null;
  }

  const current = records[index];
  const feedbackByFindingId = {
    ...current.feedbackByFindingId,
    [findingId]: verdict,
  };

  const updatedRecord: ProjectAnalysisRecord = {
    ...current,
    updatedAt: new Date().toISOString(),
    feedbackByFindingId,
    feedbackSummary: summarizeProjectFeedback(feedbackByFindingId, current.findings.length),
  };

  records[index] = updatedRecord;
  writeProjectAnalysisRecords(records);

  return updatedRecord;
}

export function getProjectAnalysisHistory(limit: number = 12): ProjectAnalysisHistoryResponse {
  const records = readProjectAnalysisRecords();
  const analyses = records.slice(0, Math.max(0, limit)).map(toProjectAnalysisHistoryEntry);

  return {
    analyses,
    total: records.length,
    source: 'local',
  };
}

export async function getProjectAnalysisRecord(id: string): Promise<ProjectAnalysisRecord | null> {
  const localRecords = readProjectAnalysisRecords();
  const existingRecord = findProjectAnalysisRecord(localRecords, id);

  try {
    const payload = await fetchJson<ProjectAnalysisRecordPayload>(
      `${API_BASE}/api/v1/projects/${id}`,
      undefined,
      'Failed to fetch project analysis'
    );

    const record = normalizeProjectAnalysisRecordPayload(payload, existingRecord);
    upsertProjectAnalysisRecord(record);
    return record;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return existingRecord;
    }

    throw error;
  }
}

export async function getRecentProjectAnalyses(limit: number = 10): Promise<ProjectAnalysisHistoryResponse> {
  const localHistory = getProjectAnalysisHistory(limit);

  try {
    const payload = await fetchJson<{ analyses: ProjectAnalysisSummaryCardPayload[]; total: number }>(
      `${API_BASE}/api/v1/projects/recent?limit=${limit}`,
      undefined,
      'Failed to fetch recent project analyses'
    );

    const remoteAnalyses = payload.analyses.map(createProjectHistoryEntryFromCard);
    const analyses = mergeProjectAnalysisHistoryEntries(localHistory.analyses, remoteAnalyses, limit);

    return {
      analyses,
      total: Math.max(payload.total, analyses.length),
      source: 'backend',
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return localHistory;
    }

    throw error;
  }
}

export async function compareProjectAnalyses(
  baseId: string,
  targetId: string
): Promise<ProjectComparisonResponse> {
  try {
    const params = new URLSearchParams({ baseId, targetId });
    const payload = await fetchJson<ProjectComparisonPayload>(
      `${API_BASE}/api/v1/projects/compare?${params.toString()}`,
      undefined,
      'Failed to compare project analyses'
    );

    return {
      baseline: createProjectHistoryEntryFromCard(payload.baseline),
      candidate: createProjectHistoryEntryFromCard(payload.candidate),
      summary: payload.summary,
      source: 'backend',
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      const comparison = compareLocalProjectAnalyses(baseId, targetId);
      if (comparison) {
        return comparison;
      }
    }

    throw error;
  }
}

export async function getProjectFeedbackSummary(
  analysisId: string
): Promise<ProjectFeedbackSummaryResponse> {
  const localRecord = findProjectAnalysisRecord(readProjectAnalysisRecords(), analysisId);

  try {
    const payload = await fetchJson<ProjectFeedbackSummaryPayload>(
      `${API_BASE}/api/v1/feedback/summary/${analysisId}`,
      undefined,
      'Failed to fetch project feedback summary'
    );

    return {
      analysisId: payload.analysisId,
      summary: {
        analysisId: payload.summary.analysisId,
        totalFindings: payload.summary.totalFindings,
        reviewedFindings: payload.summary.reviewedFindings,
        unreviewedFindings: payload.summary.unreviewedFindings,
        goodCatchCount: payload.summary.goodCatchCount,
        falsePositiveCount: payload.summary.falsePositiveCount,
        latestFeedback: payload.summary.latestFeedback
          ? normalizeProjectFeedbackRecord(payload.summary.latestFeedback)
          : null,
        feedback: payload.summary.feedback.map(normalizeProjectFeedbackRecord),
      },
      source: 'backend',
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404 && localRecord) {
      const feedback = Object.entries(localRecord.feedbackByFindingId).map(
        ([findingId, status], index): ProjectFeedbackRecord => ({
          id: `local-feedback-${index + 1}`,
          analysisId: localRecord.analysisId,
          findingId,
          status,
          createdAt: localRecord.updatedAt,
          updatedAt: localRecord.updatedAt,
        })
      );

      return {
        analysisId: localRecord.analysisId,
        summary: {
          analysisId: localRecord.analysisId,
          totalFindings: localRecord.findings.length,
          reviewedFindings: feedback.length,
          unreviewedFindings: Math.max(0, localRecord.findings.length - feedback.length),
          goodCatchCount: feedback.filter((entry) => entry.status === 'good_catch').length,
          falsePositiveCount: feedback.filter((entry) => entry.status === 'false_positive').length,
          latestFeedback: feedback[0] ?? null,
          feedback,
        },
        source: 'local',
      };
    }

    throw error;
  }
}

export function buildProjectAnalysisHref(analysisId: string) {
  return `/project/${analysisId}`;
}

export function buildProjectWorkspaceHref(analysisId: string) {
  return `/project?analysisId=${encodeURIComponent(analysisId)}`;
}

export async function analyzeCode(code: string, language: Language): Promise<AnalyzeResponse> {
  return fetchJson<AnalyzeResponse>(
    `${API_BASE}/api/analyze`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, language }),
    },
    'Analysis failed'
  );
}

export async function saveSnippet(
  code: string,
  language: Language,
  results: AnalyzeResponse
): Promise<SaveResponse> {
  return fetchJson<SaveResponse>(
    `${API_BASE}/api/save`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, language, results }),
    },
    'Save failed'
  );
}

export async function getSnippet(id: string): Promise<SnippetResponse> {
  return fetchJson<SnippetResponse>(`${API_BASE}/api/snippet/${id}`, undefined, 'Fetch failed');
}

export async function getRecentSnippets(limit: number = 10): Promise<RecentSnippetsResponse> {
  return fetchJson<RecentSnippetsResponse>(
    `${API_BASE}/api/v1/snippets/recent?limit=${limit}`,
    undefined,
    'Failed to fetch recent analyses'
  );
}

export async function compareSnippets(baseId: string, targetId: string): Promise<SnippetComparisonResponse> {
  const params = new URLSearchParams({ baseId, targetId });
  return fetchJson<SnippetComparisonResponse>(
    `${API_BASE}/api/v1/compare?${params.toString()}`,
    undefined,
    'Failed to compare snippets'
  );
}

export async function analyzeProject(request: ProjectAnalysisRequest): Promise<ProjectAnalysisResponse> {
  try {
    const payload = await fetchJson<ProjectAnalysisPayload>(
      `${API_BASE}/api/v1/projects/analyze`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: request.profile,
          files: request.files.map((file) => ({
            path: file.path,
            language: file.language,
            code: file.code,
          })),
        }),
      },
      'Project analysis failed'
    );

    return normalizeProjectAnalysis(payload);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return analyzeProjectLocally(request);
    }

    throw error;
  }
}

export async function submitFindingFeedback(
  request: FindingFeedbackRequest
): Promise<FindingFeedbackResponse> {
  if (!request.analysisId || !isProjectFinding(request.finding)) {
    return createLocalFeedbackResponse(request);
  }

  try {
    const payload = await fetchJson<FindingFeedbackPayload>(
      `${API_BASE}/api/v1/feedback`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisId: request.analysisId,
          findingId: request.finding.findingId,
          status: request.verdict,
          note: request.note,
        }),
      },
      'Feedback submission failed'
    );

    return {
      accepted: true,
      source: 'backend',
      verdict: payload.status,
      recordedAt: payload.updated_at || payload.created_at,
      id: payload.id,
      analysisId: payload.analysisId,
      findingId: payload.findingId,
      note: payload.note,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return createLocalFeedbackResponse(request);
    }

    throw error;
  }
}

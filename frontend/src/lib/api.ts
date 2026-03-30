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

type FindingFeedbackPayload = {
  id: string;
  analysisId: string;
  findingId: string;
  status: FindingFeedbackKind;
  note?: string;
  created_at: string;
  updated_at: string;
};

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

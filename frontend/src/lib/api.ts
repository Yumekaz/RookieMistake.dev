export type Language = 'javascript' | 'typescript' | 'python';

export type Severity = 'error' | 'warning' | 'info';

export type Certainty = 'definite' | 'possible' | 'heuristic';

export type Scope = 'local' | 'function' | 'module';

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

export async function analyzeCode(code: string, language: Language): Promise<AnalyzeResponse> {
  return fetchJson<AnalyzeResponse>(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, language }),
  }, 'Analysis failed');
}

export async function saveSnippet(
  code: string,
  language: Language,
  results: AnalyzeResponse
): Promise<SaveResponse> {
  return fetchJson<SaveResponse>(`${API_BASE}/api/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, language, results }),
  }, 'Save failed');
}

export async function getSnippet(id: string): Promise<SnippetResponse> {
  return fetchJson<SnippetResponse>(`${API_BASE}/api/snippet/${id}`, undefined, 'Fetch failed');
}

export async function getRecentSnippets(limit: number = 10): Promise<RecentSnippetsResponse> {
  return fetchJson<RecentSnippetsResponse>(`${API_BASE}/api/v1/snippets/recent?limit=${limit}`, undefined, 'Failed to fetch recent analyses');
}

export async function compareSnippets(baseId: string, targetId: string): Promise<SnippetComparisonResponse> {
  const params = new URLSearchParams({ baseId, targetId });
  return fetchJson<SnippetComparisonResponse>(`${API_BASE}/api/v1/compare?${params.toString()}`, undefined, 'Failed to compare snippets');
}

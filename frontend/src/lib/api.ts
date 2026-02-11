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

export interface SnippetResponse {
  id: string;
  code: string;
  language: Language;
  results: AnalyzeResponse;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export async function analyzeCode(code: string, language: Language): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, language }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Analysis failed' }));
    throw new Error(error.error || 'Analysis failed');
  }

  return response.json();
}

export async function saveSnippet(
  code: string,
  language: Language,
  results: AnalyzeResponse
): Promise<SaveResponse> {
  const response = await fetch(`${API_BASE}/api/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, language, results }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Save failed' }));
    throw new Error(error.error || 'Save failed');
  }

  return response.json();
}

export async function getSnippet(id: string): Promise<SnippetResponse> {
  const response = await fetch(`${API_BASE}/api/snippet/${id}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Snippet not found');
    }
    const error = await response.json().catch(() => ({ error: 'Fetch failed' }));
    throw new Error(error.error || 'Fetch failed');
  }

  return response.json();
}

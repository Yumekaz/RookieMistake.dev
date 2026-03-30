import type { Parser } from './parser';

// Supported languages for analysis
export type Language = 'javascript' | 'typescript' | 'python';

// Severity levels for detected mistakes
export type Severity = 'error' | 'warning' | 'info';

// Certainty levels for detected mistakes
export type Certainty = 'definite' | 'possible' | 'heuristic';

// Scope levels for detected mistakes
export type Scope = 'local' | 'function' | 'module';

// AST facts extracted by detectors - varies by detector type
export interface AstFacts {
  [key: string]: string | number | boolean | string[] | null | undefined;
}

// A single detected mistake
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
  ast_facts: AstFacts;
  explanation: string;
  fix: string;
  codeExample?: string;
}

// Response from /api/analyze
export interface AnalyzeResponse {
  mistakes: Mistake[];
  score: number;
}

// Request body for /api/analyze
export interface AnalyzeRequest {
  code: string;
  language: Language;
}

// Request body for /api/save
export interface SaveRequest {
  code: string;
  language: Language;
  results: AnalyzeResponse;
}

// Response from /api/save
export interface SaveResponse {
  id: string;
}

// Stored snippet in database
export interface Snippet {
  id: string;
  code: string;
  language: Language;
  results: AnalyzeResponse;
  created_at: string;
}

// Lightweight recent snippet record for history views
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

export interface SnippetComparisonSummary {
  scoreDelta: number;
  mistakeDelta: number;
  persistedMistakes: string[];
  newMistakes: string[];
  resolvedMistakes: string[];
}

export interface SnippetComparison {
  baseline: SnippetSummary;
  candidate: SnippetSummary;
  summary: SnippetComparisonSummary;
}

// Detector interface - all detectors must implement this
export interface Detector {
  name: string;
  supportedLanguages: Language[];
  detect(code: string, language: Language, tree: Parser.Tree): DetectorResult[];
}

// Raw result from a detector before explanation is added
export interface DetectorResult {
  name: string;
  line: number;
  column: number;
  severity: Severity;
  certainty: Certainty;
  confidence: number;
  scope: Scope;
  message: string;
  ast_facts: AstFacts;
}

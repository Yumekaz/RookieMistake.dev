import type { Parser } from './parser';

// Supported languages for analysis
export type Language = 'javascript' | 'typescript' | 'python';

// Analysis profiles for project-level analysis
export type AnalysisProfile = 'balanced' | 'focused' | 'strict';

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

// Request body for project analysis
export interface ProjectAnalysisRequest {
  profile: AnalysisProfile;
  files: ProjectFileInput[];
}

// Input file for project analysis
export interface ProjectFileInput {
  path: string;
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

export interface ProjectAnalysisResponse {
  analysisId: string;
  profile: AnalysisProfile;
  summary: ProjectAnalysisSummary;
  files: ProjectFileAnalysis[];
  findings: ProjectFinding[];
}

export interface ProjectAnalysisRecord extends ProjectAnalysisResponse {
  request: ProjectAnalysisRequest;
  created_at: string;
}

export type FindingFeedbackStatus = 'good_catch' | 'false_positive';

export interface FindingFeedback {
  id: string;
  analysisId: string;
  findingId: string;
  status: FindingFeedbackStatus;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface FindingFeedbackRequest {
  analysisId: string;
  findingId: string;
  status: FindingFeedbackStatus;
  note?: string;
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

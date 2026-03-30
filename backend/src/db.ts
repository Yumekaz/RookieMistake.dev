import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import {
  AnalyzeResponse,
  FindingFeedback,
  FindingFeedbackRequest,
  Language,
  ProjectAnalysisRecord,
  ProjectAnalysisRequest,
  ProjectAnalysisResponse,
  ProjectAnalysisSummaryCard,
  ProjectComparison,
  ProjectFeedbackSummaryResponse,
  RecentProjectAnalysesResponse,
  Severity,
  Snippet,
  SnippetComparison,
  SnippetSummary,
} from './types';
import config from './config';

const DB_PATH = config.dbPath || path.join(__dirname, '..', 'data', 'snippets.db');

let db: SqlJsDatabase | null = null;
let dbInitialized = false;

type SnippetRow = {
  id: string;
  code: string;
  language: string;
  results: string;
  created_at: string;
};

type ProjectAnalysisRow = {
  id: string;
  request: string;
  results: string;
  created_at: string;
};

type FindingFeedbackRow = {
  id: string;
  analysis_id: string;
  finding_id: string;
  status: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

function parseResults(results: string): AnalyzeResponse {
  return JSON.parse(results) as AnalyzeResponse;
}

function createSnippetSummary(row: SnippetRow): SnippetSummary {
  const results = parseResults(row.results);
  const topMistakes = Array.from(new Set(results.mistakes.map((mistake) => mistake.name))).slice(0, 3);
  const topSeverity = results.mistakes.some((mistake) => mistake.severity === 'error')
    ? 'error'
    : results.mistakes.some((mistake) => mistake.severity === 'warning')
      ? 'warning'
      : results.mistakes.some((mistake) => mistake.severity === 'info')
        ? 'info'
        : 'none';

  return {
    id: row.id,
    language: row.language as Language,
    score: results.score,
    mistakeCount: results.mistakes.length,
    created_at: row.created_at,
    codePreview: row.code.split('\n').map((line) => line.trim()).find(Boolean)?.slice(0, 120) || '',
    topSeverity,
    detectorNames: Array.from(new Set(results.mistakes.map((mistake) => mistake.name))),
    topMistakes,
  };
}

function createSnippet(row: SnippetRow): Snippet {
  return {
    id: row.id,
    code: row.code,
    language: row.language as Language,
    results: parseResults(row.results),
    created_at: row.created_at,
  };
}

function createProjectAnalysis(row: ProjectAnalysisRow): ProjectAnalysisRecord {
  const results = JSON.parse(row.results) as ProjectAnalysisResponse;
  const request = JSON.parse(row.request) as ProjectAnalysisRequest;

  return {
    ...results,
    request,
    created_at: row.created_at,
  };
}

function createFindingFeedback(row: FindingFeedbackRow): FindingFeedback {
  return {
    id: row.id,
    analysisId: row.analysis_id,
    findingId: row.finding_id,
    status: row.status as FindingFeedback['status'],
    note: row.note || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function getProjectTopSeverity(severityCounts: ProjectAnalysisResponse['summary']['severityCounts']): Severity | 'none' {
  if (severityCounts.error > 0) return 'error';
  if (severityCounts.warning > 0) return 'warning';
  if (severityCounts.info > 0) return 'info';
  return 'none';
}

function createProjectAnalysisSummaryCard(analysis: ProjectAnalysisRecord): ProjectAnalysisSummaryCard {
  const topSeverity = getProjectTopSeverity(analysis.summary.severityCounts);
  const topFiles = [...analysis.files]
    .sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === 'parse_error' ? -1 : 1;
      }

      if (left.findingCount !== right.findingCount) {
        return right.findingCount - left.findingCount;
      }

      if (left.score !== right.score) {
        return left.score - right.score;
      }

      return left.path.localeCompare(right.path);
    })
    .map((file) => file.path)
    .filter((path, index, all) => all.indexOf(path) === index)
    .slice(0, 3);

  const findingLabels = new Map<string, { count: number; severityWeight: number }>();
  const severityWeight: Record<Severity, number> = {
    error: 3,
    warning: 2,
    info: 1,
  };

  for (const finding of analysis.findings) {
    const label = `${finding.filePath}: ${finding.name}`;
    const current = findingLabels.get(label);
    findingLabels.set(label, {
      count: (current?.count ?? 0) + 1,
      severityWeight: Math.max(current?.severityWeight ?? 0, severityWeight[finding.severity]),
    });
  }

  const topFindings = [...findingLabels.entries()]
    .sort((left, right) => {
      const countDelta = right[1].count - left[1].count;
      if (countDelta !== 0) return countDelta;

      const severityDelta = right[1].severityWeight - left[1].severityWeight;
      if (severityDelta !== 0) return severityDelta;

      return left[0].localeCompare(right[0]);
    })
    .map(([label]) => label)
    .slice(0, 3);

  return {
    id: analysis.analysisId,
    profile: analysis.profile,
    score: analysis.summary.score,
    averageFileScore: analysis.summary.averageFileScore,
    fileCount: analysis.summary.fileCount,
    filesWithFindings: analysis.summary.filesWithFindings,
    parseErrorCount: analysis.summary.parseErrorCount,
    findingCount: analysis.summary.findingCount,
    created_at: analysis.created_at,
    topSeverity,
    topFiles,
    topFindings,
  };
}

function getProjectFindingSignature(finding: ProjectAnalysisRecord['findings'][number]): string {
  return `${finding.filePath}::${finding.name}::${finding.severity}::${finding.scope}::${finding.line}::${finding.column}`;
}

function getProjectFindingLabel(finding: ProjectAnalysisRecord['findings'][number]): string {
  return `${finding.filePath}: ${finding.name}`;
}

function indexProjectFindings(findings: ProjectAnalysisRecord['findings']): Map<string, string> {
  const indexed = new Map<string, string>();

  for (const finding of findings) {
    const signature = getProjectFindingSignature(finding);
    if (!indexed.has(signature)) {
      indexed.set(signature, getProjectFindingLabel(finding));
    }
  }

  return indexed;
}

function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  return db;
}

export async function initDatabase(): Promise<void> {
  if (dbInitialized) {
    return;
  }

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS snippets (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      language TEXT NOT NULL,
      results JSON,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_snippets_created_at ON snippets(created_at);
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS project_analyses (
      id TEXT PRIMARY KEY,
      request JSON NOT NULL,
      results JSON NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_project_analyses_created_at ON project_analyses(created_at);
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS finding_feedback (
      id TEXT PRIMARY KEY,
      analysis_id TEXT NOT NULL,
      finding_id TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(analysis_id, finding_id)
    );
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_finding_feedback_analysis_id ON finding_feedback(analysis_id);
  `);

  saveToFile();
  dbInitialized = true;
  console.log('Database initialized at', DB_PATH);
}

function saveToFile(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export function saveSnippet(
  id: string,
  code: string,
  language: Language,
  results: AnalyzeResponse
): void {
  const database = getDb();
  database.run(`INSERT INTO snippets (id, code, language, results) VALUES (?, ?, ?, ?)`, [
    id,
    code,
    language,
    JSON.stringify(results),
  ]);
  saveToFile();
}

export function saveProjectAnalysis(
  id: string,
  request: ProjectAnalysisRequest,
  results: ProjectAnalysisResponse
): void {
  const database = getDb();
  database.run(
    `INSERT INTO project_analyses (id, request, results) VALUES (?, ?, ?)`,
    [id, JSON.stringify(request), JSON.stringify(results)]
  );
  saveToFile();
}

export function getProjectAnalysis(id: string): ProjectAnalysisRecord | null {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT id, request, results, created_at
    FROM project_analyses
    WHERE id = ?
  `);
  stmt.bind([id]);

  if (stmt.step()) {
    const row = stmt.getAsObject() as ProjectAnalysisRow;
    stmt.free();
    return createProjectAnalysis(row);
  }

  stmt.free();
  return null;
}

export function getRecentProjectAnalyses(limit: number = 10): RecentProjectAnalysesResponse {
  const database = getDb();
  const totalStmt = database.prepare(`SELECT COUNT(*) AS total FROM project_analyses`);
  let total = 0;

  if (totalStmt.step()) {
    const row = totalStmt.getAsObject() as { total: number };
    total = Number(row.total || 0);
  }
  totalStmt.free();

  const stmt = database.prepare(`
    SELECT id, request, results, created_at
    FROM project_analyses
    ORDER BY created_at DESC, rowid DESC
    LIMIT ?
  `);
  stmt.bind([limit]);

  const analyses: ProjectAnalysisSummaryCard[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as ProjectAnalysisRow;
    analyses.push(createProjectAnalysisSummaryCard(createProjectAnalysis(row)));
  }

  stmt.free();

  return { analyses, total };
}

export function compareProjectAnalyses(baseId: string, targetId: string): ProjectComparison | null {
  const baseline = getProjectAnalysis(baseId);
  const candidate = getProjectAnalysis(targetId);

  if (!baseline || !candidate) {
    return null;
  }

  const baselineFindings = indexProjectFindings(baseline.findings);
  const candidateFindings = indexProjectFindings(candidate.findings);

  const persistedFindings = [...baselineFindings.entries()]
    .filter(([signature]) => candidateFindings.has(signature))
    .map(([, label]) => label);
  const newFindings = [...candidateFindings.entries()]
    .filter(([signature]) => !baselineFindings.has(signature))
    .map(([, label]) => label);
  const resolvedFindings = [...baselineFindings.entries()]
    .filter(([signature]) => !candidateFindings.has(signature))
    .map(([, label]) => label);

  return {
    baseline: createProjectAnalysisSummaryCard(baseline),
    candidate: createProjectAnalysisSummaryCard(candidate),
    summary: {
      scoreDelta: Number((candidate.summary.score - baseline.summary.score).toFixed(1)),
      findingDelta: candidate.summary.findingCount - baseline.summary.findingCount,
      fileDelta: candidate.summary.fileCount - baseline.summary.fileCount,
      parseErrorDelta: candidate.summary.parseErrorCount - baseline.summary.parseErrorCount,
      persistedFindings,
      newFindings,
      resolvedFindings,
    },
  };
}

export function saveFindingFeedback(
  id: string,
  payload: FindingFeedbackRequest
): FindingFeedback {
  const database = getDb();
  const existing = getFindingFeedback(payload.analysisId, payload.findingId);

  if (existing) {
    database.run(
      `
        UPDATE finding_feedback
        SET status = ?, note = ?, updated_at = datetime('now')
        WHERE analysis_id = ? AND finding_id = ?
      `,
      [payload.status, payload.note || null, payload.analysisId, payload.findingId]
    );

    saveToFile();
    return {
      ...existing,
      status: payload.status,
      note: payload.note,
      updated_at: new Date().toISOString(),
    };
  }

  database.run(
    `
      INSERT INTO finding_feedback (id, analysis_id, finding_id, status, note)
      VALUES (?, ?, ?, ?, ?)
    `,
    [id, payload.analysisId, payload.findingId, payload.status, payload.note || null]
  );
  saveToFile();

  return {
    id,
    analysisId: payload.analysisId,
    findingId: payload.findingId,
    status: payload.status,
    note: payload.note,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function getFindingFeedback(
  analysisId: string,
  findingId: string
): FindingFeedback | null {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT id, analysis_id, finding_id, status, note, created_at, updated_at
    FROM finding_feedback
    WHERE analysis_id = ? AND finding_id = ?
  `);
  stmt.bind([analysisId, findingId]);

  if (stmt.step()) {
    const row = stmt.getAsObject() as FindingFeedbackRow;
    stmt.free();
    return createFindingFeedback(row);
  }

  stmt.free();
  return null;
}

export function getFeedbackForAnalysis(analysisId: string): FindingFeedback[] {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT id, analysis_id, finding_id, status, note, created_at, updated_at
    FROM finding_feedback
    WHERE analysis_id = ?
    ORDER BY updated_at DESC, created_at DESC, rowid DESC
  `);
  stmt.bind([analysisId]);

  const feedback: FindingFeedback[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as FindingFeedbackRow;
    feedback.push(createFindingFeedback(row));
  }

  stmt.free();
  return feedback;
}

export function getProjectFeedbackSummary(analysisId: string): ProjectFeedbackSummaryResponse | null {
  const analysis = getProjectAnalysis(analysisId);
  if (!analysis) {
    return null;
  }

  const feedback = getFeedbackForAnalysis(analysisId);
  const reviewedFindings = feedback.length;
  const goodCatchCount = feedback.filter((entry) => entry.status === 'good_catch').length;
  const falsePositiveCount = feedback.filter((entry) => entry.status === 'false_positive').length;

  return {
    analysisId,
    summary: {
      analysisId,
      totalFindings: analysis.findings.length,
      reviewedFindings,
      unreviewedFindings: Math.max(0, analysis.findings.length - reviewedFindings),
      goodCatchCount,
      falsePositiveCount,
      latestFeedback: feedback[0] || null,
      feedback,
    },
  };
}

export function getSnippet(id: string): Snippet | null {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT id, code, language, results, created_at
    FROM snippets
    WHERE id = ?
  `);
  stmt.bind([id]);

  if (stmt.step()) {
    const row = stmt.getAsObject() as SnippetRow;
    stmt.free();
    return createSnippet(row);
  }

  stmt.free();
  return null;
}

export function snippetExists(id: string): boolean {
  const database = getDb();
  const stmt = database.prepare(`SELECT 1 FROM snippets WHERE id = ?`);
  stmt.bind([id]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

export function getRecentSnippets(limit: number = 10): SnippetSummary[] {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT id, code, language, results, created_at
    FROM snippets
    ORDER BY created_at DESC
    LIMIT ?
  `);
  stmt.bind([limit]);

  const snippets: SnippetSummary[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as SnippetRow;
    snippets.push(createSnippetSummary(row));
  }
  stmt.free();
  return snippets;
}

export function compareSnippets(baseId: string, targetId: string): SnippetComparison | null {
  const baseSnippet = getSnippet(baseId);
  const targetSnippet = getSnippet(targetId);

  if (!baseSnippet || !targetSnippet) {
    return null;
  }

  const baseMistakeNames = new Set(baseSnippet.results.mistakes.map((mistake) => mistake.name));
  const targetMistakeNames = new Set(targetSnippet.results.mistakes.map((mistake) => mistake.name));

  const persistedMistakes = [...baseMistakeNames].filter((name) => targetMistakeNames.has(name));
  const newMistakes = [...targetMistakeNames].filter((name) => !baseMistakeNames.has(name));
  const resolvedMistakes = [...baseMistakeNames].filter((name) => !targetMistakeNames.has(name));

  return {
    baseline: createSnippetSummary({
      id: baseSnippet.id,
      code: baseSnippet.code,
      language: baseSnippet.language,
      results: JSON.stringify(baseSnippet.results),
      created_at: baseSnippet.created_at,
    }),
    candidate: createSnippetSummary({
      id: targetSnippet.id,
      code: targetSnippet.code,
      language: targetSnippet.language,
      results: JSON.stringify(targetSnippet.results),
      created_at: targetSnippet.created_at,
    }),
    summary: {
      scoreDelta: targetSnippet.results.score - baseSnippet.results.score,
      mistakeDelta: targetSnippet.results.mistakes.length - baseSnippet.results.mistakes.length,
      persistedMistakes,
      newMistakes,
      resolvedMistakes,
    },
  };
}

export function deleteOldSnippets(olderThanDays: number = 30): number {
  const database = getDb();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  const cutoffStr = cutoffDate.toISOString();

  database.run(`DELETE FROM snippets WHERE created_at < ?`, [cutoffStr]);
  saveToFile();

  return 0;
}

export function closeDatabase(): void {
  if (db) {
    saveToFile();
    db.close();
    db = null;
    dbInitialized = false;
  }
}

export { db };

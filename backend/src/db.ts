import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { AnalyzeResponse, Language, Snippet, SnippetComparison, SnippetSummary } from './types';
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

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { Snippet, AnalyzeResponse, Language } from './types';

// Database file location - can be overridden via environment variable
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'snippets.db');

// Database instance
let db: SqlJsDatabase | null = null;
let dbInitialized = false;

/**
 * Initialize the database
 */
export async function initDatabase(): Promise<void> {
  if (dbInitialized) {
    return;
  }

  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Initialize SQL.js
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create snippets table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS snippets (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      language TEXT NOT NULL,
      results JSON,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Create index for faster lookups
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_snippets_created_at ON snippets(created_at);
  `);

  // Save to file
  saveToFile();

  dbInitialized = true;
  console.log('Database initialized at', DB_PATH);
}

/**
 * Save database to file
 */
function saveToFile(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Get the database instance (throws if not initialized)
 */
function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Save a new snippet to the database
 */
export function saveSnippet(
  id: string,
  code: string,
  language: Language,
  results: AnalyzeResponse
): void {
  const database = getDb();
  database.run(
    `INSERT INTO snippets (id, code, language, results) VALUES (?, ?, ?, ?)`,
    [id, code, language, JSON.stringify(results)]
  );
  saveToFile();
}

/**
 * Retrieve a snippet by ID
 */
export function getSnippet(id: string): Snippet | null {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT id, code, language, results, created_at
    FROM snippets
    WHERE id = ?
  `);
  stmt.bind([id]);

  if (stmt.step()) {
    const row = stmt.getAsObject() as {
      id: string;
      code: string;
      language: string;
      results: string;
      created_at: string;
    };
    stmt.free();
    return {
      id: row.id,
      code: row.code,
      language: row.language as Language,
      results: JSON.parse(row.results),
      created_at: row.created_at,
    };
  }

  stmt.free();
  return null;
}

/**
 * Check if a snippet exists
 */
export function snippetExists(id: string): boolean {
  const database = getDb();
  const stmt = database.prepare(`SELECT 1 FROM snippets WHERE id = ?`);
  stmt.bind([id]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

/**
 * Get recent snippets (for admin/debugging)
 */
export function getRecentSnippets(limit: number = 10): Snippet[] {
  const database = getDb();
  const stmt = database.prepare(`
    SELECT id, code, language, results, created_at
    FROM snippets
    ORDER BY created_at DESC
    LIMIT ?
  `);
  stmt.bind([limit]);

  const snippets: Snippet[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as {
      id: string;
      code: string;
      language: string;
      results: string;
      created_at: string;
    };
    snippets.push({
      id: row.id,
      code: row.code,
      language: row.language as Language,
      results: JSON.parse(row.results),
      created_at: row.created_at,
    });
  }
  stmt.free();
  return snippets;
}

/**
 * Delete old snippets (for cleanup)
 */
export function deleteOldSnippets(olderThanDays: number = 30): number {
  const database = getDb();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  const cutoffStr = cutoffDate.toISOString();

  database.run(`DELETE FROM snippets WHERE created_at < ?`, [cutoffStr]);
  saveToFile();

  // sql.js doesn't return affected rows easily, so return 0
  return 0;
}

/**
 * Close database connection (for graceful shutdown)
 */
export function closeDatabase(): void {
  if (db) {
    saveToFile();
    db.close();
    db = null;
    dbInitialized = false;
  }
}

// Export the raw database instance for testing
export { db };

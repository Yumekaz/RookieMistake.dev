# 🔍 RookieMistakes.dev

A deterministic, open-source code analysis tool that detects common junior developer mistakes in JavaScript, TypeScript, and Python using AST-based analysis. No AI, no paid APIs—just pure syntax tree pattern matching.

## Features

- **10 Common Mistake Detectors**: Catches issues like missing `await`, `==` vs `===`, empty catch blocks, and more
- **Three Languages**: JavaScript, TypeScript, and Python support via tree-sitter
- **Deterministic Explanations**: Template-based explanations with concrete AST facts
- **Share Results**: Save and share analysis results via unique URLs
- **Monaco Editor**: Professional code editing experience in the browser
- **Open Source**: MIT licensed, run locally, zero cloud dependencies
- **API Documentation**: Interactive Swagger UI at `/api/docs`
- **Rate Limiting**: Protection against abuse with configurable limits
- **Structured Logging**: Winston-based logging with file rotation
- **Input Validation**: Zod schema validation for all API inputs
- **CI/CD Ready**: GitHub Actions workflow included

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js 14)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Monaco Editor │  │ Results Panel │  │ Save/Share Component  │ │
│  └──────┬───────┘  └──────▲───────┘  └───────────┬────────────┘ │
│         │                 │                       │              │
│         └────────────────────────────────────────┘              │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │ HTTP API
┌───────────────────────────┼──────────────────────────────────────┐
│                    Backend (Express + TypeScript)                │
│                           │                                      │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │                    Middleware                             │   │
│  │  Rate Limiting  │  Validation  │  Error Handler  │ Logger │   │
│  └─────────┬───────────┴────────┬─────────┴─────────┬────────┘   │
│            │                    │                   │            │
│  ┌─────────▼─────────────────────────────────────────────────┐   │
│  │                    API Routes (v1)                        │   │
│  │  POST /api/v1/analyze  │  POST /api/v1/save  │  GET /api/v1/snippet │
│  └─────────┬───────────┴────────┬─────────┴─────────┬────────┘   │
│            │                    │                   │            │
│  ┌─────────▼─────────┐  ┌───────▼───────┐  ┌───────▼───────┐   │
│  │   Tree-Sitter     │  │   Explainers   │  │   SQLite DB   │   │
│  │   Parser + 10     │  │   (Handlebars  │  │   (Snippets)  │   │
│  │   Detectors       │  │   Templates)   │  │               │   │
│  └───────────────────┘  └───────────────┘  └───────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Editor | Monaco Editor (@monaco-editor/react) |
| Backend | Node.js, Express, TypeScript |
| Parser | web-tree-sitter (JS, TS, Python grammars via WASM) |
| Database | SQLite (sql.js - WASM-based) |
| Templates | Handlebars |
| Validation | Zod |
| Logging | Winston |
| Rate Limiting | express-rate-limit |
| API Docs | Swagger (swagger-jsdoc + swagger-ui-express) |
| Tests | Jest + Supertest + React Testing Library |
| Linting | ESLint + Prettier |
| CI/CD | GitHub Actions |
| Container | Docker + Docker Compose |

## Quickstart

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/rookiemistakes/rookiemistakes.dev.git
cd rookiemistakes.dev

# Start with Docker Compose
docker-compose up --build

# Access the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# API Docs: http://localhost:3001/api/docs
```

### Option 2: Local Development

```bash
# Backend
cd backend
cp .env.example .env  # Configure environment
npm install
npm run dev
# API running at http://localhost:3001
# API Docs: http://localhost:3001/api/docs

# Frontend (in a new terminal)
cd frontend
npm install
npm run dev
# App running at http://localhost:3000
```

### Run Tests

```bash
# Backend tests (100 tests)
cd backend
npm test

# Frontend tests (21 tests)
cd frontend
npm test

# Lint code
cd backend && npm run lint
cd frontend && npm run lint
```

## API Reference

### API Documentation

Interactive API documentation is available at `/api/docs` when the server is running.

### POST /api/v1/analyze (or /api/analyze)

Analyze code for common mistakes.

**Request:**
```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "code": "async function test() { fetch(\"/api\"); }",
    "language": "javascript"
  }'
```

**Response:**
```json
{
  "mistakes": [
    {
      "id": 1,
      "name": "missing_await",
      "line": 1,
      "column": 24,
      "severity": "error",
      "message": "Async function 'fetch' called without await",
      "ast_facts": {
        "callee_name": "fetch",
        "enclosing_function_is_async": true,
        "parent_type": "expression_statement"
      },
      "explanation": "You call fetch inside an async function without awaiting it. Because async functions return Promises, the surrounding code continues before the operation completes.",
      "fix": "Await the call: const result = await fetch(...); or handle the Promise with .then/.catch."
    }
  ],
  "score": 9
}
```

### POST /api/save

Save code and analysis results for sharing.

**Request:**
```bash
curl -X POST http://localhost:3001/api/save \
  -H "Content-Type: application/json" \
  -d '{
    "code": "var x = 1;",
    "language": "javascript",
    "results": { "mistakes": [...], "score": 9 }
  }'
```

**Response:**
```json
{
  "id": "abc123xyz"
}
```

### GET /api/snippet/:id

Retrieve a saved snippet.

```bash
curl http://localhost:3001/api/snippet/abc123xyz
```

**Response:**
```json
{
  "id": "abc123xyz",
  "code": "var x = 1;",
  "language": "javascript",
  "results": { "mistakes": [...], "score": 9 },
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

## The 10 Detectors

| Detector | Languages | Severity | Description |
|----------|-----------|----------|-------------|
| `missing_await` | JS/TS | error | Async function called without `await` |
| `double_equals` | JS/TS | warning | Using `==`/`!=` instead of `===`/`!==` |
| `nullable_access` | JS/TS/PY | warning | Potential access on null/undefined/None |
| `variable_shadowing` | JS/TS/PY | warning | Inner scope variable shadows outer |
| `off_by_one_loop` | JS/TS/PY | warning | Loop uses `<=` with `.length`/`len()` |
| `no_error_handling` | JS/TS/PY | warning | Async call without try/catch or .catch() |
| `array_mutation` | JS/TS | warning | Mutating arrays (especially state/props) |
| `var_usage` | JS | info | Using `var` instead of `let`/`const` |
| `console_log_left` | JS/TS | info | Console statements left in code |
| `empty_catch` | JS/TS/PY | warning | Empty catch/except block |

## Adding New Detectors

1. Create a new file in `backend/src/detectors/`:

```typescript
// backend/src/detectors/my-detector.ts
import { Parser } from '../parser';
import { DetectorResult, Language } from '../types';
import { walkTree } from '../parser';

export function detectMyIssue(
  tree: Parser.Tree,
  code: string,
  language: Language
): DetectorResult[] {
  const results: DetectorResult[] = [];
  
  walkTree(tree.rootNode, (node) => {
    // Your detection logic here
    if (node.type === 'some_pattern') {
      results.push({
        name: 'my_issue',
        line: node.startPosition.row + 1,
        column: node.startPosition.column + 1,
        severity: 'warning',
        message: 'Description of the issue',
        ast_facts: {
          // Include relevant AST facts
        },
      });
    }
  });
  
  return results;
}
```

2. Register in `backend/src/detectors/index.ts`:

```typescript
import { detectMyIssue } from './my-detector';

export const detectors = [
  // ... existing detectors
  detectMyIssue,
];
```

3. Add template in `backend/src/explainers/templates.ts`:

```typescript
export const templates = {
  // ... existing templates
  my_issue: {
    explanation: 'Your explanation with {{ast_facts}}',
    fix: 'How to fix: {{suggested_fix}}',
  },
};
```

4. Add tests in `backend/tests/detectors/my-detector.test.ts`

## Migration to PostgreSQL

To migrate from SQLite to PostgreSQL:

1. Install pg package:
```bash
npm install pg @types/pg
```

2. Update `backend/src/db.ts`:
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function saveSnippet(id, code, language, results) {
  await pool.query(
    'INSERT INTO snippets (id, code, language, results) VALUES ($1, $2, $3, $4)',
    [id, code, language, JSON.stringify(results)]
  );
}
```

3. Create migration:
```sql
CREATE TABLE snippets (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  results JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Project Structure

```
rookie-mistakes/
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx           # Main editor page
│       │   └── s/[id]/page.tsx    # Snippet viewer
│       ├── components/
│       │   ├── Editor.tsx         # Monaco wrapper
│       │   └── ResultsPanel.tsx   # Results display
│       └── lib/
│           └── api.ts             # API client
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   ├── Dockerfile
│   └── src/
│       ├── index.ts               # Express app
│       ├── types.ts               # TypeScript interfaces
│       ├── parser.ts              # Tree-sitter setup
│       ├── db.ts                  # SQLite wrapper
│       ├── routes/
│       │   ├── analyze.ts         # POST /api/analyze
│       │   └── snippets.ts        # Save/get snippets
│       ├── detectors/
│       │   ├── index.ts           # Detector registry
│       │   ├── missing-await.ts
│       │   ├── double-equals.ts
│       │   └── ... (8 more)
│       └── explainers/
│           ├── index.ts
│           └── templates.ts       # Handlebars templates
├── docker-compose.yml
├── README.md
└── LICENSE
```

## Assumptions & Tradeoffs

### Assumptions

1. **Single-file analysis**: We analyze one file at a time without cross-file dependency resolution
2. **Heuristic detection**: Some detectors use heuristics that may have false positives/negatives
3. **No type inference**: We don't run TypeScript's type checker; detection is purely syntactic
4. **Browser compatibility**: Monaco editor requires modern browser with WebGL support

### Tradeoffs

1. **False positives vs coverage**: We err on the side of fewer false positives, which may miss some real issues
2. **No control flow analysis**: We use simple scope tracking rather than full dataflow analysis
3. **SQLite for simplicity**: Easy setup but limited concurrent write performance
4. **No authentication**: Snippets are public by URL; add auth for production use

### Heuristics Documentation

- **`nullable_access`**: Tracks variables assigned `null`/`undefined`/`None` and checks for guard conditions. May miss cases where null comes from function returns.
- **`missing_await`**: Tracks async functions declared in the same file. Won't catch async functions imported from other modules.
- **`variable_shadowing`**: Ignores common loop variables (`i`, `j`, `k`, `err`) to reduce noise.
- **`console_log_left`**: Ignores console.error in catch blocks (legitimate error logging).

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-detector`
3. Add tests for your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ for junior developers everywhere. Learn from your mistakes!

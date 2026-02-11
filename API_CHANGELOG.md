# API Changelog

All notable changes to the RookieMistakes.dev API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Code examples in mistake responses (`codeExample` field)
- Enhanced fix suggestions with before/after code comparisons

## [1.0.0] - 2024-01-15

### Added
- Initial API release with v1 endpoints
- POST `/api/v1/analyze` - Analyze code for common mistakes
- POST `/api/v1/save` - Save code snippets with analysis results
- GET `/api/v1/snippet/:id` - Retrieve saved snippets
- Legacy endpoints maintained at `/api/*` for backwards compatibility
- Rate limiting on all endpoints
- Structured error responses with request IDs
- Comprehensive request validation with Zod

### Detectors
- `missing_await` - Detects async calls without await
- `double_equals` - Detects loose equality operators (==, !=)
- `nullable_access` - Detects potential null/undefined access
- `variable_shadowing` - Detects variable name shadowing
- `off_by_one_loop` - Detects off-by-one errors in loops
- `no_error_handling` - Detects unhandled async operations
- `array_mutation` - Detects mutating array methods
- `var_usage` - Detects var keyword usage
- `console_log_left` - Detects leftover console statements
- `empty_catch` - Detects empty catch blocks

### Response Format
```json
{
  "mistakes": [
    {
      "id": 1,
      "name": "missing_await",
      "line": 5,
      "column": 10,
      "severity": "error",
      "certainty": "definite",
      "confidence": 0.95,
      "scope": "function",
      "message": "Async function called without await",
      "explanation": "Detailed explanation...",
      "fix": "Suggested fix...",
      "codeExample": "// Before/after code example..."
    }
  ],
  "score": 8
}
```

### Security
- Rate limiting: 100 requests per 15 minutes per IP
- Input validation on all endpoints
- Maximum code size: 100KB
- CORS enabled for cross-origin requests

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2024-01-15 | Initial stable release |

## Migration Guide

### From Legacy to v1

Legacy endpoints at `/api/analyze`, `/api/save`, and `/api/snippet/:id` are still supported but may be deprecated in future versions.

**Recommended:** Update your requests to use `/api/v1/*` endpoints for new features and better error handling.

#### Changes in v1:
- More detailed error messages
- Request ID tracking in error responses
- Rate limit headers (`X-RateLimit-*`)
- Structured validation errors

# Contributing to RookieMistakes.dev

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Adding New Detectors](#adding-new-detectors)
- [Testing](#testing)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code:

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Respect different viewpoints and experiences

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/rookiemistakes.dev.git`
3. Create a branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Docker (optional, for containerized development)

### Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# All tests with coverage
npm test -- --coverage
```

## How to Contribute

### Reporting Bugs

Before creating a bug report:
- Check if the issue already exists
- Use the latest version to verify

Include in your report:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Code sample that triggers the issue
- Language (JavaScript/TypeScript/Python)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. Include:
- Clear use case
- Expected behavior
- Possible implementation approach

### Adding New Detectors

This is one of the best ways to contribute! Here's how:

#### 1. Create the Detector File

Create a new file in `backend/src/detectors/your-detector.ts`:

```typescript
import { DetectorResult, Language } from '../types';
import { walkTree } from '../parser';
import Parser from 'web-tree-sitter';

export function detectYourIssue(
  tree: Parser.Tree,
  code: string,
  language: Language
): DetectorResult[] {
  const results: DetectorResult[] = [];
  
  walkTree(tree.rootNode, (node) => {
    // Your detection logic here
    if (node.type === 'target_node_type') {
      results.push({
        name: 'your_issue_name',
        line: node.startPosition.row + 1,
        column: node.startPosition.column + 1,
        severity: 'warning', // or 'error', 'info'
        certainty: 'possible', // or 'definite', 'heuristic'
        confidence: 0.8,
        scope: 'function', // or 'local', 'module'
        message: 'Clear description of the issue',
        ast_facts: {
          // Relevant AST information
          node_type: node.type,
          // ...
        },
      });
    }
  });
  
  return results;
}
```

#### 2. Register the Detector

Add to `backend/src/detectors/index.ts`:

```typescript
import { detectYourIssue } from './your-detector';

export const detectors = [
  // ... existing detectors
  {
    name: 'your_detector',
    supportedLanguages: ['javascript', 'typescript'], // or ['python'], etc.
    detect: detectYourIssue,
  },
];
```

#### 3. Add Explanation Template

Add to `backend/src/explainers/templates.ts`:

```typescript
your_issue_name: {
  explanation:
    "Description of why this is a problem with {{ast_fact}}.",
  fix: "How to fix the issue.",
  codeExample: `// ❌ Before
bad code

// ✅ After
fixed code`,
},
```

#### 4. Write Tests

Create `backend/tests/detectors/your-detector.test.ts`:

```typescript
import { detectYourIssue } from '../../src/detectors/your-detector';
import { parseCode } from '../../src/parser';

describe('your_detector', () => {
  it('detects the issue', () => {
    const code = `code that triggers the issue`;
    const tree = parseCode(code, 'javascript');
    const results = detectYourIssue(tree, code, 'javascript');
    
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('your_issue_name');
  });

  it('does not flag valid code', () => {
    const code = `valid code`;
    const tree = parseCode(code, 'javascript');
    const results = detectYourIssue(tree, code, 'javascript');
    
    expect(results).toHaveLength(0);
  });
});
```

#### 5. Update Documentation

- Add to README.md detector table
- Update API_CHANGELOG.md if needed

## Testing Guidelines

### Test Structure
- Unit tests for detectors
- Integration tests for API endpoints
- E2E tests for critical user flows

### Writing Good Tests
- Test both positive and negative cases
- Test edge cases
- Keep tests deterministic
- Use descriptive test names

Example:
```typescript
describe('detector_name', () => {
  describe('positive cases (should detect)', () => {
    it('detects specific pattern', () => { ... });
    it('handles multiple occurrences', () => { ... });
  });

  describe('negative cases (should not detect)', () => {
    it('does not flag valid code', () => { ... });
    it('ignores comments', () => { ... });
  });
});
```

## Commit Messages

Use conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `style`: Code style changes (formatting)
- `chore`: Build process or auxiliary tool changes

Examples:
```
feat(detectors): add missing_await detector

fix(parser): handle syntax errors gracefully

docs(readme): update installation instructions
```

## Pull Request Process

1. **Before Submitting**
   - Run all tests: `npm test`
   - Run linting: `npm run lint`
   - Update documentation if needed
   - Add tests for new features

2. **PR Description**
   - Clear description of changes
   - Link to related issue(s)
   - Screenshots for UI changes
   - Testing instructions

3. **Review Process**
   - Maintainers will review within 48 hours
   - Address review feedback
   - Keep PR focused on single concern

4. **After Merge**
   - Delete your branch
   - Update your local main branch

## Questions?

- Open an issue for questions
- Join discussions in existing issues
- Check existing documentation

## Recognition

Contributors will be recognized in:
- Release notes
- CONTRIBUTORS.md file
- Project documentation

Thank you for contributing to RookieMistakes.dev! 🚀

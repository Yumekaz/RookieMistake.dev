import { Parser } from '../parser';
import { Detector, DetectorResult, Language } from '../types';
import { findNodes, getNodeText, getLineNumber, getColumnNumber } from '../parser';

const BROAD_EXCEPTION_PATTERNS = [
  /^except\s*:/i,
  /\bexcept\s+Exception\b/i,
  /\bexcept\s+BaseException\b/i,
  /\bexcept\s+\(.*Exception.*\)/i,
];

function isBroadException(clauseText: string): boolean {
  return BROAD_EXCEPTION_PATTERNS.some((pattern) => pattern.test(clauseText));
}

const broadExceptionDetector: Detector = {
  name: 'broad_exception',
  supportedLanguages: ['python'],

  detect(code: string, _language: Language, tree: Parser.Tree): DetectorResult[] {
    const results: DetectorResult[] = [];
    const root = tree.rootNode;

    for (const node of findNodes(root, 'except_clause')) {
      const clauseText = getNodeText(node, code).trim();
      if (!isBroadException(clauseText)) {
        continue;
      }

      const bareExcept = /^except\s*:/i.test(clauseText);

      results.push({
        name: 'broad_exception',
        line: getLineNumber(node),
        column: getColumnNumber(node),
        severity: 'warning',
        certainty: bareExcept ? 'definite' : 'possible',
        confidence: bareExcept ? 0.95 : 0.8,
        scope: 'function',
        message: bareExcept
          ? 'Bare except handler catches every exception type'
          : 'Broad exception handler can hide unexpected failures',
        ast_facts: {
          clause_text: clauseText,
          bare_except_boolean: bareExcept,
        },
      });
    }

    return results;
  },
};

export default broadExceptionDetector;

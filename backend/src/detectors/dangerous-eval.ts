import { Parser } from '../parser';
import { Detector, DetectorResult, Language } from '../types';
import { findNodes, getNodeText, getLineNumber, getColumnNumber } from '../parser';

const DANGEROUS_PATTERNS: Array<{ apiName: string; regex: RegExp }> = [
  { apiName: 'eval', regex: /\beval\s*\(/ },
  { apiName: 'Function', regex: /\bnew\s+Function\s*\(/ },
  { apiName: 'Function', regex: /\bFunction\s*\(/ },
  { apiName: 'setTimeout', regex: /\bsetTimeout\s*\(\s*['"`]/ },
  { apiName: 'setInterval', regex: /\bsetInterval\s*\(\s*['"`]/ },
];

function getDangerousApi(callText: string, language: Language): string | null {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.regex.test(callText)) {
      if ((pattern.apiName === 'setTimeout' || pattern.apiName === 'setInterval') && language === 'python') {
        continue;
      }
      return pattern.apiName;
    }
  }

  if (language === 'python') {
    if (/\bexec\s*\(/.test(callText)) return 'exec';
  }

  return null;
}

const dangerousEvalDetector: Detector = {
  name: 'dangerous_eval',
  supportedLanguages: ['javascript', 'typescript', 'python'],

  detect(code: string, language: Language, tree: Parser.Tree): DetectorResult[] {
    const results: DetectorResult[] = [];
    const root = tree.rootNode;
    const nodes = findNodes(root, ['call_expression', 'call', 'new_expression']);

    for (const node of nodes) {
      const callText = getNodeText(node, code);
      const apiName = getDangerousApi(callText, language);

      if (!apiName) {
        continue;
      }

      results.push({
        name: 'dangerous_eval',
        line: getLineNumber(node),
        column: getColumnNumber(node),
        severity: 'error',
        certainty: 'definite',
        confidence: 0.95,
        scope: 'function',
        message: `Dangerous use of '${apiName}' can execute arbitrary code`,
        ast_facts: {
          api_name: apiName,
          call_preview: callText.slice(0, 80),
        },
      });
    }

    return results;
  },
};

export default dangerousEvalDetector;

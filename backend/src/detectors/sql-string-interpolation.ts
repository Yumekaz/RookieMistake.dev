import { Parser } from '../parser';
import { Detector, DetectorResult, Language } from '../types';
import { findNodes, getNodeText, getLineNumber, getColumnNumber } from '../parser';

const SQL_CALL_PATTERNS = [
  /\bquery\s*\(/i,
  /\bexecute\s*\(/i,
  /\braw\s*\(/i,
  /\brun\s*\(/i,
  /\bexecSql\s*\(/i,
  /\bexecuteSql\s*\(/i,
  /\bsql\s*\(/i,
];

const SQL_KEYWORDS = /\b(select|insert|update|delete|replace|create|drop|alter|from|where|join|values)\b/i;

function hasInterpolation(text: string): boolean {
  return /\$\{/.test(text) || /\bf['"]/.test(text) || /\bformat\(/i.test(text) || /%\s*[a-zA-Z]/.test(text) || /\+/.test(text);
}

function looksParameterized(text: string): boolean {
  return /\?\s*[,\)]/.test(text) || /\$\d+/.test(text) || /:%s/.test(text) || /%\(\w+\)s/.test(text);
}

const sqlStringInterpolationDetector: Detector = {
  name: 'sql_string_interpolation',
  supportedLanguages: ['javascript', 'typescript', 'python'],

  detect(code: string, _language: Language, tree: Parser.Tree): DetectorResult[] {
    const results: DetectorResult[] = [];
    const root = tree.rootNode;
    const nodes = findNodes(root, ['call_expression', 'call']);

    for (const node of nodes) {
      const callText = getNodeText(node, code);
      if (!SQL_CALL_PATTERNS.some((pattern) => pattern.test(callText))) {
        continue;
      }

      if (!SQL_KEYWORDS.test(callText) || looksParameterized(callText) || !hasInterpolation(callText)) {
        continue;
      }

      results.push({
        name: 'sql_string_interpolation',
        line: getLineNumber(node),
        column: getColumnNumber(node),
        severity: 'error',
        certainty: 'possible',
        confidence: 0.9,
        scope: 'function',
        message: 'SQL text is built with interpolation or concatenation instead of parameters',
        ast_facts: {
          call_preview: callText.slice(0, 100),
          has_interpolation: true,
        },
      });
    }

    return results;
  },
};

export default sqlStringInterpolationDetector;

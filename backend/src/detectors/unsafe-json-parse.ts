import { Parser } from '../parser';
import { Detector, DetectorResult, Language } from '../types';
import { findNodes, getNodeText, getLineNumber, getColumnNumber, findAncestor } from '../parser';

const JS_JSON_PATTERN = /\bJSON\.parse\s*\(/;
const PY_JSON_PATTERNS = [/\bjson\.loads\s*\(/, /\bjson\.load\s*\(/];

function isInsideTry(node: Parser.SyntaxNode): boolean {
  return findAncestor(node, 'try_statement') !== null;
}

function getApiName(callText: string, language: Language): string | null {
  if (language === 'python') {
    for (const pattern of PY_JSON_PATTERNS) {
      if (pattern.test(callText)) {
        return pattern.source.includes('loads') ? 'json.loads' : 'json.load';
      }
    }
    return null;
  }

  return JS_JSON_PATTERN.test(callText) ? 'JSON.parse' : null;
}

const unsafeJsonParseDetector: Detector = {
  name: 'unsafe_json_parse',
  supportedLanguages: ['javascript', 'typescript', 'python'],

  detect(code: string, language: Language, tree: Parser.Tree): DetectorResult[] {
    const results: DetectorResult[] = [];
    const root = tree.rootNode;
    const nodes = findNodes(root, ['call_expression', 'call']);

    for (const node of nodes) {
      const callText = getNodeText(node, code);
      const apiName = getApiName(callText, language);

      if (!apiName || isInsideTry(node)) {
        continue;
      }

      results.push({
        name: 'unsafe_json_parse',
        line: getLineNumber(node),
        column: getColumnNumber(node),
        severity: 'warning',
        certainty: 'possible',
        confidence: 0.8,
        scope: 'function',
        message: `Parsing JSON with '${apiName}' outside error handling can throw at runtime`,
        ast_facts: {
          api_name: apiName,
          call_preview: callText.slice(0, 80),
        },
      });
    }

    return results;
  },
};

export default unsafeJsonParseDetector;

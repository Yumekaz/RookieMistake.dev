import { Parser } from '../parser';
import { Detector, DetectorResult, Language } from '../types';
import { findNodes, getNodeText, getLineNumber, getColumnNumber } from '../parser';

const missingDefaultSwitchDetector: Detector = {
  name: 'missing_default_switch',
  supportedLanguages: ['javascript', 'typescript'],

  detect(code: string, _language: Language, tree: Parser.Tree): DetectorResult[] {
    const results: DetectorResult[] = [];
    const root = tree.rootNode;

    for (const switchNode of findNodes(root, 'switch_statement')) {
      const switchText = getNodeText(switchNode, code);
      const caseCount = (switchText.match(/\bcase\b/g) || []).length;
      const hasDefault = /\bdefault\s*:/.test(switchText);

      if (caseCount < 2 || hasDefault) {
        continue;
      }

      results.push({
        name: 'missing_default_switch',
        line: getLineNumber(switchNode),
        column: getColumnNumber(switchNode),
        severity: 'warning',
        certainty: 'heuristic',
        confidence: 0.55,
        scope: 'function',
        message: 'Switch statement has no default branch for unexpected values',
        ast_facts: {
          case_count: caseCount,
          has_default_boolean: false,
        },
      });
    }

    return results;
  },
};

export default missingDefaultSwitchDetector;

import { Parser } from '../parser';
import { Detector, DetectorResult, Language } from '../types';
import { findNodes, getNodeText, getLineNumber, getColumnNumber } from '../parser';

const SECRET_NAME_PATTERNS = [
  /secret/i,
  /token/i,
  /password/i,
  /passwd/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /client[_-]?secret/i,
  /auth[_-]?token/i,
  /session[_-]?key/i,
  /credential/i,
  /nonce/i,
];

function isSensitiveName(name: string): boolean {
  return SECRET_NAME_PATTERNS.some((pattern) => pattern.test(name));
}

function isStringLiteral(text: string): boolean {
  const trimmed = text.trim();
  return (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('`') && trimmed.endsWith('`'))
  );
}

function isEnvironmentAccess(text: string): boolean {
  return /process\.env|import\.meta\.env|os\.environ|getenv\(|dotenv/i.test(text);
}

function getTargetAndValue(
  node: Parser.SyntaxNode,
  code: string
): { target: string | null; value: string } {
  if (node.type === 'variable_declarator') {
    const nameNode = node.childForFieldName('name');
    const valueNode = node.childForFieldName('value');
    return {
      target: nameNode ? getNodeText(nameNode, code) : null,
      value: valueNode ? getNodeText(valueNode, code) : '',
    };
  }

  const left = node.childForFieldName('left');
  const right = node.childForFieldName('right');

  return {
    target: left ? getNodeText(left, code) : null,
    value: right ? getNodeText(right, code) : '',
  };
}

const hardcodedSecretDetector: Detector = {
  name: 'hardcoded_secret',
  supportedLanguages: ['javascript', 'typescript', 'python'],

  detect(code: string, _language: Language, tree: Parser.Tree): DetectorResult[] {
    const results: DetectorResult[] = [];
    const root = tree.rootNode;

    const candidateNodes = findNodes(root, [
      'variable_declarator',
      'assignment_expression',
      'assignment',
    ]);

    for (const node of candidateNodes) {
      const { target, value } = getTargetAndValue(node, code);
      if (!target || !isSensitiveName(target)) {
        continue;
      }

      const trimmedValue = value.trim();
      if (!trimmedValue || isEnvironmentAccess(trimmedValue) || !isStringLiteral(trimmedValue)) {
        continue;
      }

      const placeholderHint = /changeme|placeholder|example|dummy|test/i.test(trimmedValue);

      results.push({
        name: 'hardcoded_secret',
        line: getLineNumber(node),
        column: getColumnNumber(node),
        severity: 'error',
        certainty: 'definite',
        confidence: placeholderHint ? 0.75 : 0.95,
        scope: 'module',
        message: `Hardcoded secret assigned to '${target}'`,
        ast_facts: {
          target_name: target,
          value_preview: trimmedValue.slice(0, 40),
          environment_access_boolean: false,
        },
      });
    }

    return results;
  },
};

export default hardcodedSecretDetector;

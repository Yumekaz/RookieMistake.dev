import { Parser } from '../parser';
import { Detector, DetectorResult, Language } from '../types';
import {
  findNodes,
  getNodeText,
  getLineNumber,
  getColumnNumber,
  getEnclosingFunction,
  getFunctionName,
} from '../parser';

const RANDOM_PATTERNS = [
  /\bMath\.random\s*\(/,
  /\brandom\.random\s*\(/,
  /\brandom\.randint\s*\(/,
  /\brandom\.choice\s*\(/,
  /\brandom\.shuffle\s*\(/,
  /\brandom\.randrange\s*\(/,
  /\brandom\.uniform\s*\(/,
];

const SAFE_RANDOM_PATTERNS = [/crypto\.randomUUID\s*\(/, /\bsecrets\./i, /\buuid\.uuid4\s*\(/];

const SENSITIVE_CONTEXT = [
  /token/i,
  /secret/i,
  /password/i,
  /session/i,
  /nonce/i,
  /key/i,
  /id$/i,
  /uuid/i,
];

function isSensitiveContext(text: string): boolean {
  return SENSITIVE_CONTEXT.some((pattern) => pattern.test(text));
}

function getAssignedTarget(node: Parser.SyntaxNode, code: string): string | null {
  let current: Parser.SyntaxNode | null = node.parent;

  while (current) {
    if (current.type === 'variable_declarator') {
      const nameNode = current.childForFieldName('name');
      return nameNode ? getNodeText(nameNode, code) : null;
    }

    if (current.type === 'assignment_expression' || current.type === 'assignment') {
      const left = current.childForFieldName('left');
      if (left) {
        return getNodeText(left, code);
      }
    }

    if (current.type === 'expression_statement' || current.type === 'return_statement') {
      break;
    }

    current = current.parent;
  }

  return null;
}

function getRandomApiName(callText: string): string | null {
  for (const pattern of RANDOM_PATTERNS) {
    const match = callText.match(pattern);
    if (match) {
      return match[0].replace(/\s*\($/, '');
    }
  }
  return null;
}

const insecureRandomnessDetector: Detector = {
  name: 'insecure_randomness',
  supportedLanguages: ['javascript', 'typescript', 'python'],

  detect(code: string, _language: Language, tree: Parser.Tree): DetectorResult[] {
    const results: DetectorResult[] = [];
    const root = tree.rootNode;
    const nodes = findNodes(root, ['call_expression', 'call', 'new_expression']);

    for (const node of nodes) {
      const callText = getNodeText(node, code);
      if (SAFE_RANDOM_PATTERNS.some((pattern) => pattern.test(callText))) {
        continue;
      }

      const apiName = getRandomApiName(callText);
      if (!apiName) {
        continue;
      }

      const target = getAssignedTarget(node, code);
      const enclosingFunction = getEnclosingFunction(node);
      const functionName = enclosingFunction ? getFunctionName(enclosingFunction, code) : null;
      const contextName = [target, functionName].find(
        (value): value is string => Boolean(value && isSensitiveContext(value))
      );

      if (!contextName) {
        continue;
      }

      results.push({
        name: 'insecure_randomness',
        line: getLineNumber(node),
        column: getColumnNumber(node),
        severity: 'warning',
        certainty: 'definite',
        confidence: 0.9,
        scope: 'function',
        message: `Use a cryptographically secure random source for '${contextName}' instead of '${apiName}'`,
        ast_facts: {
          api_name: apiName,
          context_name: contextName,
          target_name: target,
        },
      });
    }

    return results;
  },
};

export default insecureRandomnessDetector;

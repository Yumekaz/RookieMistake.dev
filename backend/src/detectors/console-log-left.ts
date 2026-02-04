import { Parser } from '../parser';
import { Detector, DetectorResult, Language } from '../types';
import {
  findNodes,
  getNodeText,
  findAncestor,
  getEnclosingFunction,
  getLineNumber,
  getColumnNumber,
  walkTree,
} from '../parser';

/**
 * console_log_left detector
 * 
 * Detects console.log/debug/error statements left in code.
 * 
 * Heuristics:
 * - Looks for console.* calls
 * - Excludes calls inside obvious test files or debug conditionals
 * 
 * False positive mitigation:
 * - Ignores console calls inside if (DEBUG) or if (process.env.NODE_ENV...)
 * - Ignores console.error/warn in catch blocks (legitimate error logging)
 * - This is info-level since debug logging is sometimes intentional
 */

const CONSOLE_METHODS = [
  'log',
  'debug',
  'info',
  'warn',
  'error',
  'trace',
  'dir',
  'table',
  'time',
  'timeEnd',
  'group',
  'groupEnd',
  'assert',
];

// Check if inside a debug/test conditional
function isInDebugConditional(node: Parser.SyntaxNode, code: string): boolean {
  let current: Parser.SyntaxNode | null = node.parent;

  while (current) {
    if (current.type === 'if_statement') {
      const condition = current.childForFieldName('condition');
      if (condition) {
        const condText = getNodeText(condition, code).toLowerCase();
        if (
          condText.includes('debug') ||
          condText.includes('node_env') ||
          condText.includes('development') ||
          condText.includes('test') ||
          condText.includes('verbose')
        ) {
          return true;
        }
      }
    }
    current = current.parent;
  }

  return false;
}

// Check if console.error/warn inside a catch block
function isErrorInCatch(node: Parser.SyntaxNode, method: string): boolean {
  if (method !== 'error' && method !== 'warn') {
    return false;
  }

  return findAncestor(node, ['catch_clause', 'except_clause']) !== null;
}

const consoleLogLeftDetector: Detector = {
  name: 'console_log_left',
  supportedLanguages: ['javascript', 'typescript'],

  detect(code: string, language: Language, tree: Parser.Tree): DetectorResult[] {
    const results: DetectorResult[] = [];
    const root = tree.rootNode;

    // Find all call expressions
    const callExprs = findNodes(root, 'call_expression');

    for (const callExpr of callExprs) {
      // Get the function being called
      const funcNode = callExpr.childForFieldName('function');
      if (!funcNode || funcNode.type !== 'member_expression') {
        continue;
      }

      // Check if it's a console call
      const object = funcNode.childForFieldName('object');
      if (!object || getNodeText(object, code) !== 'console') {
        continue;
      }

      // Get the method name
      const property = funcNode.childForFieldName('property');
      if (!property) continue;

      const methodName = getNodeText(property, code);

      // Check if it's a known console method
      if (!CONSOLE_METHODS.includes(methodName)) {
        continue;
      }

      // Skip if in debug conditional
      if (isInDebugConditional(callExpr, code)) {
        continue;
      }

      // Skip console.error/warn in catch blocks
      if (isErrorInCatch(callExpr, methodName)) {
        continue;
      }

      // Get line relative to enclosing function
      const enclosingFunc = getEnclosingFunction(callExpr);
      const lineInFunction = enclosingFunc
        ? getLineNumber(callExpr) - enclosingFunc.startPosition.row
        : getLineNumber(callExpr);

      results.push({
        name: 'console_log_left',
        line: getLineNumber(callExpr),
        column: getColumnNumber(callExpr),
        severity: 'info',
        certainty: 'heuristic',
        confidence: 0.45,
        scope: 'function',
        message: `console.${methodName}() statement found - consider removing before production`,
        ast_facts: {
          method: methodName,
          line_in_function: lineInFunction,
        },
      });
    }

    return results;
  },
};

export default consoleLogLeftDetector;

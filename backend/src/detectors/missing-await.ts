import { Parser } from '../parser';
import { Detector, DetectorResult, Language } from '../types';
import {
  findNodes,
  getNodeText,
  findAncestor,
  isAsyncFunction,
  getEnclosingFunction,
  getLineNumber,
  getColumnNumber,
  walkTree,
} from '../parser';

/**
 * missing_await detector
 * 
 * Detects async function calls that are not awaited.
 * 
 * Heuristics:
 * - Looks for call expressions where the callee is declared as async in the same file
 * - Checks if the parent is not an await_expression
 * - Checks if the call is not chained with .then()/.catch()
 * 
 * False positive mitigation:
 * - Only flags calls to functions that are definitively async in the same file
 * - Does not flag if the result is assigned to a variable (might be intentional Promise handling)
 * - Does not flag if followed by .then() or .catch()
 */

// Track async function names found in the file
function findAsyncFunctions(root: Parser.SyntaxNode, code: string): Set<string> {
  const asyncFunctions = new Set<string>();

  walkTree(root, (node) => {
    // Function declarations
    if (node.type === 'function_declaration') {
      const hasAsync = node.children.some((child) => child.type === 'async');
      if (hasAsync) {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          asyncFunctions.add(getNodeText(nameNode, code));
        }
      }
    }

    // Arrow functions and function expressions assigned to variables
    if (node.type === 'variable_declarator') {
      const value = node.childForFieldName('value');
      if (value && (value.type === 'arrow_function' || value.type === 'function_expression')) {
        // Check parent lexical_declaration for async
        const parent = node.parent;
        if (parent) {
          const hasAsync = parent.children.some((child) => child.type === 'async');
          if (hasAsync || value.children.some((child) => child.type === 'async')) {
            const nameNode = node.childForFieldName('name');
            if (nameNode) {
              asyncFunctions.add(getNodeText(nameNode, code));
            }
          }
        }
      }
    }

    // Method definitions in classes
    if (node.type === 'method_definition') {
      const hasAsync = node.children.some((child) => child.type === 'async');
      if (hasAsync) {
        const nameNode = node.childForFieldName('name');
        if (nameNode) {
          asyncFunctions.add(getNodeText(nameNode, code));
        }
      }
    }
  });

  return asyncFunctions;
}

// Check if a call is chained with .then() or .catch()
function isPromiseChained(callNode: Parser.SyntaxNode): boolean {
  const parent = callNode.parent;
  if (!parent) return false;

  // Check if this call is the object of a member expression that calls .then/.catch
  if (parent.type === 'member_expression') {
    const propertyNode = parent.childForFieldName('property');
    if (propertyNode) {
      const propName = propertyNode.text;
      if (propName === 'then' || propName === 'catch' || propName === 'finally') {
        return true;
      }
    }
  }

  return false;
}

// Check if the call result is assigned (might be intentional)
function isResultAssigned(callNode: Parser.SyntaxNode): boolean {
  let current = callNode.parent;
  while (current) {
    if (
      current.type === 'variable_declarator' ||
      current.type === 'assignment_expression'
    ) {
      return true;
    }
    if (current.type === 'expression_statement') {
      return false;
    }
    current = current.parent;
  }
  return false;
}

const missingAwaitDetector: Detector = {
  name: 'missing_await',
  supportedLanguages: ['javascript', 'typescript'],

  detect(code: string, language: Language, tree: Parser.Tree): DetectorResult[] {
    const results: DetectorResult[] = [];
    const root = tree.rootNode;

    // Find all async functions in the file
    const asyncFunctions = findAsyncFunctions(root, code);

    // Find all call expressions
    const callExpressions = findNodes(root, 'call_expression');

    for (const callNode of callExpressions) {
      // Get the callee
      const functionNode = callNode.childForFieldName('function');
      if (!functionNode) continue;

      // Get the callee name
      let calleeName: string;
      if (functionNode.type === 'identifier') {
        calleeName = getNodeText(functionNode, code);
      } else if (functionNode.type === 'member_expression') {
        // For method calls like obj.method(), get just the method name
        const property = functionNode.childForFieldName('property');
        if (property) {
          calleeName = getNodeText(property, code);
        } else {
          continue;
        }
      } else {
        continue;
      }

      // Check if the callee is a known async function
      if (!asyncFunctions.has(calleeName)) {
        continue;
      }

      // Check if already awaited
      const parent = callNode.parent;
      if (parent && parent.type === 'await_expression') {
        continue;
      }

      // Check if chained with .then()/.catch()
      if (isPromiseChained(callNode)) {
        continue;
      }

      // Check if result is assigned (might be intentional Promise handling)
      if (isResultAssigned(callNode)) {
        continue;
      }

      // Get enclosing function info
      const enclosingFunc = getEnclosingFunction(callNode);
      const enclosingIsAsync = enclosingFunc ? isAsyncFunction(enclosingFunc) : false;

      // Get parent type
      const parentType = parent?.type || 'unknown';

      results.push({
        name: 'missing_await',
        line: getLineNumber(callNode),
        column: getColumnNumber(callNode),
        severity: 'error',
        certainty: 'possible',
        confidence: 0.7,
        scope: 'function',
        message: `Async function '${calleeName}' called without await`,
        ast_facts: {
          callee_name: calleeName,
          enclosing_function_is_async: enclosingIsAsync,
          parent_type: parentType,
        },
      });
    }

    return results;
  },
};

export default missingAwaitDetector;

import { Parser } from '../parser';
import { Detector, DetectorResult, Language } from '../types';
import {
  findNodes,
  getNodeText,
  findAncestor,
  isInsideTryBlock,
  getLineNumber,
  getColumnNumber,
  walkTree,
} from '../parser';

/**
 * no_error_handling detector
 * 
 * Detects async/API calls without proper error handling.
 * 
 * Heuristics:
 * - Looks for await expressions not inside try blocks
 * - Looks for Promise-returning calls without .catch()
 * - Considers fetch, axios, and other common API calls
 * 
 * False positive mitigation:
 * - Ignores calls inside try blocks
 * - Ignores calls that chain .catch()
 * - Only flags clear async/API calls
 */

// Common async/API function names
const ASYNC_FUNCTION_PATTERNS = [
  'fetch',
  'axios',
  'request',
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'query',
  'execute',
  'save',
  'load',
  'read',
  'write',
  'connect',
  'disconnect',
];

// Check if a call expression has .catch() chained
function hasCatchChain(node: Parser.SyntaxNode): boolean {
  let current: Parser.SyntaxNode | null = node.parent;
  
  while (current) {
    if (current.type === 'call_expression') {
      const funcNode = current.childForFieldName('function');
      if (funcNode && funcNode.type === 'member_expression') {
        const property = funcNode.childForFieldName('property');
        if (property) {
          const propName = property.text;
          if (propName === 'catch' || propName === 'finally') {
            return true;
          }
        }
      }
    }
    
    // Check sibling .catch calls on the same line
    if (current.type === 'member_expression') {
      const property = current.childForFieldName('property');
      if (property && (property.text === 'catch' || property.text === 'finally')) {
        return true;
      }
    }
    
    current = current.parent;
  }
  
  return false;
}

// Check if the result is returned (caller's responsibility to handle)
function isReturned(node: Parser.SyntaxNode): boolean {
  let current = node.parent;
  
  while (current) {
    if (current.type === 'return_statement') {
      return true;
    }
    if (current.type === 'expression_statement') {
      break;
    }
    current = current.parent;
  }
  
  return false;
}

const noErrorHandlingDetector: Detector = {
  name: 'no_error_handling',
  supportedLanguages: ['javascript', 'typescript', 'python'],

  detect(code: string, language: Language, tree: Parser.Tree): DetectorResult[] {
    const results: DetectorResult[] = [];
    const root = tree.rootNode;

    if (language === 'javascript' || language === 'typescript') {
      // Find await expressions
      const awaitExprs = findNodes(root, 'await_expression');

      for (const awaitExpr of awaitExprs) {
        // Check if inside try block
        const inTry = isInsideTryBlock(awaitExpr);
        if (inTry) continue;

        // Check if result is returned
        if (isReturned(awaitExpr)) continue;

        // Check if has .catch()
        if (hasCatchChain(awaitExpr)) continue;

        // Get the call expression
        const callExpr = awaitExpr.children.find(
          (child) => child.type === 'call_expression'
        );

        let callText = 'await expression';
        let calleeName = 'unknown';

        if (callExpr) {
          callText = getNodeText(callExpr, code);
          const funcNode = callExpr.childForFieldName('function');
          if (funcNode) {
            if (funcNode.type === 'identifier') {
              calleeName = getNodeText(funcNode, code);
            } else if (funcNode.type === 'member_expression') {
              const property = funcNode.childForFieldName('property');
              if (property) {
                calleeName = property.text || getNodeText(property, code);
              }
            }
          }
        }

        results.push({
          name: 'no_error_handling',
          line: getLineNumber(awaitExpr),
          column: getColumnNumber(awaitExpr),
          severity: 'warning',
          certainty: 'possible',
          confidence: 0.6,
          scope: 'function',
          message: `Async call '${calleeName}' has no error handling`,
          ast_facts: {
            call_text: callText.substring(0, 50),
            enclosing_try_boolean: false,
            callee_name: calleeName,
          },
        });
      }

      // Also check for common async function calls without await or error handling
      const callExprs = findNodes(root, 'call_expression');

      for (const callExpr of callExprs) {
        // Skip if already awaited
        if (callExpr.parent?.type === 'await_expression') continue;

        // Get callee name
        const funcNode = callExpr.childForFieldName('function');
        if (!funcNode) continue;

        let calleeName: string;
        if (funcNode.type === 'identifier') {
          calleeName = getNodeText(funcNode, code);
        } else if (funcNode.type === 'member_expression') {
          const property = funcNode.childForFieldName('property');
          if (property) {
            calleeName = property.text || getNodeText(property, code);
          } else {
            continue;
          }
        } else {
          continue;
        }

        // Check if it's a known async/API function
        const isAsyncCall = ASYNC_FUNCTION_PATTERNS.some(
          (pattern) => calleeName.toLowerCase().includes(pattern.toLowerCase())
        );

        if (!isAsyncCall) continue;

        // Skip if inside try or has .catch
        if (isInsideTryBlock(callExpr)) continue;
        if (hasCatchChain(callExpr)) continue;
        if (isReturned(callExpr)) continue;

        // Skip if result is assigned (might be handled later)
        const parent = callExpr.parent;
        if (
          parent?.type === 'variable_declarator' ||
          parent?.type === 'assignment_expression'
        ) {
          continue;
        }

        const callText = getNodeText(callExpr, code);

        results.push({
          name: 'no_error_handling',
          line: getLineNumber(callExpr),
          column: getColumnNumber(callExpr),
          severity: 'warning',
          certainty: 'possible',
          confidence: 0.55,
          scope: 'function',
          message: `API call '${calleeName}' may need error handling`,
          ast_facts: {
            call_text: callText.substring(0, 50),
            enclosing_try_boolean: false,
            callee_name: calleeName,
          },
        });
      }
    }

    if (language === 'python') {
      // Find await expressions
      const awaitExprs = findNodes(root, 'await');

      for (const awaitExpr of awaitExprs) {
        // Check if inside try block
        const inTry = findAncestor(awaitExpr, 'try_statement') !== null;
        if (inTry) continue;

        const awaitText = getNodeText(awaitExpr, code);

        results.push({
          name: 'no_error_handling',
          line: getLineNumber(awaitExpr),
          column: getColumnNumber(awaitExpr),
          severity: 'warning',
          certainty: 'possible',
          confidence: 0.6,
          scope: 'function',
          message: `Async call has no error handling`,
          ast_facts: {
            call_text: awaitText.substring(0, 50),
            enclosing_try_boolean: false,
            callee_name: 'async call',
          },
        });
      }
    }

    return results;
  },
};

export default noErrorHandlingDetector;

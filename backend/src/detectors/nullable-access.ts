import { Parser } from '../parser';
import { Detector, DetectorResult, Language } from '../types';
import {
  findNodes,
  getNodeText,
  findAncestor,
  getLineNumber,
  getColumnNumber,
  walkTree,
} from '../parser';

/**
 * nullable_access detector
 * 
 * Detects potential access on null/undefined/None values.
 * 
 * Heuristics:
 * - Looks for member/attribute access on variables that are:
 *   1. Parameters (could be null/undefined)
 *   2. Assigned to null/undefined/None earlier in the same scope
 * - Checks if there's a null guard (if statement, optional chaining, etc.)
 * 
 * False positive mitigation:
 * - Ignores access inside conditional blocks that check the variable
 * - Ignores optional chaining (?.)
 * - Only flags if there's clear evidence of nullable assignment
 */

// Track variables assigned to null-like values
function findNullAssignments(
  root: Parser.SyntaxNode,
  code: string,
  language: Language
): Map<string, number> {
  const nullAssignments = new Map<string, number>();

  walkTree(root, (node) => {
    // Variable declarations
    if (node.type === 'variable_declarator') {
      const nameNode = node.childForFieldName('name');
      const valueNode = node.childForFieldName('value');

      if (nameNode && nameNode.type === 'identifier') {
        const name = getNodeText(nameNode, code);
        const value = valueNode ? getNodeText(valueNode, code) : '';

        if (
          value === 'null' ||
          value === 'undefined' ||
          value === 'None' ||
          value === ''
        ) {
          nullAssignments.set(name, node.startPosition.row + 1);
        }
      }
    }

    // Assignment expressions
    if (node.type === 'assignment_expression') {
      const left = node.childForFieldName('left');
      const right = node.childForFieldName('right');

      if (left && left.type === 'identifier' && right) {
        const name = getNodeText(left, code);
        const value = getNodeText(right, code);

        if (value === 'null' || value === 'undefined' || value === 'None') {
          nullAssignments.set(name, node.startPosition.row + 1);
        }
      }
    }

    // Python assignments
    if (node.type === 'assignment') {
      const left = node.childForFieldName('left');
      const right = node.childForFieldName('right');

      if (left && left.type === 'identifier' && right) {
        const name = getNodeText(left, code);
        const value = getNodeText(right, code);

        if (value === 'None') {
          nullAssignments.set(name, node.startPosition.row + 1);
        }
      }
    }
  });

  return nullAssignments;
}

// Get function/method parameters
function getParameters(root: Parser.SyntaxNode, code: string): Set<string> {
  const params = new Set<string>();

  walkTree(root, (node) => {
    if (
      node.type === 'formal_parameters' ||
      node.type === 'parameters'
    ) {
      for (const child of node.children) {
        if (child.type === 'identifier') {
          params.add(getNodeText(child, code));
        } else if (
          child.type === 'required_parameter' ||
          child.type === 'optional_parameter'
        ) {
          const nameNode = child.childForFieldName('pattern') || child.children[0];
          if (nameNode && nameNode.type === 'identifier') {
            params.add(getNodeText(nameNode, code));
          }
        }
      }
    }
  });

  return params;
}

// Check if a member access uses optional chaining
function isOptionalChaining(node: Parser.SyntaxNode): boolean {
  if (node.type === 'optional_chain_expression') {
    return true;
  }
  // Check for ?. in the text
  const nodeText = node.text;
  return nodeText.includes('?.');
}

// Check if the access is guarded by a null check
function hasNullGuard(
  memberAccess: Parser.SyntaxNode,
  targetName: string,
  code: string
): boolean {
  // Look for parent if statement
  let current: Parser.SyntaxNode | null = memberAccess.parent;
  while (current) {
    if (current.type === 'if_statement') {
      const condition = current.childForFieldName('condition');
      if (condition) {
        const condText = getNodeText(condition, code);
        // Check if the condition tests the target variable
        if (
          condText.includes(targetName) &&
          !condText.includes(`${targetName} ==`) &&
          !condText.includes(`${targetName} !=`)
        ) {
          return true;
        }
        // Check for explicit null checks
        if (
          condText.includes(`${targetName} !== null`) ||
          condText.includes(`${targetName} !== undefined`) ||
          condText.includes(`${targetName} != null`) ||
          condText.includes(`${targetName} is not None`)
        ) {
          return true;
        }
      }
    }
    
    // Ternary/conditional expression check
    if (current.type === 'ternary_expression' || current.type === 'conditional_expression') {
      const condition = current.childForFieldName('condition');
      if (condition) {
        const condText = getNodeText(condition, code);
        if (condText.includes(targetName)) {
          return true;
        }
      }
    }
    
    current = current.parent;
  }

  return false;
}

const nullableAccessDetector: Detector = {
  name: 'nullable_access',
  supportedLanguages: ['javascript', 'typescript', 'python'],

  detect(code: string, language: Language, tree: Parser.Tree): DetectorResult[] {
    const results: DetectorResult[] = [];
    const root = tree.rootNode;

    // Find null assignments and parameters
    const nullAssignments = findNullAssignments(root, code, language);
    const parameters = getParameters(root, code);

    // Find member access expressions
    const memberExpressions = findNodes(root, [
      'member_expression',
      'subscript_expression',
      'attribute',
    ]);

    for (const member of memberExpressions) {
      // Skip if using optional chaining
      if (isOptionalChaining(member)) {
        continue;
      }

      // Get the object being accessed
      const objectNode =
        member.childForFieldName('object') || member.children[0];
      if (!objectNode || objectNode.type !== 'identifier') {
        continue;
      }

      const targetName = getNodeText(objectNode, code);

      // Check if it's a potentially nullable variable
      const assignedNull = nullAssignments.has(targetName);
      const isParameter = parameters.has(targetName);

      if (!assignedNull && !isParameter) {
        continue;
      }

      // Check if there's a null guard
      const hasGuard = hasNullGuard(member, targetName, code);

      if (hasGuard) {
        continue;
      }

      const isDefinite = assignedNull;
      const certainty = isDefinite ? 'definite' : 'possible';
      const severity = isDefinite ? 'error' : 'warning';
      const nullLabel = language === 'python' ? 'None' : 'null/undefined';

      results.push({
        name: 'nullable_access',
        line: getLineNumber(member),
        column: getColumnNumber(member),
        severity,
        certainty,
        confidence: isDefinite ? 0.9 : 0.6,
        scope: 'function',
        message: `${isDefinite ? 'Definite' : 'Potential'} access on ${nullLabel}: '${targetName}'`,
        ast_facts: {
          target_identifier: targetName,
          guard_present_boolean: false,
          assigned_null_like_before: assignedNull,
        },
      });
    }

    return results;
  },
};

export default nullableAccessDetector;

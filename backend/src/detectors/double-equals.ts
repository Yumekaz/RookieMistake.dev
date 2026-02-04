import { Parser } from '../parser';
import { Detector, DetectorResult, Language } from '../types';
import { findNodes, getNodeText, getLineNumber, getColumnNumber } from '../parser';

/**
 * double_equals detector
 * 
 * Detects usage of == or != instead of === or !==.
 * 
 * Heuristics:
 * - Detects all binary expressions with == or != operators
 * - No false positive mitigation needed as this is always worth flagging
 * 
 * Note: This is a style warning, not an error, since there are rare
 * legitimate uses of loose equality (e.g., null == undefined check)
 */

const doubleEqualsDetector: Detector = {
  name: 'double_equals',
  supportedLanguages: ['javascript', 'typescript'],

  detect(code: string, language: Language, tree: Parser.Tree): DetectorResult[] {
    const results: DetectorResult[] = [];
    const root = tree.rootNode;

    // Find all binary expressions
    const binaryExpressions = findNodes(root, 'binary_expression');

    for (const binExpr of binaryExpressions) {
      // Get the operator
      const operatorNode = binExpr.children.find(
        (child) => child.type === '==' || child.type === '!='
      );

      if (!operatorNode) continue;

      const operator = operatorNode.type;

      // Get left and right operands
      const left = binExpr.childForFieldName('left');
      const right = binExpr.childForFieldName('right');

      if (!left || !right) continue;

      const leftText = getNodeText(left, code);
      const rightText = getNodeText(right, code);

      // Generate message based on operator
      const strictOperator = operator === '==' ? '===' : '!==';

      results.push({
        name: 'double_equals',
        line: getLineNumber(operatorNode),
        column: getColumnNumber(operatorNode),
        severity: 'warning',
        certainty: 'possible',
        confidence: 0.6,
        scope: 'local',
        message: `Use '${strictOperator}' instead of '${operator}' for strict comparison`,
        ast_facts: {
          operator,
          left_text: leftText,
          right_text: rightText,
        },
      });
    }

    return results;
  },
};

export default doubleEqualsDetector;

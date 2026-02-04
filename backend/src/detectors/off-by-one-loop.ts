import { Parser } from '../parser';
import { Detector, DetectorResult, Language } from '../types';
import { findNodes, getNodeText, getLineNumber, getColumnNumber } from '../parser';

/**
 * off_by_one_loop detector
 * 
 * Detects loop conditions that use <= with .length/len() which causes
 * out-of-bounds access.
 * 
 * Heuristics:
 * - Looks for for loops with condition like i <= arr.length
 * - Also detects Python range(len(arr) + 1) pattern
 * 
 * False positive mitigation:
 * - Only flags when <= is used with .length or len()
 * - Does not flag if the condition uses a custom variable
 */

const offByOneLoopDetector: Detector = {
  name: 'off_by_one_loop',
  supportedLanguages: ['javascript', 'typescript', 'python'],

  detect(code: string, language: Language, tree: Parser.Tree): DetectorResult[] {
    const results: DetectorResult[] = [];
    const root = tree.rootNode;

    if (language === 'javascript' || language === 'typescript') {
      // Find for statements
      const forStatements = findNodes(root, 'for_statement');

      for (const forStmt of forStatements) {
        // Get the condition part
        const condition = forStmt.childForFieldName('condition');
        if (!condition) continue;

        // Look for binary expressions with <= operator
        const binaryExprs = findNodes(condition, 'binary_expression');

        for (const binExpr of binaryExprs) {
          const operatorNode = binExpr.children.find(
            (child) => child.type === '<=' || child.type === '>='
          );

          if (!operatorNode) continue;

          const operator = operatorNode.type;

          // Get the right operand for <=, left for >=
          const arrayExpr =
            operator === '<='
              ? binExpr.childForFieldName('right')
              : binExpr.childForFieldName('left');

          if (!arrayExpr) continue;

          const exprText = getNodeText(arrayExpr, code);

          // Check if it references .length
          if (exprText.includes('.length')) {
            results.push({
              name: 'off_by_one_loop',
              line: getLineNumber(binExpr),
              column: getColumnNumber(operatorNode),
              severity: 'warning',
              certainty: 'possible',
              confidence: 0.65,
              scope: 'function',
              message: `Loop condition uses '${operator}' with array length, which will access out-of-bounds index`,
              ast_facts: {
                loop_type: 'for',
                condition_operator: operator,
                array_expr_text: exprText,
              },
            });
          }
        }
      }

      // Also check while loops
      const whileStatements = findNodes(root, 'while_statement');

      for (const whileStmt of whileStatements) {
        const condition = whileStmt.childForFieldName('condition');
        if (!condition) continue;

        const condText = getNodeText(condition, code);

        // Check for <= .length pattern
        if (
          (condText.includes('<=') && condText.includes('.length')) ||
          (condText.includes('>=') && condText.includes('.length'))
        ) {
          const operator = condText.includes('<=') ? '<=' : '>=';

          results.push({
            name: 'off_by_one_loop',
            line: getLineNumber(condition),
            column: getColumnNumber(condition),
            severity: 'warning',
            certainty: 'possible',
            confidence: 0.6,
            scope: 'function',
            message: `Loop condition uses '${operator}' with array length, which may cause out-of-bounds access`,
            ast_facts: {
              loop_type: 'while',
              condition_operator: operator,
              array_expr_text: condText,
            },
          });
        }
      }
    }

    if (language === 'python') {
      // Find for statements
      const forStatements = findNodes(root, 'for_statement');

      for (const forStmt of forStatements) {
        // Look for range() calls in the iterable
        const right = forStmt.childForFieldName('right');
        if (!right) continue;

        const rightText = getNodeText(right, code);

        // Check for range(len(arr) + 1) pattern
        if (
          rightText.includes('range') &&
          rightText.includes('len') &&
          rightText.includes('+ 1')
        ) {
          results.push({
            name: 'off_by_one_loop',
            line: getLineNumber(right),
            column: getColumnNumber(right),
            severity: 'warning',
            certainty: 'possible',
            confidence: 0.7,
            scope: 'function',
            message: `Loop uses 'range(len(...) + 1)' which iterates one too many times`,
            ast_facts: {
              loop_type: 'for',
              condition_operator: 'range+1',
              array_expr_text: rightText,
            },
          });
        }

        // Check for range(0, len(arr) + 1) pattern
        if (
          rightText.includes('range') &&
          rightText.includes('len') &&
          (rightText.includes(', len') || rightText.includes(',len'))
        ) {
          // Look for + 1 in the range call
          const callExpr = findNodes(right, 'call')[0];
          if (callExpr) {
            const args = callExpr.childForFieldName('arguments');
            if (args) {
              const argsText = getNodeText(args, code);
              if (argsText.includes('+ 1')) {
                results.push({
                  name: 'off_by_one_loop',
                  line: getLineNumber(right),
                  column: getColumnNumber(right),
                  severity: 'warning',
                  certainty: 'possible',
                  confidence: 0.7,
                  scope: 'function',
                  message: `Loop range includes 'len(...) + 1' which iterates one too many times`,
                  ast_facts: {
                    loop_type: 'for',
                    condition_operator: 'range+1',
                    array_expr_text: rightText,
                  },
                });
              }
            }
          }
        }
      }
    }

    return results;
  },
};

export default offByOneLoopDetector;

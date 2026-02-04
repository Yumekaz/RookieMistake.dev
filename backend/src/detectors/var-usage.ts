import { Parser } from '../parser';
import { Detector, DetectorResult, Language } from '../types';
import { findNodes, getNodeText, getLineNumber, getColumnNumber, walkTree } from '../parser';

/**
 * var_usage detector
 * 
 * Detects usage of `var` declarations instead of `let` or `const`.
 * 
 * Heuristics:
 * - Flags all variable_declaration nodes that use `var`
 * - Extracts variable names for the message
 * 
 * False positive mitigation:
 * - None needed - var is always worth flagging in modern JS
 * - This is an info-level warning, not an error
 */

const varUsageDetector: Detector = {
  name: 'var_usage',
  supportedLanguages: ['javascript'],

  detect(code: string, language: Language, tree: Parser.Tree): DetectorResult[] {
    const results: DetectorResult[] = [];
    const root = tree.rootNode;

    // Find all variable declarations
    const varDeclarations = findNodes(root, 'variable_declaration');

    for (const varDecl of varDeclarations) {
      // Check if it's a var declaration (not let or const)
      const firstChild = varDecl.children[0];
      if (!firstChild || firstChild.text !== 'var') {
        continue;
      }

      // Get the variable names
      const variableNames: string[] = [];
      walkTree(varDecl, (node) => {
        if (node.type === 'variable_declarator') {
          const nameNode = node.childForFieldName('name');
          if (nameNode && nameNode.type === 'identifier') {
            variableNames.push(getNodeText(nameNode, code));
          }
        }
      });

      if (variableNames.length === 0) continue;

      results.push({
        name: 'var_usage',
        line: getLineNumber(varDecl),
        column: getColumnNumber(varDecl),
        severity: 'info',
        certainty: 'heuristic',
        confidence: 0.45,
        scope: 'function',
        message: `Use 'let' or 'const' instead of 'var' for: ${variableNames.join(', ')}`,
        ast_facts: {
          variable_names: variableNames,
          declaration_line: getLineNumber(varDecl),
        },
      });
    }

    return results;
  },
};

export default varUsageDetector;

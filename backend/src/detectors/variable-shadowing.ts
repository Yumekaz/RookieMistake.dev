import { Parser } from '../parser';
import { Detector, DetectorResult, Language } from '../types';
import { getNodeText } from '../parser';

/**
 * variable_shadowing detector
 * 
 * Detects inner-scope variables that shadow outer-scope variables.
 * 
 * Heuristics:
 * - Builds a scope tree and tracks variable declarations
 * - Flags when a variable in an inner scope has the same name as one in an outer scope
 * 
 * False positive mitigation:
 * - Ignores common intentional patterns like loop variables (i, j, k)
 * - Ignores callback parameters that commonly shadow (e.g., 'err', 'error')
 */

// Common variable names that are often intentionally shadowed
const IGNORED_NAMES = new Set(['i', 'j', 'k', '_', 'err', 'error', 'e']);

// Get scope-creating node types
function isScopeNode(node: Parser.SyntaxNode, language: Language): boolean {
  const scopeTypes: string[] = [
    'function_declaration',
    'function_expression',
    'arrow_function',
    'method_definition',
    'class_declaration',
    'class_body',
    'for_statement',
    'for_in_statement',
    'while_statement',
    'do_statement',
    'if_statement',
    'switch_statement',
    'try_statement',
    'catch_clause',
    'block_statement',
    'statement_block',
  ];

  if (language === 'python') {
    scopeTypes.push(
      'function_definition',
      'class_definition',
      'for_statement',
      'while_statement',
      'with_statement',
      'if_statement',
      'try_statement',
      'except_clause'
    );
  }

  return scopeTypes.includes(node.type);
}

const variableShadowingDetector: Detector = {
  name: 'variable_shadowing',
  supportedLanguages: ['javascript', 'typescript', 'python'],

  detect(code: string, language: Language, tree: Parser.Tree): DetectorResult[] {
    const results: DetectorResult[] = [];
    const root = tree.rootNode;

    // Track all declarations with their scope depth
    const declarations: Array<{
      name: string;
      line: number;
      column: number;
      node: Parser.SyntaxNode;
      scopeDepth: number;
    }> = [];

    function collectDeclarations(
      node: Parser.SyntaxNode,
      scopeDepth: number
    ): void {
      let currentDepth = scopeDepth;

      if (isScopeNode(node, language) && node !== root) {
        currentDepth++;
      }

      // Variable declarations
      if (node.type === 'variable_declarator') {
        const nameNode = node.childForFieldName('name');
        if (nameNode && nameNode.type === 'identifier') {
          const name = getNodeText(nameNode, code);
          declarations.push({
            name,
            line: nameNode.startPosition.row + 1,
            column: nameNode.startPosition.column + 1,
            node: nameNode,
            scopeDepth: currentDepth,
          });
        }
      }

      // Parameters
      if (node.type === 'identifier' && node.parent) {
        const parentType = node.parent.type;
        if (
          parentType === 'formal_parameters' ||
          parentType === 'required_parameter' ||
          parentType === 'optional_parameter' ||
          parentType === 'parameters'
        ) {
          const name = getNodeText(node, code);
          declarations.push({
            name,
            line: node.startPosition.row + 1,
            column: node.startPosition.column + 1,
            node,
            scopeDepth: currentDepth,
          });
        }
      }

      for (const child of node.children) {
        collectDeclarations(child, currentDepth);
      }
    }

    collectDeclarations(root, 0);

    // Group declarations by name
    const byName = new Map<string, typeof declarations>();
    for (const decl of declarations) {
      if (!byName.has(decl.name)) {
        byName.set(decl.name, []);
      }
      byName.get(decl.name)!.push(decl);
    }

    // Find shadowing
    for (const [name, decls] of byName.entries()) {
      // Skip ignored names
      if (IGNORED_NAMES.has(name)) {
        continue;
      }

      // Sort by scope depth, then by line
      decls.sort((a, b) => a.scopeDepth - b.scopeDepth || a.line - b.line);

      // Check for shadowing
      for (let i = 1; i < decls.length; i++) {
        const inner = decls[i];
        const outer = decls[0]; // First declaration at shallowest depth

        if (inner.scopeDepth > outer.scopeDepth) {
          const scopesBetween = inner.scopeDepth - outer.scopeDepth;

          results.push({
            name: 'variable_shadowing',
            line: inner.line,
            column: inner.column,
            severity: 'warning',
            certainty: 'definite',
            confidence: 0.85,
            scope: 'function',
            message: `Variable '${name}' shadows outer declaration from line ${outer.line}`,
            ast_facts: {
              name,
              outer_declaration_line: outer.line,
              inner_declaration_line: inner.line,
              scopes_between: scopesBetween,
            },
          });
        }
      }
    }

    return results;
  },
};

export default variableShadowingDetector;

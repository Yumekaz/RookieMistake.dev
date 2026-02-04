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

interface ScopeInfo {
  node: Parser.SyntaxNode;
  variables: Map<string, number>; // name -> line number
  parent: ScopeInfo | null;
}

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

// Build scope tree and collect declarations
function buildScopeTree(
  root: Parser.SyntaxNode,
  code: string,
  language: Language
): ScopeInfo {
  const rootScope: ScopeInfo = {
    node: root,
    variables: new Map(),
    parent: null,
  };

  function processNode(node: Parser.SyntaxNode, currentScope: ScopeInfo): void {
    // Check if this node creates a new scope
    let scope = currentScope;
    if (isScopeNode(node, language) && node !== root) {
      scope = {
        node,
        variables: new Map(),
        parent: currentScope,
      };
    }

    // Record variable declarations
    if (node.type === 'variable_declarator') {
      const nameNode = node.childForFieldName('name');
      if (nameNode && nameNode.type === 'identifier') {
        const name = getNodeText(nameNode, code);
        scope.variables.set(name, nameNode.startPosition.row + 1);
      }
    }

    // Function parameters
    if (node.type === 'formal_parameters' || node.type === 'parameters') {
      for (const child of node.children) {
        if (child.type === 'identifier') {
          const name = getNodeText(child, code);
          scope.variables.set(name, child.startPosition.row + 1);
        } else if (
          child.type === 'required_parameter' ||
          child.type === 'optional_parameter'
        ) {
          const nameNode = child.childForFieldName('pattern') || child.children[0];
          if (nameNode && nameNode.type === 'identifier') {
            const name = getNodeText(nameNode, code);
            scope.variables.set(name, nameNode.startPosition.row + 1);
          }
        }
      }
    }

    // Python parameters
    if (node.type === 'parameters') {
      walkTree(node, (paramNode) => {
        if (paramNode.type === 'identifier' && paramNode.parent?.type !== 'attribute') {
          const name = getNodeText(paramNode, code);
          scope.variables.set(name, paramNode.startPosition.row + 1);
        }
      });
    }

    // For loop variables
    if (node.type === 'for_statement' || node.type === 'for_in_statement') {
      const init = node.childForFieldName('initializer') || node.childForFieldName('left');
      if (init) {
        walkTree(init, (initNode) => {
          if (initNode.type === 'identifier') {
            const name = getNodeText(initNode, code);
            scope.variables.set(name, initNode.startPosition.row + 1);
          }
        });
      }
    }

    // Recurse into children
    for (const child of node.children) {
      processNode(child, scope);
    }
  }

  processNode(root, rootScope);
  return rootScope;
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

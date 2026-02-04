import Parser from 'web-tree-sitter';
import { Language } from './types';
import * as path from 'path';

// Store initialized parser and languages
let parserInitialized = false;
let jsLanguage: Parser.Language | null = null;
let tsLanguage: Parser.Language | null = null;
let pyLanguage: Parser.Language | null = null;

// WASM file paths - bundled with tree-sitter-wasms package
const WASM_DIR = path.join(__dirname, '..', 'node_modules', 'tree-sitter-wasms', 'out');

/**
 * Get WASM file path for a language
 */
function getWasmPath(lang: string): string {
  return path.join(WASM_DIR, `tree-sitter-${lang}.wasm`);
}

/**
 * Initialize the parser and load all language grammars
 */
export async function initParser(): Promise<void> {
  if (parserInitialized) {
    return;
  }
  
  await Parser.init();
  
  // Load language grammars from bundled WASM files
  jsLanguage = await Parser.Language.load(getWasmPath('javascript'));
  tsLanguage = await Parser.Language.load(getWasmPath('typescript'));
  pyLanguage = await Parser.Language.load(getWasmPath('python'));
  
  parserInitialized = true;
  console.log('Parser initialized with all language grammars');
}

/**
 * Get a parser configured for a specific language
 */
export function getParser(language: Language): Parser {
  if (!parserInitialized) {
    throw new Error('Parser not initialized. Call initParser() first.');
  }
  
  const parser = new Parser();
  
  switch (language) {
    case 'javascript':
      parser.setLanguage(jsLanguage!);
      break;
    case 'typescript':
      parser.setLanguage(tsLanguage!);
      break;
    case 'python':
      parser.setLanguage(pyLanguage!);
      break;
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
  
  return parser;
}

/**
 * Parse code and return the syntax tree
 */
export function parseCode(code: string, language: Language): Parser.Tree {
  const parser = getParser(language);
  return parser.parse(code);
}

/**
 * Get the text of a node from the source code
 */
export function getNodeText(node: Parser.SyntaxNode, code: string): string {
  return code.slice(node.startIndex, node.endIndex);
}

/**
 * Walk the tree and call visitor for each node
 */
export function walkTree(
  node: Parser.SyntaxNode,
  visitor: (node: Parser.SyntaxNode) => void
): void {
  visitor(node);
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) {
      walkTree(child, visitor);
    }
  }
}

/**
 * Find all nodes of a specific type
 */
export function findNodes(
  root: Parser.SyntaxNode,
  type: string | string[]
): Parser.SyntaxNode[] {
  const types = Array.isArray(type) ? type : [type];
  const results: Parser.SyntaxNode[] = [];
  
  walkTree(root, (node) => {
    if (types.includes(node.type)) {
      results.push(node);
    }
  });
  
  return results;
}

/**
 * Find the nearest ancestor of a specific type
 */
export function findAncestor(
  node: Parser.SyntaxNode,
  type: string | string[]
): Parser.SyntaxNode | null {
  const types = Array.isArray(type) ? type : [type];
  let current = node.parent;
  
  while (current) {
    if (types.includes(current.type)) {
      return current;
    }
    current = current.parent;
  }
  
  return null;
}

/**
 * Check if a node is inside a node of a specific type
 */
export function isInsideNodeType(
  node: Parser.SyntaxNode,
  type: string | string[]
): boolean {
  return findAncestor(node, type) !== null;
}

/**
 * Get the enclosing function for a node
 */
export function getEnclosingFunction(
  node: Parser.SyntaxNode
): Parser.SyntaxNode | null {
  return findAncestor(node, [
    'function_declaration',
    'function_expression',
    'arrow_function',
    'method_definition',
    'function_definition', // Python
  ]);
}

/**
 * Check if a function is async (JS/TS)
 */
export function isAsyncFunction(node: Parser.SyntaxNode): boolean {
  // Check for async keyword in function declaration
  if (node.type === 'function_declaration' || 
      node.type === 'function_expression' ||
      node.type === 'method_definition') {
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === 'async') {
        return true;
      }
    }
  }
  
  // Arrow functions
  if (node.type === 'arrow_function') {
    const parent = node.parent;
    if (parent && parent.type === 'variable_declarator') {
      // Check siblings for async keyword
      const grandparent = parent.parent;
      if (grandparent) {
        for (let i = 0; i < grandparent.childCount; i++) {
          const child = grandparent.child(i);
          if (child && child.type === 'async') {
            return true;
          }
        }
      }
    }
  }
  
  // Check the raw text for 'async' prefix
  const firstChild = node.child(0);
  if (firstChild && firstChild.type === 'async') {
    return true;
  }
  
  return false;
}

/**
 * Get the name of a function node
 */
export function getFunctionName(node: Parser.SyntaxNode, code: string): string | null {
  if (node.type === 'function_declaration' || node.type === 'function_definition') {
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      return getNodeText(nameNode, code);
    }
  }
  
  if (node.type === 'method_definition') {
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      return getNodeText(nameNode, code);
    }
  }
  
  // Variable declarator with function expression
  if (node.type === 'arrow_function' || node.type === 'function_expression') {
    const parent = node.parent;
    if (parent && parent.type === 'variable_declarator') {
      const nameNode = parent.childForFieldName('name');
      if (nameNode) {
        return getNodeText(nameNode, code);
      }
    }
  }
  
  return null;
}

/**
 * Get all variable declarations in a scope
 */
export function getVariableDeclarations(
  root: Parser.SyntaxNode,
  code: string
): Map<string, Parser.SyntaxNode> {
  const declarations = new Map<string, Parser.SyntaxNode>();
  
  // JS/TS declarations
  const declarators = findNodes(root, ['variable_declarator', 'parameter']);
  for (const decl of declarators) {
    const nameNode = decl.childForFieldName('name') || decl.child(0);
    if (nameNode && nameNode.type === 'identifier') {
      const name = getNodeText(nameNode, code);
      declarations.set(name, decl);
    }
  }
  
  return declarations;
}

/**
 * Check if a node is a call expression
 */
export function isCallExpression(node: Parser.SyntaxNode): boolean {
  return node.type === 'call_expression' || node.type === 'call';
}

/**
 * Get the callee of a call expression
 */
export function getCallee(
  node: Parser.SyntaxNode,
  code: string
): { name: string; node: Parser.SyntaxNode } | null {
  if (!isCallExpression(node)) {
    return null;
  }
  
  const functionNode = node.childForFieldName('function');
  if (functionNode) {
    const name = getNodeText(functionNode, code);
    return { name, node: functionNode };
  }
  
  // Fallback for different AST structures
  const firstChild = node.child(0);
  if (firstChild) {
    const name = getNodeText(firstChild, code);
    return { name, node: firstChild };
  }
  
  return null;
}

/**
 * Check if node is inside a try block
 */
export function isInsideTryBlock(node: Parser.SyntaxNode): boolean {
  return isInsideNodeType(node, ['try_statement']);
}

/**
 * Get line number (1-indexed)
 */
export function getLineNumber(node: Parser.SyntaxNode): number {
  return node.startPosition.row + 1;
}

/**
 * Get column number (1-indexed)
 */
export function getColumnNumber(node: Parser.SyntaxNode): number {
  return node.startPosition.column + 1;
}

// Export Parser type for use in detectors
export { Parser };

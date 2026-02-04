import { Parser } from '../parser';
import { Detector, DetectorResult, Language } from '../types';
import { findNodes, getNodeText, getLineNumber, getColumnNumber, walkTree } from '../parser';

/**
 * empty_catch detector
 * 
 * Detects empty catch blocks or catch blocks with only pass/comments.
 * 
 * Heuristics:
 * - Finds catch_clause and except_clause nodes
 * - Checks if the body is empty or only contains comments/pass
 * 
 * False positive mitigation:
 * - Allows catch blocks that have at least one meaningful statement
 * - Counts comments but still warns if comments are the only content
 */

// Check if a block is empty or contains only trivial content
function isEmptyOrTrivialBlock(
  blockNode: Parser.SyntaxNode | null,
  code: string,
  language: Language
): { isEmpty: boolean; summary: string } {
  if (!blockNode) {
    return { isEmpty: true, summary: 'empty' };
  }

  let statementCount = 0;
  let hasCommentOnly = false;
  let hasPass = false;

  walkTree(blockNode, (node) => {
    // Skip the block node itself and structural nodes
    if (
      node === blockNode ||
      node.type === '{' ||
      node.type === '}' ||
      node.type === ':' ||
      node.type === 'indent' ||
      node.type === 'dedent' ||
      node.type === 'NEWLINE' ||
      node.type === 'INDENT' ||
      node.type === 'DEDENT'
    ) {
      return;
    }

    // Check for comments
    if (node.type === 'comment' || node.type === 'line_comment' || node.type === 'block_comment') {
      hasCommentOnly = true;
      return;
    }

    // Check for Python pass
    if (node.type === 'pass_statement') {
      hasPass = true;
      return;
    }

    // Check for expression statements (might be comments in some parsers)
    if (node.type === 'expression_statement') {
      const text = getNodeText(node, code).trim();
      if (text.startsWith('//') || text.startsWith('#') || text.startsWith('/*')) {
        hasCommentOnly = true;
        return;
      }
    }

    // Count actual statements
    if (
      node.type === 'expression_statement' ||
      node.type === 'return_statement' ||
      node.type === 'throw_statement' ||
      node.type === 'if_statement' ||
      node.type === 'for_statement' ||
      node.type === 'while_statement' ||
      node.type === 'variable_declaration' ||
      node.type === 'lexical_declaration' ||
      node.type === 'assignment_expression' ||
      node.type === 'call_expression' ||
      node.type === 'raise_statement'
    ) {
      statementCount++;
    }
  });

  if (statementCount === 0) {
    if (hasPass) {
      return { isEmpty: true, summary: 'only pass' };
    }
    if (hasCommentOnly) {
      return { isEmpty: true, summary: 'only comments' };
    }
    return { isEmpty: true, summary: 'empty' };
  }

  return { isEmpty: false, summary: `${statementCount} statement(s)` };
}

// Get the catch parameter name
function getCatchParam(catchNode: Parser.SyntaxNode, code: string): string | null {
  // JS/TS: catch_clause has a pattern or identifier
  const pattern = catchNode.childForFieldName('parameter');
  if (pattern) {
    return getNodeText(pattern, code);
  }

  // Look for identifier child
  for (const child of catchNode.children) {
    if (child.type === 'identifier') {
      return getNodeText(child, code);
    }
  }

  // Python: except_clause may have an identifier
  const name = catchNode.childForFieldName('name');
  if (name) {
    return getNodeText(name, code);
  }

  return null;
}

const emptyCatchDetector: Detector = {
  name: 'empty_catch',
  supportedLanguages: ['javascript', 'typescript', 'python'],

  detect(code: string, language: Language, tree: Parser.Tree): DetectorResult[] {
    const results: DetectorResult[] = [];
    const root = tree.rootNode;

    // Find catch clauses (JS/TS)
    const catchClauses = findNodes(root, ['catch_clause', 'except_clause']);

    for (const catchNode of catchClauses) {
      // Get the body
      let body: Parser.SyntaxNode | null = null;

      if (language === 'python') {
        // Python: the body is the block after the except clause
        body = catchNode.childForFieldName('body');
        if (!body) {
          // Try to find block child
          for (const child of catchNode.children) {
            if (child.type === 'block') {
              body = child;
              break;
            }
          }
        }
      } else {
        // JS/TS: body is a statement_block
        body = catchNode.childForFieldName('body');
        if (!body) {
          for (const child of catchNode.children) {
            if (child.type === 'statement_block') {
              body = child;
              break;
            }
          }
        }
      }

      const { isEmpty, summary } = isEmptyOrTrivialBlock(body, code, language);

      if (!isEmpty) continue;

      const catchParam = getCatchParam(catchNode, code);

      results.push({
        name: 'empty_catch',
        line: getLineNumber(catchNode),
        column: getColumnNumber(catchNode),
        severity: 'warning',
        certainty: 'heuristic',
        confidence: 0.5,
        scope: 'function',
        message: `Empty catch block (${summary}) silently swallows errors`,
        ast_facts: {
          catch_body_summary: summary,
          catch_param: catchParam || 'error',
        },
      });
    }

    return results;
  },
};

export default emptyCatchDetector;

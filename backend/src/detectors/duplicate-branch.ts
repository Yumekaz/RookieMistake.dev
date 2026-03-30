import { Parser } from '../parser';
import { Detector, DetectorResult, Language } from '../types';
import { findNodes, getNodeText, getLineNumber, getColumnNumber } from '../parser';

function normalizeBranchText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function getNodeByFieldOrChild(
  node: Parser.SyntaxNode,
  field: string,
  fallbackTypes: string[]
): Parser.SyntaxNode | null {
  const fieldNode = node.childForFieldName(field);
  if (fieldNode) {
    return fieldNode;
  }

  for (const child of node.children) {
    if (fallbackTypes.includes(child.type)) {
      return child;
    }
  }

  return null;
}

function getBranchBody(node: Parser.SyntaxNode): Parser.SyntaxNode {
  if (node.type === 'else_clause' || node.type === 'elif_clause') {
    const bodyChild = node.children.find(
      (child) => child.type === 'statement_block' || child.type === 'block' || child.type === 'suite'
    );
    if (bodyChild) {
      return bodyChild;
    }
  }

  return node;
}

const duplicateBranchDetector: Detector = {
  name: 'duplicate_branch',
  supportedLanguages: ['javascript', 'typescript', 'python'],

  detect(code: string, _language: Language, tree: Parser.Tree): DetectorResult[] {
    const results: DetectorResult[] = [];
    const root = tree.rootNode;

    for (const ifNode of findNodes(root, 'if_statement')) {
      const condition = ifNode.childForFieldName('condition');
      const consequence = getNodeByFieldOrChild(ifNode, 'consequence', [
        'statement_block',
        'block',
        'suite',
      ]);
      const alternative = ifNode.childForFieldName('alternative');

      if (!consequence || !alternative) {
        continue;
      }

      const conditionText = condition ? normalizeBranchText(getNodeText(condition, code)) : '';
      const consequenceText = normalizeBranchText(getNodeText(consequence, code));
      const alternativeText = normalizeBranchText(getNodeText(getBranchBody(alternative), code));

      if (!consequenceText || !alternativeText) {
        continue;
      }

      if (alternative.type === 'if_statement') {
        const alternativeCondition = alternative.childForFieldName('condition');
        const alternativeConditionText = alternativeCondition
          ? normalizeBranchText(getNodeText(alternativeCondition, code))
          : '';

        if (conditionText && conditionText === alternativeConditionText) {
          results.push({
            name: 'duplicate_branch',
            line: getLineNumber(ifNode),
            column: getColumnNumber(ifNode),
            severity: 'warning',
            certainty: 'definite',
            confidence: 0.9,
            scope: 'function',
            message: 'Duplicate condition in else-if chain',
            ast_facts: {
              branch_kind: 'duplicate_condition',
              condition_text: conditionText,
            },
          });
          continue;
        }
      }

      if (consequenceText === alternativeText) {
        results.push({
          name: 'duplicate_branch',
          line: getLineNumber(ifNode),
          column: getColumnNumber(ifNode),
          severity: 'warning',
          certainty: 'definite',
          confidence: 0.9,
          scope: 'function',
          message: 'Both branches of this conditional are identical',
          ast_facts: {
            branch_kind: 'identical_branch',
            condition_text: conditionText,
          },
        });
      }
    }

    return results;
  },
};

export default duplicateBranchDetector;

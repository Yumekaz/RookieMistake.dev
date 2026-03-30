import { Parser } from '../parser';
import { Detector, DetectorResult, Language } from '../types';
import {
  findNodes,
  getNodeText,
  getLineNumber,
  getColumnNumber,
  getEnclosingFunction,
  getFunctionName,
} from '../parser';

const FUNCTION_TYPES = [
  'function_declaration',
  'function_expression',
  'arrow_function',
  'method_definition',
  'function_definition',
];

const MUTATING_METHODS = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'fill',
  'copyWithin',
  'append',
  'extend',
  'insert',
  'remove',
  'clear',
  'update',
  'add',
];

function collectParameterNames(functionNode: Parser.SyntaxNode, code: string): string[] {
  const names = new Set<string>();

  for (const parameterNode of findNodes(functionNode, 'identifier')) {
    const parentType = parameterNode.parent?.type || '';
    if (parentType.includes('parameter') || parentType === 'parameters') {
      names.add(getNodeText(parameterNode, code));
    }
  }

  return [...names];
}

function sameNode(a: Parser.SyntaxNode, b: Parser.SyntaxNode): boolean {
  return (
    a.type === b.type &&
    a.startIndex === b.startIndex &&
    a.endIndex === b.endIndex
  );
}

function getMutationKind(node: Parser.SyntaxNode, code: string, params: Set<string>, language: Language): string | null {
  if (node.type === 'call_expression' || node.type === 'call') {
    const funcNode = node.childForFieldName('function');
    if (!funcNode || funcNode.type !== 'member_expression') {
      return null;
    }

    const object = funcNode.childForFieldName('object');
    const property = funcNode.childForFieldName('property');

    if (!object || !property || object.type !== 'identifier') {
      return null;
    }

    const objectName = getNodeText(object, code);
    const methodName = getNodeText(property, code);

    if (params.has(objectName) && MUTATING_METHODS.includes(methodName)) {
      return `${objectName}.${methodName}`;
    }
  }

  if (node.type === 'assignment_expression' || node.type === 'assignment') {
    const left = node.childForFieldName('left');
    if (!left) {
      return null;
    }

    const leftText = getNodeText(left, code).trim();
    for (const param of params) {
      if (new RegExp(`^${param.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\.|\\[)`).test(leftText)) {
        return leftText;
      }
    }
  }

  if (language === 'python' && (node.type === 'call' || node.type === 'call_expression')) {
    const callText = getNodeText(node, code);
    for (const param of params) {
      for (const method of MUTATING_METHODS) {
        if (new RegExp(`\\b${param.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.${method}\\s*\\(`).test(callText)) {
          return `${param}.${method}`;
        }
      }
    }
  }

  return null;
}

const parameterMutationDetector: Detector = {
  name: 'parameter_mutation',
  supportedLanguages: ['javascript', 'typescript', 'python'],

  detect(code: string, language: Language, tree: Parser.Tree): DetectorResult[] {
    const results: DetectorResult[] = [];
    const root = tree.rootNode;

    const functionNodes = findNodes(root, FUNCTION_TYPES);

    for (const functionNode of functionNodes) {
      const parameterNames = collectParameterNames(functionNode, code);
      if (parameterNames.length === 0) {
        continue;
      }

      const params = new Set(parameterNames);
      const functionName = getFunctionName(functionNode, code) || 'anonymous function';

      for (const node of findNodes(functionNode, ['call_expression', 'call', 'assignment_expression', 'assignment'])) {
        const enclosingFunction = getEnclosingFunction(node);
        if (!enclosingFunction || !sameNode(enclosingFunction, functionNode)) {
          continue;
        }

        const mutationKind = getMutationKind(node, code, params, language);
        if (!mutationKind) {
          continue;
        }

        results.push({
          name: 'parameter_mutation',
          line: getLineNumber(node),
          column: getColumnNumber(node),
          severity: 'warning',
          certainty: 'definite',
          confidence: 0.9,
          scope: 'function',
          message: `Function '${functionName}' mutates parameter data in place via '${mutationKind}'`,
          ast_facts: {
            function_name: functionName,
            mutation_kind: mutationKind,
          },
        });
      }
    }

    return results;
  },
};

export default parameterMutationDetector;

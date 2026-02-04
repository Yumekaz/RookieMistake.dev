import { Parser } from '../parser';
import { Detector, DetectorResult, Language } from '../types';
import { findNodes, getNodeText, getLineNumber, getColumnNumber } from '../parser';

/**
 * array_mutation detector
 * 
 * Detects array mutation methods that modify arrays in place.
 * 
 * Heuristics:
 * - Looks for .push(), .pop(), .shift(), .unshift(), .splice(), .sort(), .reverse()
 * - Increases severity if the target looks like state (this.state, props, state variables)
 * 
 * False positive mitigation:
 * - Only flags methods that are definitely mutating
 * - Warns but doesn't error since mutation is sometimes intentional
 */

// Methods that mutate arrays in place
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
];

// Patterns that suggest state/props mutation
const STATE_PATTERNS = [
  /^this\.state/,
  /^this\.props/,
  /^props\./,
  /^state\./,
  /state$/i,
  /^setState/,
  /Props$/,
];

function isStateLike(text: string): boolean {
  return STATE_PATTERNS.some((pattern) => pattern.test(text));
}

const arrayMutationDetector: Detector = {
  name: 'array_mutation',
  supportedLanguages: ['javascript', 'typescript'],

  detect(code: string, language: Language, tree: Parser.Tree): DetectorResult[] {
    const results: DetectorResult[] = [];
    const root = tree.rootNode;

    // Find all call expressions
    const callExprs = findNodes(root, 'call_expression');

    for (const callExpr of callExprs) {
      // Get the function being called
      const funcNode = callExpr.childForFieldName('function');
      if (!funcNode || funcNode.type !== 'member_expression') {
        continue;
      }

      // Get the method name
      const property = funcNode.childForFieldName('property');
      if (!property) continue;

      const methodName = getNodeText(property, code);

      // Check if it's a mutating method
      if (!MUTATING_METHODS.includes(methodName)) {
        continue;
      }

      // Get the target object
      const object = funcNode.childForFieldName('object');
      if (!object) continue;

      const targetText = getNodeText(object, code);

      // Check if it looks like state
      const isThisStateLike = isStateLike(targetText);

      results.push({
        name: 'array_mutation',
        line: getLineNumber(callExpr),
        column: getColumnNumber(callExpr),
        severity: 'warning',
        certainty: 'heuristic',
        confidence: isThisStateLike ? 0.6 : 0.5,
        scope: 'function',
        message: `Array mutation with '.${methodName}()' on '${targetText}'${
          isThisStateLike ? ' (appears to be state)' : ''
        }`,
        ast_facts: {
          method: methodName,
          target_text: targetText,
          is_this_state_like: isThisStateLike,
        },
      });
    }

    return results;
  },
};

export default arrayMutationDetector;

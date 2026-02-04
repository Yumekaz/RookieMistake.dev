import { parseCode } from '../../src/parser';
import arrayMutation from '../../src/detectors/array-mutation';

describe('array_mutation detector', () => {
  describe('positive cases (should detect)', () => {
    it('detects .push() call', () => {
      const code = `
const items = [];
items.push('new item');
`;
      const tree = parseCode(code, 'javascript');
      const results = arrayMutation.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('array_mutation');
      expect(results[0].ast_facts.method).toBe('push');
      expect(results[0].ast_facts.target_text).toBe('items');
    });

    it('detects .splice() call', () => {
      const code = `
arr.splice(1, 2);
`;
      const tree = parseCode(code, 'javascript');
      const results = arrayMutation.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].ast_facts.method).toBe('splice');
    });

    it('detects .sort() call', () => {
      const code = `
numbers.sort((a, b) => a - b);
`;
      const tree = parseCode(code, 'javascript');
      const results = arrayMutation.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].ast_facts.method).toBe('sort');
    });

    it('detects .reverse() call', () => {
      const code = `
list.reverse();
`;
      const tree = parseCode(code, 'javascript');
      const results = arrayMutation.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].ast_facts.method).toBe('reverse');
    });

    it('detects this.state mutation', () => {
      const code = `
class Component {
  addItem(item) {
    this.state.items.push(item);
  }
}
`;
      const tree = parseCode(code, 'javascript');
      const results = arrayMutation.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].ast_facts.is_this_state_like).toBe(true);
    });

    it('detects props mutation', () => {
      const code = `
function Component(props) {
  props.items.push('new');
}
`;
      const tree = parseCode(code, 'javascript');
      const results = arrayMutation.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].ast_facts.is_this_state_like).toBe(true);
    });
  });

  describe('negative cases (should not detect)', () => {
    it('does not flag .map() call', () => {
      const code = `
const doubled = items.map(x => x * 2);
`;
      const tree = parseCode(code, 'javascript');
      const results = arrayMutation.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag .filter() call', () => {
      const code = `
const evens = items.filter(x => x % 2 === 0);
`;
      const tree = parseCode(code, 'javascript');
      const results = arrayMutation.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag .concat() call', () => {
      const code = `
const combined = arr1.concat(arr2);
`;
      const tree = parseCode(code, 'javascript');
      const results = arrayMutation.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag .slice() call', () => {
      const code = `
const copy = items.slice();
`;
      const tree = parseCode(code, 'javascript');
      const results = arrayMutation.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });
  });
});

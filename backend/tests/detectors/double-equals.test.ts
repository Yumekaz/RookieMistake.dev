import { parseCode } from '../../src/parser';
import doubleEquals from '../../src/detectors/double-equals';

describe('double_equals detector', () => {
  describe('positive cases (should detect)', () => {
    it('detects == operator', () => {
      const code = `
if (x == 5) {
  console.log('equal');
}
`;
      const tree = parseCode(code, 'javascript');
      const results = doubleEquals.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('double_equals');
      expect(results[0].severity).toBe('warning');
      expect(results[0].ast_facts.operator).toBe('==');
    });

    it('detects != operator', () => {
      const code = `
if (y != null) {
  console.log('not null');
}
`;
      const tree = parseCode(code, 'javascript');
      const results = doubleEquals.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].ast_facts.operator).toBe('!=');
    });

    it('detects multiple loose equality operators', () => {
      const code = `
if (a == b && c != d) {
  console.log('test');
}
`;
      const tree = parseCode(code, 'javascript');
      const results = doubleEquals.detect(code, 'javascript', tree);

      expect(results.length).toBe(2);
    });

    it('captures left and right operands', () => {
      const code = `
const result = foo == bar;
`;
      const tree = parseCode(code, 'javascript');
      const results = doubleEquals.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].ast_facts.left_text).toBe('foo');
      expect(results[0].ast_facts.right_text).toBe('bar');
    });
  });

  describe('negative cases (should not detect)', () => {
    it('does not flag === operator', () => {
      const code = `
if (x === 5) {
  console.log('strictly equal');
}
`;
      const tree = parseCode(code, 'javascript');
      const results = doubleEquals.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag !== operator', () => {
      const code = `
if (y !== null) {
  console.log('not strictly null');
}
`;
      const tree = parseCode(code, 'javascript');
      const results = doubleEquals.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag other comparison operators', () => {
      const code = `
if (a < b && c > d && e <= f && g >= h) {
  console.log('test');
}
`;
      const tree = parseCode(code, 'javascript');
      const results = doubleEquals.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });
  });
});

import { parseCode } from '../../src/parser';
import varUsage from '../../src/detectors/var-usage';

describe('var_usage detector', () => {
  describe('positive cases (should detect)', () => {
    it('detects var declaration', () => {
      const code = `
var x = 5;
`;
      const tree = parseCode(code, 'javascript');
      const results = varUsage.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('var_usage');
      expect(results[0].severity).toBe('info');
      expect(results[0].ast_facts.variable_names).toContain('x');
    });

    it('detects multiple var declarations', () => {
      const code = `
var a = 1;
var b = 2;
var c = 3;
`;
      const tree = parseCode(code, 'javascript');
      const results = varUsage.detect(code, 'javascript', tree);

      expect(results.length).toBe(3);
    });

    it('detects var with multiple declarators', () => {
      const code = `
var x = 1, y = 2, z = 3;
`;
      const tree = parseCode(code, 'javascript');
      const results = varUsage.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].ast_facts.variable_names).toEqual(['x', 'y', 'z']);
    });

    it('detects var in function scope', () => {
      const code = `
function test() {
  var localVar = 'hello';
}
`;
      const tree = parseCode(code, 'javascript');
      const results = varUsage.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].ast_facts.variable_names).toContain('localVar');
    });
  });

  describe('negative cases (should not detect)', () => {
    it('does not flag let declaration', () => {
      const code = `
let x = 5;
`;
      const tree = parseCode(code, 'javascript');
      const results = varUsage.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag const declaration', () => {
      const code = `
const x = 5;
`;
      const tree = parseCode(code, 'javascript');
      const results = varUsage.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag mixed let/const declarations', () => {
      const code = `
let a = 1;
const b = 2;
let c = 3;
`;
      const tree = parseCode(code, 'javascript');
      const results = varUsage.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });
  });
});

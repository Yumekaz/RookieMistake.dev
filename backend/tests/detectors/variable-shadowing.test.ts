import { parseCode } from '../../src/parser';
import variableShadowing from '../../src/detectors/variable-shadowing';

describe('variable_shadowing detector', () => {
  describe('positive cases (should detect)', () => {
    it('detects function parameter shadowing outer variable', () => {
      const code = `
const data = 'outer';

function process(data) {
  console.log(data);
}
`;
      const tree = parseCode(code, 'javascript');
      const results = variableShadowing.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('variable_shadowing');
      expect(results[0].ast_facts.name).toBe('data');
    });

    it('detects nested function variable shadowing', () => {
      const code = `
function outer() {
  const value = 1;
  
  function inner() {
    const value = 2;
    console.log(value);
  }
}
`;
      const tree = parseCode(code, 'javascript');
      const results = variableShadowing.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].ast_facts.name).toBe('value');
    });

    it('detects block scope shadowing', () => {
      const code = `
const count = 10;

if (true) {
  const count = 20;
  console.log(count);
}
`;
      const tree = parseCode(code, 'javascript');
      const results = variableShadowing.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
    });

    it('records correct line numbers', () => {
      const code = `const x = 1;

function test() {
  const x = 2;
}
`;
      const tree = parseCode(code, 'javascript');
      const results = variableShadowing.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].ast_facts.outer_declaration_line).toBe(1);
      expect(results[0].ast_facts.inner_declaration_line).toBe(4);
    });
  });

  describe('negative cases (should not detect)', () => {
    it('does not flag common loop variables', () => {
      const code = `
for (let i = 0; i < 10; i++) {
  for (let i = 0; i < 5; i++) {
    console.log(i);
  }
}
`;
      const tree = parseCode(code, 'javascript');
      const results = variableShadowing.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag different variable names', () => {
      const code = `
const name = 'outer';

function greet(user) {
  console.log(user);
}
`;
      const tree = parseCode(code, 'javascript');
      const results = variableShadowing.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag same-scope redeclaration', () => {
      const code = `
function test() {
  const a = 1;
  const b = 2;
  console.log(a, b);
}
`;
      const tree = parseCode(code, 'javascript');
      const results = variableShadowing.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });
  });
});

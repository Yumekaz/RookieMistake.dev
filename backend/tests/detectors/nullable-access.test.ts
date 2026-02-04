import { parseCode } from '../../src/parser';
import nullableAccess from '../../src/detectors/nullable-access';

describe('nullable_access detector', () => {
  describe('positive cases (should detect)', () => {
    it('detects access on null-assigned variable', () => {
      const code = `
let data = null;
console.log(data.length);
`;
      const tree = parseCode(code, 'javascript');
      const results = nullableAccess.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('nullable_access');
      expect(results[0].ast_facts.target_identifier).toBe('data');
    });

    it('detects access on undefined-assigned variable', () => {
      const code = `
let value = undefined;
console.log(value.toString());
`;
      const tree = parseCode(code, 'javascript');
      const results = nullableAccess.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].ast_facts.assigned_null_like_before).toBe(true);
    });

    it('detects access on parameter without null check', () => {
      const code = `
function process(user) {
  return user.name;
}
`;
      const tree = parseCode(code, 'javascript');
      const results = nullableAccess.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].ast_facts.target_identifier).toBe('user');
    });
  });

  describe('negative cases (should not detect)', () => {
    it('does not flag access with optional chaining', () => {
      const code = `
let data = null;
console.log(data?.length);
`;
      const tree = parseCode(code, 'javascript');
      const results = nullableAccess.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag access after null check', () => {
      const code = `
function process(user) {
  if (user) {
    return user.name;
  }
  return null;
}
`;
      const tree = parseCode(code, 'javascript');
      const results = nullableAccess.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag access on non-nullable variable', () => {
      const code = `
const data = { name: 'test' };
console.log(data.name);
`;
      const tree = parseCode(code, 'javascript');
      const results = nullableAccess.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });
  });
});

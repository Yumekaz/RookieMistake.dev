import { parseCode } from '../../src/parser';
import noErrorHandling from '../../src/detectors/no-error-handling';

describe('no_error_handling detector', () => {
  describe('positive cases (should detect)', () => {
    it('detects await without try/catch', () => {
      const code = `
async function loadData() {
  const response = await fetch('/api/data');
  return response.json();
}
`;
      const tree = parseCode(code, 'javascript');
      const results = noErrorHandling.detect(code, 'javascript', tree);

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].name).toBe('no_error_handling');
      expect(results[0].ast_facts.enclosing_try_boolean).toBe(false);
    });

    it('detects multiple await without error handling', () => {
      const code = `
async function process() {
  const users = await fetchUsers();
  const posts = await fetchPosts();
  return { users, posts };
}
`;
      const tree = parseCode(code, 'javascript');
      const results = noErrorHandling.detect(code, 'javascript', tree);

      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('negative cases (should not detect)', () => {
    it('does not flag await inside try/catch', () => {
      const code = `
async function loadData() {
  try {
    const response = await fetch('/api/data');
    return response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}
`;
      const tree = parseCode(code, 'javascript');
      const results = noErrorHandling.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag Promise with .catch()', () => {
      const code = `
function loadData() {
  fetch('/api/data')
    .then(res => res.json())
    .catch(err => console.error(err));
}
`;
      const tree = parseCode(code, 'javascript');
      const results = noErrorHandling.detect(code, 'javascript', tree);

      // Should not flag the fetch call
      const fetchResults = results.filter(r => 
        r.ast_facts.callee_name === 'fetch'
      );
      expect(fetchResults.length).toBe(0);
    });

    it('does not flag returned promise', () => {
      const code = `
async function getData() {
  return await fetchData();
}
`;
      const tree = parseCode(code, 'javascript');
      const results = noErrorHandling.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });
  });
});

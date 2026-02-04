import { parseCode } from '../../src/parser';
import missingAwait from '../../src/detectors/missing-await';

describe('missing_await detector', () => {
  describe('positive cases (should detect)', () => {
    it('detects async function call without await', () => {
      const code = `
async function fetchData() {
  return { data: 'test' };
}

async function main() {
  fetchData();
}
`;
      const tree = parseCode(code, 'javascript');
      const results = missingAwait.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('missing_await');
      expect(results[0].severity).toBe('error');
      expect(results[0].ast_facts.callee_name).toBe('fetchData');
    });

    it('detects async arrow function call without await', () => {
      const code = `
const fetchUser = async () => {
  return { name: 'John' };
};

async function loadProfile() {
  fetchUser();
}
`;
      const tree = parseCode(code, 'javascript');
      const results = missingAwait.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].ast_facts.callee_name).toBe('fetchUser');
    });

    it('detects multiple missing awaits', () => {
      const code = `
async function a() { return 1; }
async function b() { return 2; }

async function test() {
  a();
  b();
}
`;
      const tree = parseCode(code, 'javascript');
      const results = missingAwait.detect(code, 'javascript', tree);

      expect(results.length).toBe(2);
    });
  });

  describe('negative cases (should not detect)', () => {
    it('does not flag awaited calls', () => {
      const code = `
async function fetchData() {
  return { data: 'test' };
}

async function main() {
  await fetchData();
}
`;
      const tree = parseCode(code, 'javascript');
      const results = missingAwait.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag calls with .then()', () => {
      const code = `
async function fetchData() {
  return { data: 'test' };
}

function main() {
  fetchData().then(data => console.log(data));
}
`;
      const tree = parseCode(code, 'javascript');
      const results = missingAwait.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag non-async function calls', () => {
      const code = `
function syncFunction() {
  return 42;
}

function main() {
  syncFunction();
}
`;
      const tree = parseCode(code, 'javascript');
      const results = missingAwait.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag calls where result is assigned', () => {
      const code = `
async function fetchData() {
  return { data: 'test' };
}

function main() {
  const promise = fetchData();
}
`;
      const tree = parseCode(code, 'javascript');
      const results = missingAwait.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });
  });
});

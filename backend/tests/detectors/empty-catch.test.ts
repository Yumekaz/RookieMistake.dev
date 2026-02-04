import { parseCode } from '../../src/parser';
import emptyCatch from '../../src/detectors/empty-catch';

describe('empty_catch detector', () => {
  describe('positive cases (should detect)', () => {
    it('detects empty catch block', () => {
      const code = `
try {
  riskyOperation();
} catch (e) {
}
`;
      const tree = parseCode(code, 'javascript');
      const results = emptyCatch.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('empty_catch');
      expect(results[0].severity).toBe('warning');
      expect(results[0].ast_facts.catch_body_summary).toBe('empty');
    });

    it('detects catch block with only comments', () => {
      const code = `
try {
  riskyOperation();
} catch (error) {
  // TODO: handle error
}
`;
      const tree = parseCode(code, 'javascript');
      const results = emptyCatch.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].ast_facts.catch_body_summary).toBe('only comments');
    });

    it('captures catch parameter name', () => {
      const code = `
try {
  doSomething();
} catch (myError) {
}
`;
      const tree = parseCode(code, 'javascript');
      const results = emptyCatch.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].ast_facts.catch_param).toBe('myError');
    });

    it('detects multiple empty catch blocks', () => {
      const code = `
try {
  first();
} catch (e) {
}

try {
  second();
} catch (e) {
}
`;
      const tree = parseCode(code, 'javascript');
      const results = emptyCatch.detect(code, 'javascript', tree);

      expect(results.length).toBe(2);
    });
  });

  describe('negative cases (should not detect)', () => {
    it('does not flag catch with console.error', () => {
      const code = `
try {
  riskyOperation();
} catch (e) {
  console.error(e);
}
`;
      const tree = parseCode(code, 'javascript');
      const results = emptyCatch.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag catch with throw', () => {
      const code = `
try {
  riskyOperation();
} catch (e) {
  throw new Error('Wrapped: ' + e.message);
}
`;
      const tree = parseCode(code, 'javascript');
      const results = emptyCatch.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag catch with actual handling', () => {
      const code = `
try {
  riskyOperation();
} catch (e) {
  handleError(e);
  notifyUser('Something went wrong');
}
`;
      const tree = parseCode(code, 'javascript');
      const results = emptyCatch.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });
  });
});

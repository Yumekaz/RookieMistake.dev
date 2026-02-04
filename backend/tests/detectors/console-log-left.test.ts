import { parseCode } from '../../src/parser';
import consoleLogLeft from '../../src/detectors/console-log-left';

describe('console_log_left detector', () => {
  describe('positive cases (should detect)', () => {
    it('detects console.log', () => {
      const code = `
function test() {
  console.log('debug info');
}
`;
      const tree = parseCode(code, 'javascript');
      const results = consoleLogLeft.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('console_log_left');
      expect(results[0].severity).toBe('info');
      expect(results[0].ast_facts.method).toBe('log');
    });

    it('detects console.debug', () => {
      const code = `
console.debug('debugging');
`;
      const tree = parseCode(code, 'javascript');
      const results = consoleLogLeft.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].ast_facts.method).toBe('debug');
    });

    it('detects console.info', () => {
      const code = `
console.info('information');
`;
      const tree = parseCode(code, 'javascript');
      const results = consoleLogLeft.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].ast_facts.method).toBe('info');
    });

    it('detects multiple console statements', () => {
      const code = `
function process() {
  console.log('start');
  doWork();
  console.log('end');
}
`;
      const tree = parseCode(code, 'javascript');
      const results = consoleLogLeft.detect(code, 'javascript', tree);

      expect(results.length).toBe(2);
    });

    it('detects console.time/timeEnd', () => {
      const code = `
console.time('operation');
doWork();
console.timeEnd('operation');
`;
      const tree = parseCode(code, 'javascript');
      const results = consoleLogLeft.detect(code, 'javascript', tree);

      expect(results.length).toBe(2);
    });
  });

  describe('negative cases (should not detect)', () => {
    it('does not flag console inside DEBUG conditional', () => {
      const code = `
if (DEBUG) {
  console.log('debug info');
}
`;
      const tree = parseCode(code, 'javascript');
      const results = consoleLogLeft.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag console inside NODE_ENV check', () => {
      const code = `
if (process.env.NODE_ENV === 'development') {
  console.log('dev only');
}
`;
      const tree = parseCode(code, 'javascript');
      const results = consoleLogLeft.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag console.error in catch block', () => {
      const code = `
try {
  riskyOperation();
} catch (e) {
  console.error(e);
}
`;
      const tree = parseCode(code, 'javascript');
      const results = consoleLogLeft.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag console.warn in catch block', () => {
      const code = `
try {
  riskyOperation();
} catch (e) {
  console.warn('Operation failed:', e.message);
}
`;
      const tree = parseCode(code, 'javascript');
      const results = consoleLogLeft.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });
  });
});

import { parseCode } from '../../src/parser';
import offByOneLoop from '../../src/detectors/off-by-one-loop';

describe('off_by_one_loop detector', () => {
  describe('positive cases (should detect)', () => {
    it('detects i <= arr.length in for loop', () => {
      const code = `
const arr = [1, 2, 3];
for (let i = 0; i <= arr.length; i++) {
  console.log(arr[i]);
}
`;
      const tree = parseCode(code, 'javascript');
      const results = offByOneLoop.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].name).toBe('off_by_one_loop');
      expect(results[0].severity).toBe('warning');
      expect(results[0].ast_facts.condition_operator).toBe('<=');
      expect(results[0].ast_facts.loop_type).toBe('for');
    });

    it('detects length <= i style condition', () => {
      const code = `
const items = ['a', 'b', 'c'];
for (let i = 0; items.length >= i; i++) {
  process(items[i]);
}
`;
      const tree = parseCode(code, 'javascript');
      const results = offByOneLoop.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].ast_facts.condition_operator).toBe('>=');
    });

    it('detects in while loop', () => {
      const code = `
let i = 0;
while (i <= arr.length) {
  console.log(arr[i]);
  i++;
}
`;
      const tree = parseCode(code, 'javascript');
      const results = offByOneLoop.detect(code, 'javascript', tree);

      expect(results.length).toBe(1);
      expect(results[0].ast_facts.loop_type).toBe('while');
    });
  });

  describe('negative cases (should not detect)', () => {
    it('does not flag i < arr.length', () => {
      const code = `
const arr = [1, 2, 3];
for (let i = 0; i < arr.length; i++) {
  console.log(arr[i]);
}
`;
      const tree = parseCode(code, 'javascript');
      const results = offByOneLoop.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag i < length - 1', () => {
      const code = `
const arr = [1, 2, 3];
for (let i = 0; i < arr.length - 1; i++) {
  console.log(arr[i]);
}
`;
      const tree = parseCode(code, 'javascript');
      const results = offByOneLoop.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag <= with constant', () => {
      const code = `
for (let i = 0; i <= 10; i++) {
  console.log(i);
}
`;
      const tree = parseCode(code, 'javascript');
      const results = offByOneLoop.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });

    it('does not flag for...of loop', () => {
      const code = `
const arr = [1, 2, 3];
for (const item of arr) {
  console.log(item);
}
`;
      const tree = parseCode(code, 'javascript');
      const results = offByOneLoop.detect(code, 'javascript', tree);

      expect(results.length).toBe(0);
    });
  });

  describe('Python cases', () => {
    it('detects range(len(arr) + 1) pattern', () => {
      const code = `
arr = [1, 2, 3]
for i in range(len(arr) + 1):
    print(arr[i])
`;
      const tree = parseCode(code, 'python');
      const results = offByOneLoop.detect(code, 'python', tree);

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].name).toBe('off_by_one_loop');
    });
  });
});

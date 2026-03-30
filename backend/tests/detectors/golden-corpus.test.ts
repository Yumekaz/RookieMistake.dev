import { readFileSync } from 'fs';
import path from 'path';
import { parseCode } from '../../src/parser';
import { getDetectorsForLanguage } from '../../src/detectors';
import type { Language } from '../../src/types';

type CorpusCase = {
  file: string;
  language: Language;
  shouldFlag?: string[];
  shouldNotFlag?: string[];
};

function analyze(code: string, language: Language): string[] {
  const tree = parseCode(code, language);
  const results: string[] = [];

  for (const detector of getDetectorsForLanguage(language)) {
    const findings = detector.detect(code, language, tree);
    for (const finding of findings) {
      results.push(finding.name);
    }
  }

  return [...new Set(results)];
}

const corpus: CorpusCase[] = [
  {
    file: 'should-flag/hardcoded-secret.js',
    language: 'javascript',
    shouldFlag: ['hardcoded_secret'],
  },
  {
    file: 'should-not-flag/hardcoded-secret-env.js',
    language: 'javascript',
    shouldNotFlag: ['hardcoded_secret'],
  },
  {
    file: 'should-flag/insecure-randomness.js',
    language: 'javascript',
    shouldFlag: ['insecure_randomness'],
  },
  {
    file: 'should-not-flag/insecure-randomness-safe.js',
    language: 'javascript',
    shouldNotFlag: ['insecure_randomness'],
  },
  {
    file: 'should-flag/dangerous-eval.js',
    language: 'javascript',
    shouldFlag: ['dangerous_eval'],
  },
  {
    file: 'should-not-flag/dangerous-eval-safe.js',
    language: 'javascript',
    shouldNotFlag: ['dangerous_eval'],
  },
  {
    file: 'should-flag/dangerous-shell-exec.js',
    language: 'javascript',
    shouldFlag: ['dangerous_shell_exec'],
  },
  {
    file: 'should-not-flag/dangerous-shell-exec-safe.js',
    language: 'javascript',
    shouldNotFlag: ['dangerous_shell_exec'],
  },
  {
    file: 'should-flag/sql-string-interpolation.js',
    language: 'javascript',
    shouldFlag: ['sql_string_interpolation'],
  },
  {
    file: 'should-not-flag/sql-parameterized.js',
    language: 'javascript',
    shouldNotFlag: ['sql_string_interpolation'],
  },
  {
    file: 'should-flag/parameter-mutation.js',
    language: 'javascript',
    shouldFlag: ['parameter_mutation'],
  },
  {
    file: 'should-not-flag/parameter-mutation-safe.js',
    language: 'javascript',
    shouldNotFlag: ['parameter_mutation'],
  },
  {
    file: 'should-flag/broad-except.py',
    language: 'python',
    shouldFlag: ['broad_exception'],
  },
  {
    file: 'should-not-flag/broad-except-safe.py',
    language: 'python',
    shouldNotFlag: ['broad_exception'],
  },
  {
    file: 'should-flag/duplicate-branch.js',
    language: 'javascript',
    shouldFlag: ['duplicate_branch'],
  },
  {
    file: 'should-not-flag/duplicate-branch-safe.js',
    language: 'javascript',
    shouldNotFlag: ['duplicate_branch'],
  },
  {
    file: 'should-flag/missing-default-switch.js',
    language: 'javascript',
    shouldFlag: ['missing_default_switch'],
  },
  {
    file: 'should-not-flag/missing-default-switch-safe.js',
    language: 'javascript',
    shouldNotFlag: ['missing_default_switch'],
  },
  {
    file: 'should-flag/unsafe-json-parse.py',
    language: 'python',
    shouldFlag: ['unsafe_json_parse'],
  },
  {
    file: 'should-not-flag/unsafe-json-parse-safe.py',
    language: 'python',
    shouldNotFlag: ['unsafe_json_parse'],
  },
  {
    file: 'should-not-flag/double-equals-nullish.js',
    language: 'javascript',
    shouldNotFlag: ['double_equals'],
  },
];

describe('golden detector corpus', () => {
  it.each(corpus)('checks $file', ({ file, language, shouldFlag = [], shouldNotFlag = [] }) => {
    const code = readFileSync(path.join(__dirname, '../../fixtures/golden', file), 'utf8');
    const names = analyze(code, language);

    for (const expected of shouldFlag) {
      expect(names).toContain(expected);
    }

    for (const forbidden of shouldNotFlag) {
      expect(names).not.toContain(forbidden);
    }

    if (shouldFlag.length === 0) {
      expect(names).toHaveLength(0);
    }
  });
});

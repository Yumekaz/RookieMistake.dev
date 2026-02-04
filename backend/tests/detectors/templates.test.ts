import { generateExplanation, getRawTemplate, listTemplates } from '../../src/explainers';

describe('Explanation Templates', () => {
  describe('listTemplates', () => {
    it('returns all template names', () => {
      const templates = listTemplates();
      expect(templates).toContain('missing_await');
      expect(templates).toContain('double_equals');
      expect(templates).toContain('nullable_access');
      expect(templates).toContain('variable_shadowing');
      expect(templates).toContain('off_by_one_loop');
      expect(templates).toContain('no_error_handling');
      expect(templates).toContain('array_mutation');
      expect(templates).toContain('var_usage');
      expect(templates).toContain('console_log_left');
      expect(templates).toContain('empty_catch');
    });
  });

  describe('getRawTemplate', () => {
    it('returns template for known detector', () => {
      const template = getRawTemplate('missing_await');
      expect(template).not.toBeNull();
      expect(template?.explanation).toContain('{{callee_name}}');
      expect(template?.fix).toContain('await');
    });

    it('returns null for unknown detector', () => {
      const template = getRawTemplate('unknown_detector');
      expect(template).toBeNull();
    });
  });

  describe('generateExplanation', () => {
    describe('missing_await', () => {
      it('generates deterministic explanation', () => {
        const facts = {
          callee_name: 'fetchData',
          parent_type: 'expression_statement',
          enclosing_function_is_async: true,
        };

        const result = generateExplanation('missing_await', facts);

        expect(result.explanation).toContain('fetchData');
        expect(result.explanation).toContain('expression_statement');
        expect(result.explanation).toContain('async');
        expect(result.fix).toContain('fetchData');
        expect(result.fix).toContain('await');
      });

      it('produces same output for same input', () => {
        const facts = {
          callee_name: 'loadUser',
          parent_type: 'call_expression',
          enclosing_function_is_async: false,
        };

        const result1 = generateExplanation('missing_await', facts);
        const result2 = generateExplanation('missing_await', facts);

        expect(result1.explanation).toBe(result2.explanation);
        expect(result1.fix).toBe(result2.fix);
      });
    });

    describe('double_equals', () => {
      it('generates deterministic explanation for ==', () => {
        const facts = {
          operator: '==',
          left_text: 'x',
          right_text: '5',
        };

        const result = generateExplanation('double_equals', facts);

        expect(result.explanation).toContain('==');
        expect(result.explanation).toContain('type coercion');
        expect(result.fix).toContain('===');
      });

      it('generates deterministic explanation for !=', () => {
        const facts = {
          operator: '!=',
          left_text: 'value',
          right_text: 'null',
        };

        const result = generateExplanation('double_equals', facts);

        expect(result.explanation).toContain('!=');
        expect(result.fix).toContain('!==');
      });
    });

    describe('empty_catch', () => {
      it('generates explanation with catch parameter', () => {
        const facts = {
          catch_body_summary: 'empty',
          catch_param: 'error',
        };

        const result = generateExplanation('empty_catch', facts);

        expect(result.explanation).toContain('empty');
        expect(result.fix).toContain('error');
      });

      it('handles missing catch parameter', () => {
        const facts = {
          catch_body_summary: 'only comments',
          catch_param: undefined,
        };

        const result = generateExplanation('empty_catch', facts);

        expect(result.explanation).toContain('only comments');
        expect(result.fix).toBeDefined();
      });
    });

    describe('variable_shadowing', () => {
      it('generates explanation with line numbers', () => {
        const facts = {
          name: 'data',
          outer_declaration_line: 5,
          inner_declaration_line: 12,
          scopes_between: 2,
        };

        const result = generateExplanation('variable_shadowing', facts);

        expect(result.explanation).toContain('data');
        expect(result.explanation).toContain('12');
        expect(result.explanation).toContain('5');
        expect(result.fix).toContain('data');
      });
    });

    describe('off_by_one_loop', () => {
      it('generates explanation for for loop', () => {
        const facts = {
          loop_type: 'for',
          condition_operator: '<=',
          array_expr_text: 'arr.length',
        };

        const result = generateExplanation('off_by_one_loop', facts);

        expect(result.explanation).toContain('for');
        expect(result.explanation).toContain('<=');
        expect(result.fix).toContain('<');
      });
    });

    describe('console_log_left', () => {
      it('generates explanation with method name', () => {
        const facts = {
          method: 'log',
          line_in_function: 5,
        };

        const result = generateExplanation('console_log_left', facts);

        expect(result.explanation).toContain('log');
        expect(result.explanation).toContain('5');
        expect(result.fix).toContain('log');
      });
    });

    describe('fallback template', () => {
      it('uses fallback for unknown detector', () => {
        const facts = { some: 'data' };

        const result = generateExplanation('unknown_detector', facts);

        expect(result.explanation).toBeDefined();
        expect(result.fix).toBeDefined();
        expect(result.explanation.length).toBeGreaterThan(0);
      });
    });
  });
});

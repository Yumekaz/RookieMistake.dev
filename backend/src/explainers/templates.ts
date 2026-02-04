import Handlebars from 'handlebars';
import { AstFacts } from '../types';

// Register custom helpers for Handlebars
Handlebars.registerHelper('or', (a: unknown, b: unknown) => a || b);
Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
Handlebars.registerHelper('not', (a: unknown) => !a);

// Template definitions for each detector
interface ExplanationTemplate {
  explanation: string;
  fix: string;
}

const templates: Record<string, ExplanationTemplate> = {
  missing_await: {
    explanation:
      "You call '{{callee_name}}' inside a {{parent_type}} without awaiting it. Because that function is async, the surrounding code continues before the operation completes, which can cause race conditions or undefined behavior.",
    fix: "Await the call: `const result = await {{callee_name}}(...);` or handle the Promise with `.then()/.catch()`.",
  },

  double_equals: {
    explanation:
      "Using '{{operator}}' performs type coercion, which can lead to unexpected results. For example, `0 == ''` is true, and `null == undefined` is true. This is comparing '{{left_text}}' with '{{right_text}}'.",
    fix: "Use strict equality '{{#if (eq operator '==')}}==={{else}}!=={{/if}}' instead to avoid implicit type conversion.",
  },

  nullable_access: {
    explanation:
      "You're accessing '{{target_identifier}}' which may be {{#if (eq language 'python')}}None{{else}}null or undefined{{/if}}{{#unless guard_present_boolean}}, and there's no {{#if (eq language 'python')}}`is not None` guard{{else}}null check or optional chaining{{/if}} before this access{{/unless}}. {{#if (eq certainty 'definite')}}This will always raise a runtime error.{{else}}This can cause a runtime error.{{/if}}",
    fix:
      "{{#if (eq language 'python')}}Add a None check: `if {{target_identifier}} is not None: ...` or return early before accessing attributes.{{else}}Add a null check: `if ({{target_identifier}}) { ... }` or use optional chaining: `{{target_identifier}}?.property`.{{/if}}",
  },

  variable_shadowing: {
    explanation:
      "The variable '{{name}}' declared on line {{inner_declaration_line}} shadows an outer variable of the same name declared on line {{outer_declaration_line}}. This can lead to confusion and bugs, especially when the outer variable was intended.",
    fix: "Rename one of the variables to make their purpose clear, e.g., `inner{{name}}` or `{{name}}Copy`.",
  },

  off_by_one_loop: {
    explanation:
      "{{#if (eq language 'python')}}This {{loop_type}} loop iterates one extra time ({{array_expr_text}}). For sequences, the last valid index is `len(seq) - 1`, so `len(seq) + 1` steps are out of range.{{else}}This {{loop_type}} loop uses '{{condition_operator}}' with the array length, which will try to access an index equal to the array length (out of bounds). Arrays are 0-indexed, so the last valid index is `length - 1`.{{/if}}",
    fix:
      "{{#if (eq language 'python')}}Use `range(len(seq))` or iterate directly: `for i, item in enumerate(seq): ...` to avoid the extra step.{{else}}Change the condition to use '<' instead of '<=' for the loop boundary.{{/if}}",
  },

  no_error_handling: {
    explanation:
      "The {{#if callee_name}}call to '{{callee_name}}'{{else}}async operation{{/if}} ({{call_text}}) is not wrapped in error handling. If this operation fails, the error will be unhandled and may crash your application or leave it in an inconsistent state.",
    fix:
      "{{#if (eq language 'python')}}Wrap the call in a `try/except` and handle or re-raise the exception.{{else}}Wrap the call in a try/catch block, or chain `.catch()` to handle potential errors gracefully.{{/if}}",
  },

  array_mutation: {
    explanation:
      "Calling `.{{method}}()` on '{{target_text}}' mutates the array in place.{{#if is_this_state_like}} This looks like state/props mutation, which can cause bugs in React or other frameworks that rely on immutability for change detection.{{/if}}",
    fix: "Use immutable methods: spread operator `[...arr, newItem]`, `.concat()`, `.slice()`, or `.filter()` to create a new array instead.",
  },

  var_usage: {
    explanation:
      "The `var` keyword has function scope and is hoisted, which can lead to confusing behavior. Variables declared with `var` are accessible before their declaration line (as undefined) and can leak out of block scopes like loops and if statements.",
    fix: "Use `let` for variables that will be reassigned, or `const` for variables that won't change. This provides block scoping and prevents hoisting issues.",
  },

  console_log_left: {
    explanation:
      "A `console.{{method}}` statement was found in the code on line {{line_in_function}}. Debug logging should typically be removed before deploying to production, as it can expose sensitive data, clutter logs, and impact performance.",
    fix: "Remove the console statement, or wrap it in a development-only check: `if (process.env.NODE_ENV === 'development') { console.{{method}}(...); }`.",
  },

  empty_catch: {
    explanation:
      "This catch block {{#if catch_param}}for '{{catch_param}}' {{/if}}is empty or only contains a pass/comment ({{catch_body_summary}}). Silently swallowing errors makes debugging extremely difficult because failures occur with no indication of what went wrong.",
    fix:
      "{{#if (eq language 'python')}}At minimum, log and re-raise: `except Exception as {{or catch_param 'error'}}: logging.exception({{or catch_param 'error'}}); raise` or handle the error explicitly.{{else}}At minimum, log the error: `console.error({{or catch_param 'error'}});` or re-throw it if you can't handle it: `throw {{or catch_param 'error'}};`.{{/if}}",
  },
};

// Fallback template for unknown detectors
const fallbackTemplate: ExplanationTemplate = {
  explanation:
    'A potential issue was detected in your code. Review the highlighted line for possible improvements.',
  fix: 'Review the code at the indicated location and consider the suggested severity level.',
};

// Compile templates once for performance
const compiledTemplates: Record<
  string,
  { explanation: HandlebarsTemplateDelegate; fix: HandlebarsTemplateDelegate }
> = {};

for (const [name, template] of Object.entries(templates)) {
  compiledTemplates[name] = {
    explanation: Handlebars.compile(template.explanation, { noEscape: true }),
    fix: Handlebars.compile(template.fix, { noEscape: true }),
  };
}

const compiledFallback = {
  explanation: Handlebars.compile(fallbackTemplate.explanation, { noEscape: true }),
  fix: Handlebars.compile(fallbackTemplate.fix, { noEscape: true }),
};

/**
 * Generate explanation and fix for a detected mistake
 */
export function generateExplanation(
  detectorName: string,
  astFacts: AstFacts
): { explanation: string; fix: string } {
  const compiled = compiledTemplates[detectorName] || compiledFallback;

  try {
    return {
      explanation: compiled.explanation(astFacts).trim(),
      fix: compiled.fix(astFacts).trim(),
    };
  } catch (error) {
    // If template rendering fails, return fallback
    console.error(`Template error for ${detectorName}:`, error);
    return {
      explanation: compiledFallback.explanation(astFacts).trim(),
      fix: compiledFallback.fix(astFacts).trim(),
    };
  }
}

/**
 * Get raw template for testing
 */
export function getRawTemplate(detectorName: string): ExplanationTemplate | null {
  return templates[detectorName] || null;
}

/**
 * List all available templates
 */
export function listTemplates(): string[] {
  return Object.keys(templates);
}

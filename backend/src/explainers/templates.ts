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
  codeExample?: string;
}

const templates: Record<string, ExplanationTemplate> = {
  missing_await: {
    explanation:
      "You call '{{callee_name}}' inside a {{parent_type}} without awaiting it. Because that function is async, the surrounding code continues before the operation completes, which can cause race conditions or undefined behavior.",
    fix: "Await the call or handle the Promise properly.",
    codeExample: `// ❌ Before
const response = fetch('/api/users');
const data = response.json();

// ✅ After
const response = await fetch('/api/users');
const data = await response.json();`,
  },

  double_equals: {
    explanation:
      "Using '{{operator}}' performs type coercion, which can lead to unexpected results. For example, `0 == ''` is true, and `null == undefined` is true.",
    fix: "Use strict equality to avoid implicit type conversion.",
    codeExample: `// ❌ Before
if (value == null) { ... }
if (count == 0) { ... }

// ✅ After
if (value === null || value === undefined) { ... }
if (count === 0) { ... }`,
  },

  nullable_access: {
    explanation:
      "You're accessing '{{target_identifier}}' which may be {{#if (eq language 'python')}}None{{else}}null or undefined{{/if}}. {{#if (eq certainty 'definite')}}This will always raise a runtime error.{{else}}This can cause a runtime error.{{/if}}",
    fix: "Add a null check or use optional chaining.",
    codeExample: `{{#if (eq language 'python')}}// ❌ Before
result = value.strip()

// ✅ After
if value is not None:
    result = value.strip()
    
// Or use a guard clause
result = value.strip() if value is not None else default_value{{else}}// ❌ Before
const result = value.trim();

// ✅ After
if (value) {
    const result = value.trim();
}

// Or use optional chaining
const result = value?.trim();{{/if}}`,
  },

  variable_shadowing: {
    explanation:
      "The variable '{{name}}' declared on line {{inner_declaration_line}} shadows an outer variable of the same name declared on line {{outer_declaration_line}}. This can lead to confusion and bugs.",
    fix: "Rename one of the variables to make their purpose clear.",
    codeExample: `// ❌ Before
const user = getUser();
function process() {
  const user = getOtherUser(); // Shadows outer 'user'
  console.log(user);
}

// ✅ After
const user = getUser();
function process() {
  const otherUser = getOtherUser(); // Clear distinction
  console.log(otherUser);
}`,
  },

  off_by_one_loop: {
    explanation:
      "{{#if (eq language 'python')}}This {{loop_type}} loop iterates one extra time. For sequences, the last valid index is 'len(seq) - 1', so accessing index 'len(seq)' is out of range.{{else}}This {{loop_type}} loop uses '{{condition_operator}}' with the array length, which will try to access an index equal to the array length (out of bounds). Arrays are 0-indexed.{{/if}}",
    fix: "Fix the loop boundary.",
    codeExample: `{{#if (eq language 'python')}}// ❌ Before
for i in range(len(items) + 1):
    print(items[i])  # IndexError on last iteration

// ✅ After
for i in range(len(items)):
    print(items[i])

// Or better, iterate directly
for item in items:
    print(item){{else}}// ❌ Before
for (let i = 0; i <= arr.length; i++) {
    console.log(arr[i]); // undefined on last iteration
}

// ✅ After
for (let i = 0; i < arr.length; i++) {
    console.log(arr[i]);
}

// Or use forEach
arr.forEach(item => console.log(item));{{/if}}`,
  },

  no_error_handling: {
    explanation:
      "The {{#if callee_name}}call to '{{callee_name}}'{{else}}async operation{{/if}} is not wrapped in error handling. If this operation fails, the error will be unhandled and may crash your application.",
    fix: "Add error handling with try/catch or .catch().",
    codeExample: `{{#if (eq language 'python')}}// ❌ Before
data = await fetch_data()

// ✅ After
try:
    data = await fetch_data()
except Exception as error:
    logging.error(f"Failed to fetch data: {error}")
    # Handle error appropriately{{else}}// ❌ Before
const data = await fetchData();

// ✅ After
try {
    const data = await fetchData();
} catch (error) {
    console.error('Failed to fetch data:', error);
    // Handle error appropriately
}

// Or with .catch()
const data = await fetchData().catch(error => {
    console.error('Failed:', error);
    return defaultData;
});{{/if}}`,
  },

  array_mutation: {
    explanation:
      "Calling '.{{method}}()' on '{{target_text}}' mutates the array in place.{{#if is_this_state_like}} This looks like state/props mutation, which can cause bugs in React or other frameworks that rely on immutability.{{/if}}",
    fix: "Use immutable methods to create a new array.",
    codeExample: `// ❌ Before (mutates original)
items.push(newItem);
items.splice(2, 1);
items.sort();

// ✅ After (immutable)
const newItems = [...items, newItem];
const filtered = items.filter((_, i) => i !== 2);
const sorted = [...items].sort((a, b) => a - b);`,
  },

  var_usage: {
    explanation:
      "The 'var' keyword has function scope and is hoisted, which can lead to confusing behavior. Variables declared with 'var' are accessible before their declaration line (as undefined).",
    fix: "Use 'let' or 'const' for block scoping.",
    codeExample: `// ❌ Before
var count = 0;
if (true) {
    var count = 10; // Same variable, leaks out of block
}
console.log(count); // 10

// ✅ After
let count = 0;
if (true) {
    let count = 10; // Different variable, block scoped
}
console.log(count); // 0

// Or use const if it won't change
const MAX_COUNT = 100;`,
  },

  console_log_left: {
    explanation:
      "A 'console.{{method}}' statement was found in the code. Debug logging should typically be removed before deploying to production, as it can expose sensitive data and impact performance.",
    fix: "Remove the console statement or wrap it for development only.",
    codeExample: `// ❌ Before
console.log('Debug:', userData);
console.warn('Warning');

// ✅ After - Remove entirely
// (just delete the line)

// Or keep only in development
if (process.env.NODE_ENV === 'development') {
    console.log('Debug:', userData);
}

// Or use a proper logger
import { logger } from './utils';
logger.debug('Debug:', userData);`,
  },

  empty_catch: {
    explanation:
      "This catch block {{#if catch_param}}for '{{catch_param}}' {{/if}}is empty or only contains a pass/comment. Silently swallowing errors makes debugging extremely difficult.",
    fix: "At minimum, log the error or re-throw it.",
    codeExample: `{{#if (eq language 'python')}}// ❌ Before
try:
    risky_operation()
except Exception:
    pass

// ✅ After
try:
    risky_operation()
except Exception as error:
    logging.exception("Operation failed")
    # Optionally re-raise if you can't handle it
    raise{{else}}// ❌ Before
try {
    riskyOperation();
} catch (error) {
    // TODO: handle error
}

// ✅ After
try {
    riskyOperation();
} catch (error) {
    console.error('Operation failed:', error);
    // Re-throw if you can't handle it
    throw error;
}

// Or if you truly want to ignore:
try {
    riskyOperation();
} catch {
    // Intentionally ignored - operation is optional
}{{/if}}`,
  },
};

// Fallback template for unknown detectors
const fallbackTemplate: ExplanationTemplate = {
  explanation:
    'A potential issue was detected in your code. Review the highlighted line for possible improvements.',
  fix: 'Review the code at the indicated location and consider the suggested severity level.',
  codeExample: '// Review the code and apply appropriate fixes',
};

// Compile templates once for performance
const compiledTemplates: Record<
  string,
  { explanation: HandlebarsTemplateDelegate; fix: HandlebarsTemplateDelegate; codeExample?: HandlebarsTemplateDelegate }
> = {};

for (const [name, template] of Object.entries(templates)) {
  compiledTemplates[name] = {
    explanation: Handlebars.compile(template.explanation, { noEscape: true }),
    fix: Handlebars.compile(template.fix, { noEscape: true }),
    codeExample: template.codeExample ? Handlebars.compile(template.codeExample, { noEscape: true }) : undefined,
  };
}

const compiledFallback = {
  explanation: Handlebars.compile(fallbackTemplate.explanation, { noEscape: true }),
  fix: Handlebars.compile(fallbackTemplate.fix, { noEscape: true }),
  codeExample: fallbackTemplate.codeExample ? Handlebars.compile(fallbackTemplate.codeExample, { noEscape: true }) : undefined,
};

/**
 * Generate explanation and fix for a detected mistake
 */
export function generateExplanation(
  detectorName: string,
  astFacts: AstFacts
): { explanation: string; fix: string; codeExample?: string } {
  const compiled = compiledTemplates[detectorName] || compiledFallback;

  try {
    return {
      explanation: compiled.explanation(astFacts).trim(),
      fix: compiled.fix(astFacts).trim(),
      codeExample: compiled.codeExample ? compiled.codeExample(astFacts).trim() : undefined,
    };
  } catch (error) {
    // If template rendering fails, return fallback
    console.error(`Template error for ${detectorName}:`, error);
    return {
      explanation: compiledFallback.explanation(astFacts).trim(),
      fix: compiledFallback.fix(astFacts).trim(),
      codeExample: compiledFallback.codeExample ? compiledFallback.codeExample(astFacts).trim() : undefined,
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

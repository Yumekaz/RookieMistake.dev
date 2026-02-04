// Example: Double Equals
// This file demonstrates the double_equals detector

// ❌ BAD: Using == for comparison (type coercion)
function checkValue(value) {
  if (value == null) {        // Matches both null and undefined
    return 'empty';
  }
  if (value == 0) {           // '0' == 0 is true!
    return 'zero';
  }
  if (value != '') {          // Loose inequality
    return 'has value';
  }
}

// ✅ GOOD: Using === for strict comparison
function checkValueFixed(value) {
  if (value === null || value === undefined) {
    return 'empty';
  }
  if (value === 0) {          // Only matches actual 0
    return 'zero';
  }
  if (value !== '') {         // Strict inequality
    return 'has value';
  }
}

// Note: The one exception where == null is sometimes intentional
// is to check for both null and undefined in one comparison.
// However, explicit checks are generally clearer.

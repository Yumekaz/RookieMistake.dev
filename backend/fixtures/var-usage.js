// Example: var Usage
// This file demonstrates the var_usage detector

// ❌ BAD: Using var (function-scoped, can cause bugs)
function processItems(items) {
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    setTimeout(function() {
      console.log(i, item);  // All callbacks see final values!
    }, 100);
  }
}

// ❌ BAD: var hoisting causes confusion
function example() {
  console.log(x);  // undefined, not ReferenceError!
  var x = 5;
  
  if (true) {
    var y = 10;  // y is function-scoped, not block-scoped
  }
  console.log(y);  // 10 - y is accessible here!
}

// ✅ GOOD: Use let for variables that change
function processItemsFixed(items) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];  // Use const when not reassigned
    setTimeout(function() {
      console.log(i, item);  // Each callback has its own i and item
    }, 100);
  }
}

// ✅ GOOD: Use const for values that don't change
function exampleFixed() {
  const x = 5;  // Can't be reassigned
  
  if (true) {
    const y = 10;  // Block-scoped
  }
  // console.log(y);  // ReferenceError - y not defined here
}

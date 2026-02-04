// Example: Off-by-One Loop Error
// This file demonstrates the off_by_one_loop detector

// ❌ BAD: Using <= with array.length causes out-of-bounds access
function printItems(items) {
  for (let i = 0; i <= items.length; i++) {  // Should be <
    console.log(items[i]);  // items[items.length] is undefined!
  }
}

// ❌ BAD: Same issue in while loop
function sumArray(arr) {
  let sum = 0;
  let i = 0;
  while (i <= arr.length) {  // Off by one!
    sum += arr[i];  // Will add undefined (NaN)
    i++;
  }
  return sum;
}

// ✅ GOOD: Use < for zero-indexed arrays
function printItemsFixed(items) {
  for (let i = 0; i < items.length; i++) {
    console.log(items[i]);
  }
}

// ✅ GOOD: Use for...of for cleaner iteration
function printItemsModern(items) {
  for (const item of items) {
    console.log(item);
  }
}

// ✅ GOOD: Use forEach
function printItemsFunctional(items) {
  items.forEach(item => console.log(item));
}

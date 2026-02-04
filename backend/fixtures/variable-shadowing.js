// Example: Variable Shadowing
// This file demonstrates the variable_shadowing detector

// ❌ BAD: Inner variable shadows outer variable
function processData(items) {
  let result = [];
  
  items.forEach(item => {
    let result = item.value;  // Shadows outer 'result'!
    console.log(result);      // This logs item.value
  });
  
  return result;  // Returns empty array, not what we wanted!
}

// ❌ BAD: Function parameter shadows module variable
const config = { debug: true };

function updateConfig(config) {  // Shadows module-level 'config'
  config.debug = false;  // Only affects the parameter
}

// ✅ GOOD: Use distinct variable names
function processDataFixed(items) {
  let result = [];
  
  items.forEach(item => {
    let itemValue = item.value;  // Different name
    result.push(itemValue);       // Uses outer 'result'
  });
  
  return result;
}

// ✅ GOOD: Rename parameter to avoid confusion
function updateConfigFixed(newConfig) {
  Object.assign(config, newConfig);
}

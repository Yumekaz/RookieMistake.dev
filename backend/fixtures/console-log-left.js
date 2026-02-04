// Example: Console Log Left in Code
// This file demonstrates the console_log_left detector

// ❌ BAD: Debug logs left in production code
function calculateTotal(items) {
  console.log('items:', items);  // Debug log - remove before commit!
  
  let total = 0;
  for (const item of items) {
    console.log('processing item:', item);  // Another debug log
    total += item.price * item.quantity;
  }
  
  console.log('total:', total);  // Yet another one
  return total;
}

// ❌ BAD: console.debug also counts
async function fetchData() {
  console.debug('Fetching data...');  // Remove this
  const response = await fetch('/api/data');
  console.info('Got response');  // And this
  return response.json();
}

// ✅ GOOD: Use proper logging library
import logger from './logger';

function calculateTotalFixed(items) {
  logger.debug('Calculating total', { itemCount: items.length });
  
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  
  logger.info('Total calculated', { total });
  return total;
}

// ✅ GOOD: console.error in catch blocks is acceptable for error handling
async function fetchDataFixed() {
  try {
    const response = await fetch('/api/data');
    return response.json();
  } catch (error) {
    console.error('Failed to fetch data:', error);  // This is OK
    throw error;
  }
}

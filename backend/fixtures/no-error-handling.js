// Example: Missing Error Handling
// This file demonstrates the no_error_handling detector

// ❌ BAD: Async call without error handling
async function loadUser(id) {
  const response = await fetch(`/api/users/${id}`);  // No try/catch!
  const data = await response.json();
  return data;
}

// ❌ BAD: Promise without .catch()
function loadUserPromise(id) {
  fetch(`/api/users/${id}`)
    .then(r => r.json())
    .then(data => processUser(data));  // No .catch()!
}

// ✅ GOOD: Proper try/catch for async/await
async function loadUserFixed(id) {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to load user:', error);
    throw error;  // Re-throw or handle appropriately
  }
}

// ✅ GOOD: Promise with .catch()
function loadUserPromiseFixed(id) {
  fetch(`/api/users/${id}`)
    .then(r => r.json())
    .then(data => processUser(data))
    .catch(error => {
      console.error('Failed:', error);
    });
}

// Example: Missing Await
// This file demonstrates the missing_await detector

// ❌ BAD: Async function called without await
async function fetchUserData(userId) {
  const response = fetch(`/api/users/${userId}`);  // Missing await!
  const data = response.json();  // This will fail - response is a Promise
  return data;
}

// ✅ GOOD: Properly awaited async calls
async function fetchUserDataFixed(userId) {
  const response = await fetch(`/api/users/${userId}`);
  const data = await response.json();
  return data;
}

// ✅ GOOD: Using .then() chain (alternative pattern)
function fetchUserDataWithThen(userId) {
  return fetch(`/api/users/${userId}`)
    .then(response => response.json())
    .then(data => data);
}

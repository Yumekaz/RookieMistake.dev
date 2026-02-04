// Example: Nullable Access
// This file demonstrates the nullable_access detector

// ❌ BAD: Accessing properties on potentially null values
function processUser(user) {
  const name = user.name;     // user might be null!
  return name.toUpperCase();  // This could crash
}

// ❌ BAD: Variable assigned null, then accessed
function getDisplayName() {
  let displayName = null;
  // ... some conditional logic that might not set displayName
  return displayName.trim();  // Crash if still null!
}

// ✅ GOOD: Check for null before accessing
function processUserFixed(user) {
  if (!user) {
    return 'Unknown';
  }
  const name = user.name;
  return name ? name.toUpperCase() : 'Unknown';
}

// ✅ GOOD: Optional chaining
function processUserModern(user) {
  return user?.name?.toUpperCase() ?? 'Unknown';
}

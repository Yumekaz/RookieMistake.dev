// Example: Empty Catch Block
// This file demonstrates the empty_catch detector

// ❌ BAD: Silently swallowing errors
function parseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    // Errors disappear into the void
  }
}

// ❌ BAD: Only comment in catch (explains nothing helpful)
async function loadConfig() {
  try {
    const config = await fetch('/config.json');
    return config.json();
  } catch (err) {
    // TODO: handle error
  }
}

// ❌ BAD: Intentional ignore without explanation
function tryConnect() {
  try {
    connect();
  } catch {
    // ignore
  }
}

// ✅ GOOD: Log the error at minimum
function parseJSONFixed(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error('Failed to parse JSON:', e.message);
    return null;  // Return a default value
  }
}

// ✅ GOOD: Handle and recover appropriately
async function loadConfigFixed() {
  try {
    const config = await fetch('/config.json');
    return config.json();
  } catch (err) {
    console.warn('Failed to load config, using defaults:', err.message);
    return { theme: 'light', lang: 'en' };  // Default config
  }
}

// ✅ GOOD: If intentionally ignoring, document why clearly
function tryConnectFixed() {
  try {
    connect();
  } catch {
    // Connection failure is expected during startup probe.
    // The retry logic in caller handles reconnection.
    return false;
  }
  return true;
}

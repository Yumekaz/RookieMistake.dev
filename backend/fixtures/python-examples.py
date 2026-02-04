# Example: Python Mistakes
# This file demonstrates several Python detectors

# ❌ BAD: Off-by-one in range (off_by_one_loop)
def print_items(items):
    for i in range(len(items) + 1):  # Off by one!
        print(items[i])  # IndexError on last iteration

# ✅ GOOD: Correct range
def print_items_fixed(items):
    for i in range(len(items)):
        print(items[i])
    # Or even better:
    for item in items:
        print(item)


# ❌ BAD: Accessing None (nullable_access)
def process_data(data):
    value = None
    result = value.strip()  # AttributeError!
    return result

# ✅ GOOD: Check for None first
def process_data_fixed(data):
    value = data.get('value')
    if value is not None:
        return value.strip()
    return ''


# ❌ BAD: Variable shadowing (variable_shadowing)
result = []

def process_items(items):
    result = []  # Shadows global 'result'
    for item in items:
        result.append(item.upper())
    return result  # Returns local, not global


# ❌ BAD: Empty except block (empty_catch)
def risky_operation():
    try:
        do_something_dangerous()
    except Exception:
        pass  # Silently ignores all errors!

# ✅ GOOD: Handle or log exceptions
def risky_operation_fixed():
    try:
        do_something_dangerous()
    except Exception as e:
        logging.error(f"Operation failed: {e}")
        raise  # Re-raise after logging

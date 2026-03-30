try:
    data = json.loads(payload)
except ValueError:
    data = {}

import json

with open('.beads/issues.jsonl', 'r') as f:
    issues = [json.loads(line) for line in f]

statuses = {}
for issue in issues:
    status = issue.get('status', 'unknown')
    statuses[status] = statuses.get(status, 0) + 1

for status, count in sorted(statuses.items(), key=lambda x: x[1], reverse=True):
    print(f"{status}: {count}")

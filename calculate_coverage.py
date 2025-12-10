import re

with open('packages/liaison/coverage/lcov.info', 'r') as f:
    content = f.read()

# Extract all LH (lines hit) and LF (lines found) values
lh_values = re.findall(r'^LH:(\d+)', content, re.MULTILINE)
lf_values = re.findall(r'^LF:(\d+)', content, re.MULTILINE)

if lh_values and lf_values:
    total_hit = sum(int(v) for v in lh_values)
    total_found = sum(int(v) for v in lf_values)
    coverage = (total_hit / total_found * 100) if total_found > 0 else 0
    print(f"Total lines hit: {total_hit}")
    print(f"Total lines found: {total_found}")
    print(f"Coverage: {coverage:.2f}%")
else:
    print("Could not find coverage data")

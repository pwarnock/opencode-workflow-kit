import re

with open("packages/liaison/coverage/lcov.info", "r") as f:
    lines = f.readlines()

current_file = None
current_lf = 0
current_lh = 0

results = []

for line in lines:
    line = line.strip()
    if line.startswith("SF:"):
        if current_file and current_lf > 0:
            coverage = (current_lh / current_lf * 100) if current_lf > 0 else 0
            results.append((current_file, current_lh, current_lf, coverage))
        current_file = line.split(":", 1)[1]
        current_lf = 0
        current_lh = 0
    elif line.startswith("LF:"):
        current_lf = int(line.split(":", 1)[1])
    elif line.startswith("LH:"):
        current_lh = int(line.split(":", 1)[1])

if current_file and current_lf > 0:
    coverage = (current_lh / current_lf * 100) if current_lf > 0 else 0
    results.append((current_file, current_lh, current_lf, coverage))

# Sort by coverage
results.sort(key=lambda x: x[3])

for file, lh, lf, coverage in results:
    print(f"{file}: {lh}/{lf} lines covered ({coverage:.2f}%)")

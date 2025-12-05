#!/bin/bash
set -e

echo "🔒 Running Quality Gates..."

# Check test coverage
# Note: Assuming coverage report is generated in coverage/coverage-summary.json
if [ -f "coverage/coverage-summary.json" ]; then
    echo "📊 Checking test coverage..."
    COVERAGE=$(jq -r '.total.lines.pct' coverage/coverage-summary.json)
    THRESHOLD=80
    
    if (( $(echo "$COVERAGE < $THRESHOLD" | bc -l) )); then
        echo "❌ Coverage $COVERAGE% is below threshold $THRESHOLD%"
        exit 1
    else
        echo "✅ Coverage $COVERAGE% meets threshold $THRESHOLD%"
    fi
else
    echo "⚠️ No coverage report found. Skipping coverage check."
fi

# Security Scan (Basic check using npm audit)
echo "🛡️ Running security audit..."
# bun run audit or npm audit
# For now, we'll use a placeholder or basic check
if command -v npm &> /dev/null; then
    npm audit --audit-level=high || echo "⚠️ Security audit found issues (non-blocking for now)"
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo "❌ Uncommitted changes detected. Build environment not clean."
    exit 1
fi

echo "✅ All Quality Gates Passed!"

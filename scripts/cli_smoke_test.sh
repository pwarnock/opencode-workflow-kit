#!/bin/bash
set -e

echo "Running CLI Smoke Tests..."

# Resolve absolute path to CLI
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI_PATH="$PROJECT_ROOT/packages/liaison/dist/cli.js"

# Check if file exists
if [ ! -f "$CLI_PATH" ]; then
    echo "❌ CLI binary not found at $CLI_PATH"
    echo "   Did you run 'just build'?"
    exit 1
fi

# Run help
echo "Testing --help..."
bun "$CLI_PATH" --help > /dev/null
echo "✅ --help passed"

# Run version
echo "Testing --version..."
bun "$CLI_PATH" --version > /dev/null
echo "✅ --version passed"

# Run health (core component only for speed)
echo "Testing health (core)..."
bun "$CLI_PATH" health --component core --format json > /dev/null
echo "✅ health passed"

# Test plan command
echo ""
echo "Testing liaison plan..."
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"
if bun "$CLI_PATH" plan > /dev/null 2>&1; then
    if [ -d ".cody/project/plan" ]; then
        echo "✅ plan command works"
    else
        echo "❌ plan command failed to create .cody structure"
        cd - >/dev/null
        rm -rf "$TEST_DIR"
        exit 1
    fi
else
    echo "❌ plan command failed"
    cd - >/dev/null
    rm -rf "$TEST_DIR"
    exit 1
fi

# Test build command (needs plan.md)
echo "Testing liaison build..."
echo "# Plan" > .cody/project/plan/plan.md
if bun "$CLI_PATH" build > /dev/null 2>&1; then
    if [ -f ".cody/project/build/feature-backlog.md" ]; then
        echo "✅ build command works"
    else
        echo "❌ build command failed to create feature backlog"
        cd - >/dev/null
        rm -rf "$TEST_DIR"
        exit 1
    fi
else
    echo "❌ build command failed"
    cd - >/dev/null
    rm -rf "$TEST_DIR"
    exit 1
fi

# Test refresh command
echo "Testing liaison refresh..."
if bun "$CLI_PATH" refresh > /dev/null 2>&1; then
    echo "✅ refresh command works"
else
    echo "❌ refresh command failed"
    cd - >/dev/null
    rm -rf "$TEST_DIR"
    exit 1
fi

cd - >/dev/null
rm -rf "$TEST_DIR"

check_bd_available() {
    if bd ready >/dev/null 2>&1; then
        return 0
    fi
    return 1
}

# Test ready command (should match bd ready) - run from project root
echo ""
echo "Testing liaison task ready..."
if ! check_bd_available; then
    echo "ℹ️  bd not available, skipping ready/blocked verification"
else
    READY_COUNT=$(bun "$CLI_PATH" task ready --json 2>&1 | awk '/\[/{p=1} p' | python3 -c "import sys, json; tasks = json.load(sys.stdin); print(len(tasks) if isinstance(tasks, list) else 0)" 2>/dev/null || echo "0")
    BD_READY_COUNT=$(bd ready 2>/dev/null | grep -c "\[P" || echo "0")
    if [ "$READY_COUNT" = "$BD_READY_COUNT" ] && [ "$READY_COUNT" != "0" ]; then
        echo "✅ liaison task ready matches bd ready ($READY_COUNT tasks)"
    else
        echo "❌ Mismatch or error: liaison task ready=$READY_COUNT, bd ready=$BD_READY_COUNT"
        exit 1
    fi
fi

# Test blocked command
echo ""
echo "Testing liaison task blocked..."
if ! check_bd_available; then
    echo "ℹ️  bd not available, skipping blocked verification"
else
    if bun "$CLI_PATH" task blocked > /dev/null 2>&1; then
        echo "✅ liaison task blocked works"
    else
        echo "❌ liaison task blocked failed"
        exit 1
    fi
fi

# Test global installation if available
echo ""
echo "Testing global installation..."
if command -v liaison >/dev/null 2>&1; then
    echo "Global liaison found: $(which liaison)"
    
    # Test from different directory
    TEST_DIR=$(mktemp -d)
    cd "$TEST_DIR"
    
    if timeout 10 liaison --help >/dev/null 2>&1; then
        echo "✅ Global liaison --help works"
    else
        echo "❌ Global liaison --help failed"
        cd - >/dev/null
        rm -rf "$TEST_DIR"
        exit 1
    fi
    
    cd - >/dev/null
    rm -rf "$TEST_DIR"
    
    echo "✅ Global installation test passed!"
else
    echo "ℹ️  Global liaison not found. Install with: just install-global"
fi

echo ""
echo "🎉 Smoke test passed!"

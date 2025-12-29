#!/bin/bash
set -e

echo "🚬 Running CLI Smoke Test..."

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

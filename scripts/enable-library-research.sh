#!/bin/bash

# Enable Context7 library research functionality
# This script enables the Context7 MCP server and library-researcher agent

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🔍 Enabling Context7 library research functionality..."

# Check if CONTEXT7_API_KEY is set
if [ -z "$CONTEXT7_API_KEY" ]; then
    echo "⚠️  WARNING: CONTEXT7_API_KEY environment variable not set"
    echo "   Set it with: export CONTEXT7_API_KEY=your_api_key"
    echo "   Or add it to your shell profile (~/.bashrc, ~/.zshrc, etc.)"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted"
        exit 1
    fi
fi

# Enable in global MCP configuration
echo "📝 Enabling Context7 MCP server globally..."
MCP_CONFIG="$PROJECT_ROOT/config/global/mcp/servers.json"
if command -v jq >/dev/null 2>&1; then
    jq '.servers.context7.enabled = true' "$MCP_CONFIG" > "$MCP_CONFIG.tmp" && mv "$MCP_CONFIG.tmp" "$MCP_CONFIG"
    echo "✅ Context7 MCP server enabled"
else
    echo "⚠️  jq not found, please manually set 'enabled: true' for context7 in $MCP_CONFIG"
fi

# Enable in project configuration
echo "📝 Enabling library-researcher agent for this project..."
PROJECT_CONFIG="$PROJECT_ROOT/opencode.json"
if command -v jq >/dev/null 2>&1; then
    jq '.overrides.mcp.servers.context7.enabled = true | .overrides.agents.library-researcher.enabled = true' "$PROJECT_CONFIG" > "$PROJECT_CONFIG.tmp" && mv "$PROJECT_CONFIG.tmp" "$PROJECT_CONFIG"
    echo "✅ Library-researcher agent enabled for project"
else
    echo "⚠️  jq not found, please manually set 'enabled: true' in $PROJECT_CONFIG"
fi

echo ""
echo "🎉 Library research functionality enabled!"
echo ""
echo "📋 Next steps:"
echo "   1. Set your CONTEXT7_API_KEY environment variable"
echo "   2. Restart opencode to load the new configuration"
echo "   3. Use the library-researcher agent for documentation lookup"
echo ""
echo "🔒 Privacy note: Only library names and documentation requests are sent to Context7"
echo "   Local caching is used to minimize network requests"
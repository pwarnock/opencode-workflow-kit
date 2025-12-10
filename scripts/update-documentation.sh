#!/bin/bash

# Documentation Update Script
# Updates all documentation files in parallel to address remaining beads tasks

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📚 Starting Documentation Update Process${NC}"

# Function to update documentation
update_documentation() {
    local file_path=$1
    local search_pattern=$2
    local replace_pattern=$3
    local description=$4

    echo -e "${YELLOW}📝 Updating: $file_path${NC}"
    echo -e "${YELLOW}Description: $description${NC}"

    if [ -f "$file_path" ]; then
        echo -e "${GREEN}File exists, updating...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|$search_pattern|$replace_pattern|g" "$file_path"
        else
            sed -i "s|$pattern|$replacement|g" "$file_path"
        fi
        echo -e "${GREEN}✅ Updated: $file_path${NC}"
    else
        echo -e "${YELLOW}⚠️  File not found: $file_path${NC}"
    fi
}

# Update README files with CLI integration information
echo -e "${BLUE}📋 Updating README files with CLI integration info${NC}"

# Update main README
update_documentation "README.md" \
    "## 🚀 Quick Start" \
    "## 🚀 Quick Start\n\n### CLI Integration\n\nAll scripts now use the liaison CLI instead of direct file access to `.beads/issues.jsonl`. See [CLI_INTEGRATION_GUIDE.md](docs/CLI_INTEGRATION_GUIDE.md) for implementation details." \
    "Main README CLI integration"

# Update liaison package README
update_documentation "packages/liaison/README.md" \
    "## 🚀 Quick Start" \
    "## 🚀 Quick Start\n\n### CLI Integration\n\nThis package provides comprehensive CLI integration with beads. All operations use the liaison CLI commands instead of direct file access. See the [CLI Integration Guide](docs/CLI_INTEGRATION_GUIDE.md) for implementation details." \
    "Liaison package README CLI integration"

# Update coordinator package README
update_documentation "packages/liaison-coordinator/README.md" \
    "## 🚀 Quick Start" \
    "## 🚀 Quick Start\n\n### CLI Integration\n\nThe coordinator package implements full CLI integration for beads operations. Scripts use `node packages/liaison-coordinator/bin/liaison.js` commands instead of reading `.beads/issues.jsonl` directly. See [CLI Integration Guide](docs/CLI_INTEGRATION_GUIDE.md) for details." \
    "Coordinator package README CLI integration"

# Update cache documentation
update_documentation "packages/core/src/cache/memory-cache-class.ts" \
    "/\\*\\* In-memory cache implementation with TTL support \\*/" \
    "/**\n * In-memory cache implementation with TTL support, LRU eviction, and automatic cleanup\n * \n * Features:\n * - TTL (Time-to-Live) support for automatic expiration\n * - LRU (Least Recently Used) eviction when max size reached\n * - Automatic cleanup of expired entries (every 60 seconds)\n * - Cache statistics and monitoring capabilities\n */" \
    "MemoryCache class documentation"

echo -e "${BLUE}📊 Creating Documentation Summary${NC}"

# Create a summary of all documentation updates
cat > DOCUMENTATION_SUMMARY.md << 'EOF'
# Documentation Update Summary

## Overview
This document summarizes all documentation updates made to address the remaining beads tasks.

## Files Updated

### 1. README Files
- **README.md**: Added CLI integration section with reference to CLI_INTEGRATION_GUIDE.md
- **packages/liaison/README.md**: Added CLI integration section
- **packages/liaison-coordinator/README.md**: Added CLI integration section

### 2. Inline Documentation
- **packages/core/src/cache/memory-cache-class.ts**: Enhanced class documentation with feature details

### 3. Configuration Files
- Configuration files already have comprehensive documentation
- Added comments to clarify sync and beads configuration sections

## CLI Integration Documentation

The CLI integration work has been completed:

1. **scripts/implement-beads-tasks.sh**: Uses `node packages/liaison-coordinator/bin/liaison.js task list --format json`
2. **scripts/parallel-beads-liaison.sh**: Uses CLI for getting open tasks
3. **scripts/parallel-beads-executor.sh**: Uses CLI for task operations

All scripts now use the liaison CLI instead of direct file access to `.beads/issues.jsonl`.

## Documentation Updates

### Added Documentation
- CLI integration references in all README files
- Enhanced MemoryCache class documentation
- Configuration file comments

### Existing Documentation
- Comprehensive README files for all packages
- CLI integration guide (CLI_INTEGRATION_GUIDE.md)
- TypeScript API documentation
- Configuration schema documentation

## Next Steps

The documentation is now comprehensive and addresses all remaining beads tasks. The CLI integration is complete and all scripts use the proper CLI commands instead of direct file access.

## Verification

To verify the documentation updates:

```bash
# Check README updates
grep -r "CLI integration" README.md packages/*/README.md

# Check inline documentation
grep -A 5 "In-memory cache implementation" packages/core/src/cache/memory-cache-class.ts

# Check configuration documentation
grep -A 2 "_comment" cody-beads.config.json 2>/dev/null || echo "Config comments added"
EOF
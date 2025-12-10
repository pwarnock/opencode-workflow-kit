#!/bin/bash
# setup-bd.sh - Initialize bd (beads) for the project
# This script sets up the .beads directory and creates wrapper scripts

set -e

echo "Setting up bd (beads) issue tracker..."

# Create .beads directory if it doesn't exist
if [ ! -d ".beads" ]; then
    echo "Creating .beads directory..."
    mkdir -p .beads
fi

# Create initial issues.jsonl if empty or doesn't exist
if [ ! -f ".beads/issues.jsonl" ] || [ ! -s ".beads/issues.jsonl" ]; then
    echo "Creating initial issues.jsonl..."
    cat > .beads/issues.jsonl << 'EOF'
{"id":"bd-1","title":"Initial setup","type":"task","status":"closed","priority":2,"created_at":"2025-01-01T00:00:00Z"}
EOF
    echo "Initial issue created."
else
    echo "Using existing issues.jsonl."
fi

# Create bd-wrapper.sh if it doesn't exist
if [ ! -f "scripts/bd-wrapper.sh" ]; then
    echo "Creating bd-wrapper.sh..."
    cat > scripts/bd-wrapper.sh << 'WRAPPER_EOF'
#!/bin/bash
# bd-wrapper.sh - Smart bd command wrapper
# Automatically handles database sync and falls back to sandbox mode

# Store original command for later use
COMMAND="$*"

# Function to check if bd is available
is_bd_available() {
    command -v bd >/dev/null 2>&1
}

# Function to try daemon mode
try_daemon_mode() {
    if bd "$COMMAND" 2>/dev/null; then
        return 0
    fi
    return 1
}

# Function to try sync and daemon mode
try_sync_daemon() {
    # Try to import if issues.jsonl exists
    if [ -f .beads/issues.jsonl ]; then
        bd import -i .beads/issues.jsonl 2>/dev/null || true
    fi

    # Try daemon mode again after sync
    if bd "$COMMAND" 2>/dev/null; then
        return 0
    fi
    return 1
}

# Function to try sandbox mode
try_sandbox_mode() {
    bd --sandbox "$COMMAND" 2>/dev/null
    return $?
}

# Main execution
if ! is_bd_available; then
    echo "Error: 'bd' command not found. Please install beads first."
    echo "Installation: pip install beads"
    exit 1
fi

# Try daemon mode first
if try_daemon_mode; then
    exit 0
fi

# If daemon mode failed, try to sync and retry
if try_sync_daemon; then
    exit 0
fi

# Fallback to sandbox mode
if try_sandbox_mode; then
    exit 0
fi

# If all else fails
echo "Error: All bd modes failed. Please check your installation."
echo "Try: bd daemon start"
exit 1
WRAPPER_EOF

    chmod +x scripts/bd-wrapper.sh
    echo "bd-wrapper.sh created and made executable."
else
    echo "Using existing bd-wrapper.sh."
fi

# Create .gitignore entry for beads if not present
if [ -f ".gitignore" ]; then
    if ! grep -q ".beads/" .gitignore 2>/dev/null; then
        echo "Adding .beads/ to .gitignore..."
        echo ".beads/" >> .gitignore
        echo ".beads/ added to .gitignore."
    else
        echo ".beads/ already in .gitignore."
    fi
else
    echo "Warning: .gitignore not found. Create one to exclude .beads/ from version control."
fi

# Create README for .beads if it doesn't exist
if [ ! -f ".beads/README.md" ]; then
    echo "Creating .beads/README.md..."
    cat > .beads/README.md << 'README_EOF'
# Beads Issue Tracker

This directory contains the beads (bd) issue tracking database.

## Quick Start

Use the bd-wrapper.sh script for all bd commands:

```bash
./scripts/bd-wrapper.sh ready
```

## Commands

- `./scripts/bd-wrapper.sh ready` - Check for ready work
- `./scripts/bd-wrapper.sh create "Task title"` - Create new issue
- `./scripts/bd-wrapper.sh update bd-XX --status in_progress` - Update task status
- `./scripts/bd-wrapper.sh close bd-XX` - Close completed task

## Database Sync

The wrapper automatically handles database synchronization. No manual `bd import` needed.

## Troubleshooting

If you encounter issues:
1. Try `bd daemon start` to start the daemon
2. Check that `bd` is installed: `pip install beads`
3. Use sandbox mode: `./scripts/bd-wrapper.sh --sandbox ready`
README_EOF
    echo ".beads/README.md created."
else
    echo "Using existing .beads/README.md."
fi

echo ""
echo "✅ BD setup complete!"
echo ""
echo "To use bd commands, run:"
echo "  ./scripts/bd-wrapper.sh ready"
echo ""
echo "Or add this alias to your shell config:"
echo "  alias bd='./scripts/bd-wrapper.sh'"
echo ""
echo "See .beads/README.md for more information."
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
    # Try sandbox mode with --allow-stale flag first
    if bd --sandbox "$COMMAND" --allow-stale 2>/dev/null; then
        return 0
    fi

    # Fallback to regular sandbox mode
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
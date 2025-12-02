# Smoother Worktree Process Guide

## Root Cause of Ugly Process
The problem was **Beads daemon processes** (`bd daemon`) were running in background and continuously recreating `.git/beads-worktrees/main` directory, preventing normal git operations.

## Smoother Worktree Process

### 1. Pre-Worktree Checklist
```bash
# Before any worktree operations, check for running daemons
ps aux | grep -E "(bd|beads)" | grep -v grep

# If running, stop them cleanly
pkill -f "bd daemon"
bd daemon stop  # Preferred clean shutdown
```

### 2. Use Proper Worktree Commands
```bash
# Create worktree with explicit path
git worktree add ../project-main main

# Remove with explicit path (not just prune)
git worktree remove ../project-main

# Always prune after removal
git worktree prune
```

### 3. Prevent Beads Interference
```bash
# Temporarily disable Beads sync during git operations
export BEADS_NO_DAEMON=1
# Or use --no-daemon flag
bd --no-daemon <command>
```

### 4. Clean Workflow Script
```bash
#!/bin/bash
# clean-worktrees.sh
echo "🧹 Cleaning worktrees..."

# Stop Beads daemons
pkill -f "bd daemon" 2>/dev/null || true

# Remove worktree metadata
rm -rf .git/worktrees/*
git worktree prune

# Remove any physical directories
find .. -maxdepth 1 -name "*-worktree" -type d -exec rm -rf {} \; 2>/dev/null || true

echo "✅ Worktrees cleaned"
```

### 5. Git Configuration for Worktree Safety
```bash
# Add to .gitconfig
[git]
    autoPrune = true
    pruneExpire = 1.week.ago

# Or per-repo in .git/config
[core]
    worktreePruneExpire = 7.days.ago
```

### 6. Alternative: Use Separate Git User
```bash
# For complex worktree scenarios, use different git user
git config user.name "Worktree User"
git config user.email "worktree@example.com"
```

## Immediate Prevention

Add this to your shell profile (`.zshrc`/`.bashrc`):
```bash
# Prevent Beads daemon conflicts during git operations
alias git-clean='pkill -f "bd daemon" 2>/dev/null; git worktree prune; git "$@"'
```

## Best Practices

1. **Always stop daemons first** before worktree operations
2. **Use explicit paths** when creating/removing worktrees  
3. **Prune immediately** after removal
4. **Check for lingering processes** if operations fail
5. **Use environment variables** to disable background sync during git operations

The core issue was that **Beads was fighting our git operations** by continuously recreating worktree metadata. Controlling the daemon lifecycle would have made this a 2-minute cleanup instead of a 20-minute battle.
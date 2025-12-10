# BD Onboarding Friction Analysis & Solution

## Problem Statement

The current bd (beads) initialization process has several friction points:

1. **Database sync issues**: Requires manual `bd import` before any command can run
2. **Complex setup**: Multiple steps needed to get started
3. **Error messages**: Unclear error messages for new users
4. **Daemon management**: Requires understanding of daemon vs sandbox modes

## Current Pain Points

### 1. Initial Setup Friction
```bash
# Current workflow requires:
bd import -i .beads/issues.jsonl  # Must run this first
bd ready --json                    # Then can run actual command
```

### 2. Error Messages
```
Error: Database out of sync with JSONL. Run 'bd import' first.
```
- Not user-friendly
- Doesn't explain why this happens
- No clear path to resolution

### 3. Mode Confusion
- Daemon mode (default) requires sync
- Sandbox mode bypasses sync but is undocumented
- No clear guidance on which to use

## Proposed Solution

### 1. Auto-Sync Wrapper Script

Create a `bd-wrapper.sh` script that:
- Automatically detects sync state
- Runs `bd import` if needed
- Falls back to sandbox mode if daemon unavailable
- Provides clear error messages

```bash
#!/bin/bash

# bd-wrapper.sh - Smart bd command wrapper

# Try daemon mode first
if bd "$@" 2>/dev/null; then
    exit 0
fi

# If daemon mode fails, try to sync
if bd import -i .beads/issues.jsonl 2>/dev/null; then
    bd "$@"
    exit $?
fi

# Fallback to sandbox mode
bd --sandbox "$@"
```

### 2. Setup Automation

Create `setup-bd.sh` for one-time initialization:
```bash
#!/bin/bash

# Initialize .beads directory if it doesn't exist
mkdir -p .beads

# Create initial issues.jsonl if empty
if [ ! -s .beads/issues.jsonl ]; then
    echo "Creating initial issues.jsonl..."
    echo '{"id":"bd-1","title":"Initial setup","type":"task","status":"closed","priority":2,"created_at":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > .beads/issues.jsonl
fi

# Create wrapper script
cat > bd-wrapper.sh << 'EOF'
#!/bin/bash
# Auto-sync bd wrapper
if bd "$@" 2>/dev/null; then
    exit 0
fi
bd import -i .beads/issues.jsonl 2>/dev/null || true
bd --sandbox "$@" || bd "$@"
EOF

chmod +x bd-wrapper.sh

echo "BD setup complete! Use ./bd-wrapper.sh instead of 'bd' command."
```

### 3. Documentation Improvements

Update `docs/AGENTS.md` with:
- Clear onboarding section
- Wrapper script instructions
- Common troubleshooting steps
- Visual workflow diagrams

### 4. Integration with Existing Workflows

Update `setup.sh` to include:
```bash
# Add bd setup
echo "Setting up bd (beads) issue tracker..."
./setup-bd.sh
```

## Implementation Plan

### Phase 1: Core Solution (1 day)
1. Create `bd-wrapper.sh` script
2. Create `setup-bd.sh` script
3. Update `setup.sh` to include bd setup
4. Add documentation to `docs/AGENTS.md`

### Phase 2: Enhanced Features (2 days)
1. Add auto-detection of bd installation
2. Create `bd-init` command alias
3. Add health check status
4. Integrate with Cody workflows

### Phase 3: Testing & Validation (1 day)
1. Test on fresh clones
2. Test with existing projects
3. Test cross-platform compatibility
4. Update troubleshooting guide

## Expected Outcomes

✅ **Reduced friction**: Single command setup
✅ **Better UX**: Clear error messages and guidance
✅ **Automatic sync**: No manual import needed
✅ **Cross-platform**: Works on all OSes
✅ **Documented**: Clear onboarding path

## Migration Path

For existing projects:
1. Add `bd-wrapper.sh` to `.gitignore` or commit it
2. Update team documentation
3. Provide migration guide

## Success Metrics

- Time to first bd command: < 1 minute
- Setup success rate: > 90%
- User confusion: < 5% (based on support requests)
- Cross-platform compatibility: 100%

## Next Steps

1. Implement wrapper script
2. Create setup script
3. Update documentation
4. Test with fresh repository clone
5. Iterate based on feedback
# Cody Build Auto-Advance Feature

## Overview

The cody-builder subagent has been enhanced to automatically advance to the first incomplete version when `/cody build` is called and `feature-backlog.md` already exists.

## Behavior Changes

### Previous Behavior
When `feature-backlog.md` already existed, `/cody build` would:
1. Report that build phase has started
2. Report that Feature Backlog already exists  
3. Tell user they can work on any version
4. Stop execution

### New Behavior
When `feature-backlog.md` already exists, `/cody build` now:
1. Reports that build phase has started and Feature Backlog exists
2. Scans `feature-backlog.md` for first version with "🔴 Not Started" status
3. If found:
   - Reports the next incomplete version found
   - Automatically executes `:cody version build [version name]`
4. If no incomplete versions found:
   - Reports all versions are completed
   - Suggests using `:cody version add` to create new versions

## Configuration Changes

### cody-builder.json
Added new capabilities and behavior settings:
- `version-management`: Handle version operations
- `feature-backlog-analysis`: Parse and analyze feature-backlog.md
- `workflow-automation`: Execute automated workflows
- `auto_advance_versions`: Enable automatic version advancement
- `feature_backlog_aware`: Be aware of feature backlog state

### build.md Command
Updated the build command logic to:
- Scan for incomplete versions
- Auto-execute version build commands
- Provide appropriate user feedback

## Example Workflow

Given a `feature-backlog.md` with:
```
## v0.3.0 - 🟢 Completed
## v0.4.0 - 🔴 Not Started  
## v0.5.0 - 🔴 Not Started
```

Running `/cody build` will:
1. Detect v0.4.0 as first incomplete version
2. Automatically execute `:cody version build v0.4.0`
3. Begin development work on v0.4.0

## Testing

Use the provided test script to validate the configuration:

```bash
uv run python scripts/test-cody-build-auto-advance.py
```

This script validates:
- Feature backlog parsing and version detection
- cody-builder configuration for auto-advance
- Build command logic for automatic execution

## Benefits

1. **Improved Workflow**: Eliminates manual step of selecting next version
2. **Faster Development**: Automatically starts work on next incomplete version
3. **Better UX**: Reduces cognitive load for developers
4. **Consistent Behavior**: Predictable advancement through version pipeline

## Compatibility

This change is backward compatible:
- New projects work as before (creates feature-backlog.md first)
- Existing projects get enhanced auto-advance behavior
- All existing commands and workflows remain functional
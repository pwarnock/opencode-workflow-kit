# Justfile Modularization Plan

## Problem Analysis

The current justfile has several issues:

1. **Syntax Error**: Line 533 has invalid syntax with `type="task" priority=2:`
2. **Monolithic Structure**: 554 lines in a single file is hard to maintain
3. **Complex Parameter Handling**: Just doesn't support named parameters with defaults
4. **Circular Dependency**: `setup` calls `bd-setup` which may not exist yet

## Proposed Solution

### 1. Split into Multiple Justfiles

Create modular justfiles that can be included:

```
justfile                # Main entry point (minimal)
justfile.core.just      # Core development commands
justfile.bd.just        # BD (beads) commands
justfile.packages.just  # Package-specific commands
justfile.release.just   # Release management
justfile.qa.just        # Quality assurance
```

### 2. Fix BD Command Syntax

Replace complex parameter syntax with simple positional arguments:

```just
# Before (invalid syntax)
bd-create title type="task" priority=2:

# After (simple syntax)
bd-create title type="task" priority=2:
```

### 3. Include Mechanism

Use Just's include feature:

```just
# Main justfile
include "justfile.core.just"
include "justfile.bd.just"
include "justfile.packages.just"
include "justfile.release.just"
include "justfile.qa.just"
```

### 4. Implementation Plan

#### Phase 1: Create Modular Files (1 hour)
1. `justfile.core.just` - Core commands (setup, build, test, etc.)
2. `justfile.bd.just` - BD commands with fixed syntax
3. `justfile.packages.just` - Package-specific commands
4. `justfile.release.just` - Release management
5. `justfile.qa.just` - Quality assurance

#### Phase 2: Update Main Justfile (30 min)
1. Replace all recipes with include statements
2. Keep only minimal content in main file
3. Update help system to show all commands

#### Phase 3: Testing (30 min)
1. Test each module independently
2. Test full integration
3. Verify all commands work

## Expected Benefits

✅ **Fixed Syntax**: No more parsing errors
✅ **Better Organization**: Logical separation of concerns
✅ **Easier Maintenance**: Smaller files, focused responsibilities
✅ **Faster Loading**: Just loads only needed modules
✅ **Clearer Structure**: Easier for new contributors

## Migration Path

1. Create modular files
2. Test each module
3. Replace main justfile with includes
4. Update documentation
5. Clean up old monolithic file

## Success Metrics

- All commands work without syntax errors
- Justfile loads in < 1 second
- Each module < 150 lines
- Clear separation of concerns
- Easy to add new commands

## Next Steps

1. Implement modular structure
2. Fix BD command syntax
3. Test thoroughly
4. Document new structure
# Cody Version Cleanup Plan

## Current Issues Analysis

### 1. Duplicate Version Structures
- **Problem**: Multiple directories contain v0.5.0 content with overlapping but inconsistent data
- **Locations**:
  - `.cody/project/build/v0.5.0/` (2 tasks, basic format)
  - `.cody/project/versions/v0.5.0/` (2 tasks, different statuses)
  - `.cody/project/build/v0.5.0-task-tracking-workflow-automation/` (24 tasks, detailed phases)

### 2. Inconsistent Task Statuses
- **Problem**: Same tasks show different completion statuses
- **Examples**:
  - `owk-v5o`: 🟡 in build/ vs 🟢 in versions/
  - `owk-zm2`: Different test coverage percentages (15.86% vs 34.02%)

### 3. Duplicate Backlog Files
- **Problem**: Two feature backlog files with different formats
- **Files**:
  - `build/feature-backlog.md`: Table format, 186 lines, task-oriented
  - `plan/feature-backlog.md`: Detailed breakdown, 387 lines, phase-oriented

### 4. Version Structure Inconsistency
- **Problem**: Some versions exist in both `build/` and `versions/` directories
- **Examples**: v0.5.0, v0.5.0-alpha, v0.5.0-beta

## Proposed Cleanup Strategy

### Phase 1: Consolidate Version Structure
1. **Keep**: `.cody/project/versions/` as the authoritative version directory
2. **Remove**: Duplicate version directories from `.cody/project/build/`
3. **Merge**: Content from `v0.5.0-task-tracking-workflow-automation/` into the main v0.5.0 version

### Phase 2: Standardize Tasklists
1. **Use**: The most detailed tasklist format (from `v0.5.0-task-tracking-workflow-automation/`)
2. **Update**: Statuses to reflect the most accurate current state
3. **Remove**: Duplicate tasklist files

### Phase 3: Merge Backlog Files
1. **Combine**: The structured table format with the detailed phase breakdown
2. **Standardize**: Task IDs and status indicators
3. **Remove**: Redundant backlog files

### Phase 4: Update References
1. **Review**: All Cody commands that reference version/backlog locations
2. **Update**: Paths to point to consolidated locations
3. **Test**: Ensure all workflows continue to function

## Implementation Steps

### Step 1: Backup Current State
```bash
cp -r .cody .cody-backup-$(date +%Y%m%d)
```

### Step 2: Consolidate Version Directories
- Move all version content to `.cody/project/versions/`
- Remove duplicate directories from `.cody/project/build/`

### Step 3: Create Unified Tasklist
- Use the detailed 24-task format from `v0.5.0-task-tracking-workflow-automation/`
- Update statuses based on most recent information
- Standardize task IDs and descriptions

### Step 4: Merge Backlog Files
- Create a new unified backlog combining both formats
- Maintain the detailed phase structure but use consistent table formatting
- Preserve all historical version information

### Step 5: Update Configuration
- Review `.cody/config/commands/*.md` files
- Update any hardcoded paths to reference consolidated locations
- Test all version-related commands

### Step 6: Validation
- Verify all tasklists are accessible
- Confirm backlog contains all historical data
- Test Cody version commands work correctly
- Ensure no broken references exist

## Expected Outcomes

1. **Single Source of Truth**: One authoritative location for all version data
2. **Consistent Status Tracking**: Unified task completion statuses
3. **Comprehensive Backlog**: Combined detailed and structured backlog information
4. **Improved Maintainability**: Clearer organization and fewer duplicate files
5. **Preserved History**: All historical version data maintained

## Risk Mitigation

1. **Backup**: Full backup before making changes
2. **Incremental**: Make changes in small, testable steps
3. **Validation**: Test each change before proceeding
4. **Rollback**: Easy rollback via backup if issues arise
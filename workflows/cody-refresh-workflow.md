---
workflow: cody-refresh
description: "Execute :cody refresh workflow to update project context"
agent: cody-admin
subtask: true
model: spectre
---

@cody-refresh Execute :cody refresh workflow

## WORKFLOW STEPS

### 1. Context Analysis
- Read project plan and configuration files
- Analyze current project state and structure
- Identify changes since last refresh

### 2. Document Updates
- Update PRD and plan documents with current information
- Remove outdated information and references
- Add new features, changes, and improvements

### 3. State Synchronization
- Refresh agent memory with current project context
- Update feature backlog with completed work
- Synchronize version status and release notes

### 4. Validation and Reporting
- Validate document consistency and accuracy
- Report changes made during refresh
- Provide updated project overview

## IMPLEMENTATION

The cody-admin subagent will execute the following steps:

1. **Project State Analysis**
   - Read and parse all project documentation files
   - Compare with previous state to identify changes
   - Generate change report

2. **Documentation Update**
   - Update plan.md with current project status
   - Update PRD.md with latest requirements and features
   - Update feature-backlog.md with completed work
   - Update version files with current status

3. **Context Synchronization**
   - Refresh agent memory with updated project context
   - Synchronize all subagents with current state
   - Update configuration files as needed

4. **Validation and Reporting**
   - Validate all documentation for consistency
   - Generate refresh report with changes made
   - Provide summary of project status

## ERROR HANDLING
- Graceful handling of missing or corrupted documents
- Recovery from incomplete refresh operations
- Validation of document integrity after updates
- Clear reporting of refresh status and issues

## INTEGRATION
- Works with all :cody workflow commands
- Maintains consistency across project documentation
- Preserves development context and history
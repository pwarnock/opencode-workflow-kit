---
command: refresh
description: "Execute :cody refresh workflow to update project context"
---

@cody-refresh Execute :cody refresh workflow

This command delegates to the **cody-admin** subagent to refresh project context and update documentation.

## WORKFLOW STEPS
1. **Context Analysis**
   - Read project plan and configuration files
   - Analyze current project state and structure
   - Identify changes since last refresh

2. **Document Updates**
   - Update PRD and plan documents with current information
   - Remove outdated information and references
   - Add new features, changes, and improvements

3. **State Synchronization**
   - Refresh agent memory with current project context
   - Update feature backlog with completed work
   - Synchronize version status and release notes

4. **Validation and Reporting**
   - Validate document consistency and accuracy
   - Report changes made during refresh
   - Provide updated project overview

## AGENT CONFIGURATION
The cody-admin subagent has:
- **Administrative access** to all project files
- **Document processing** for updates and validation
- **Context management** for state synchronization
- **Analysis tools** for change detection

## ERROR HANDLING
- Graceful handling of missing or corrupted documents
- Recovery from incomplete refresh operations
- Validation of document integrity after updates
- Clear reporting of refresh status and issues

## INTEGRATION
- Works with all :cody workflow commands
- Maintains consistency across project documentation
- Preserves development context and history
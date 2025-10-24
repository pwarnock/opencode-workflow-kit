---
command: "/refresh"
description: "Execute :cody refresh workflow using specialized subagent"
---

# REFRESH COMMAND

## EXECUTE CODY REFRESH WORKFLOW

This command delegates to the **cody-admin** subagent to execute the complete :cody refresh workflow.

### SUBAGENT DELEGATION
- Switch to **cody-admin** subagent
- Execute `:cody refresh` command
- Preserve context and return results

### WORKFLOW STEPS
1. **Initialize Refresh Context**
   - Load existing project state
   - Detect changes since last refresh
   - Identify refresh scope and priorities

2. **Execute :cody refresh**
   - Update project documentation
   - Refresh agent memory and context
   - Synchronize version and status information

3. **Context Preservation**
   - Save refresh artifacts
   - Update project state
   - Maintain context for subsequent commands

4. **Return Results**
   - Provide refresh summary
   - List updated files
   - Report validation status

### AGENT CONFIGURATION
The cody-admin subagent has:
- **Administrative access** to all project files
- **Document processing** for updates and validation
- **Context management** for state synchronization
- **Analysis tools** for change detection

### ERROR HANDLING
- Graceful handling of missing or corrupted documents
- Recovery from incomplete refresh operations
- Validation of document integrity after updates
- Clear reporting of refresh status and issues

### INTEGRATION
- Works with all :cody workflow commands
- Maintains consistency across project documentation
- Preserves development context and history
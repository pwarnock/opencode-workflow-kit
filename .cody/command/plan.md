---
command: "/plan"
description: "Execute :cody plan workflow using specialized subagent"
---

# PLAN COMMAND

## EXECUTE CODY PLAN WORKFLOW

This command delegates to the **cody-planner** subagent to execute the complete :cody plan workflow.

### SUBAGENT DELEGATION
- Switch to **cody-planner** subagent
- Execute `:cody plan` command
- Preserve context and return results

### WORKFLOW STEPS
1. **Initialize Planning Context**
   - Detect current project state
   - Load existing configuration
   - Identify planning scope

2. **Execute :cody plan**
   - Run discovery phase
   - Generate planning documents
   - Create project roadmap

3. **Context Preservation**
   - Save planning artifacts
   - Maintain state for subsequent commands
   - Update project configuration

4. **Return Results**
   - Provide planning summary
   - List generated documents
   - Suggest next steps

### AGENT CONFIGURATION
The cody-planner subagent has:
- **Read-only access** to project files
- **Webfetch** for external research
- **Grep/Glob** for code analysis
- **Bash** for :cody command execution

### ERROR HANDLING
- Graceful fallback if :cody not available
- Context preservation on failure
- Clear error messaging and recovery suggestions
---
command: "/version add"
description: "Execute :cody version add workflow using specialized subagent"
---

# VERSION ADD COMMAND

## EXECUTE CODY VERSION ADD WORKFLOW

This command delegates to the **cody-version-manager** subagent to execute the complete :cody version add workflow.

### SUBAGENT DELEGATION
- Switch to **cody-version-manager** subagent
- Execute `:cody version add` command
- Preserve context and return results

### WORKFLOW STEPS
1. **Initialize Version Context**
   - Load existing version backlog
   - Detect current project state
   - Identify version requirements

2. **Execute :cody version add**
   - Interactive version naming and definition
   - Feature requirements gathering
   - Scope and priority assessment

3. **Backlog Integration**
   - Add version to feature-backlog.md
   - Update version status and metadata
   - Maintain version dependencies

4. **Context Preservation**
   - Save version artifacts
   - Update project state
   - Maintain context for subsequent commands

5. **Return Results**
   - Provide version summary
   - List created/modified files
   - Suggest next steps

### AGENT CONFIGURATION
The cody-version-manager subagent has:
- **Version management tools** (read, write, edit)
- **Document processing** for backlog management
- **Context tracking** for version state
- **User interaction** for confirmation flows

### ERROR HANDLING
- Validation of version naming conventions
- Conflict resolution for duplicate versions
- Recovery from incomplete version creation
- Clear error reporting and recovery suggestions

### INTEGRATION
- Works with existing feature backlog structure
- Maintains compatibility with `/cody build` workflow
- Preserves project planning context
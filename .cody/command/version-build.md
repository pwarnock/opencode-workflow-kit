---
command: "/version build"
description: "Execute :cody version build workflow using specialized subagent"
---

# VERSION BUILD COMMAND

## EXECUTE CODY VERSION BUILD WORKFLOW

This command delegates to the **cody-version-manager** subagent to execute the complete :cody version build workflow.

### SUBAGENT DELEGATION
- Switch to **cody-version-manager** subagent
- Execute `:cody version build` command
- Preserve context and return results

### WORKFLOW STEPS
1. **Initialize Version Build Context**
   - Load existing version backlog
   - Detect available versions for building
   - Identify build scope and requirements

2. **Execute :cody version build**
   - Display available versions from feature-backlog.md
   - Filter by status (Not Started, In Progress)
   - Handle user version selection or command argument

3. **Version Preparation**
   - Create version folder with proper naming conventions
   - Copy design and tasklist templates
   - Initialize version-specific context

4. **Development Workflow**
   - Generate design document based on version requirements
   - Create task list with implementation steps
   - Guide iterative development process
   - Track progress and completion

5. **Context Preservation**
   - Save build artifacts
   - Update project state
   - Maintain context for subsequent commands

6. **Return Results**
   - Provide build summary
   - List created/modified files
   - Report completion status

### AGENT CONFIGURATION
The cody-version-manager subagent has:
- **Full development access** for version implementation
- **Template management** for document generation
- **Progress tracking** for development workflow
- **Integration tools** for backlog and release management

### ERROR HANDLING
- Version validation and conflict resolution
- Rollback capabilities for failed builds
- Context preservation across development sessions
- Clear error reporting with recovery suggestions

### INTEGRATION
- Seamless integration with `/cody plan` and `/cody build`
- Maintains project-wide context and state
- Supports iterative and parallel version development
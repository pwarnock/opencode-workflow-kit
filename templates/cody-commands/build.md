---
command: build
description: "Execute :cody build workflow using specialized subagent"
---

@cody-build Execute :cody build workflow

This command delegates to the **cody-builder** subagent to execute the complete :cody build workflow.

## WORKFLOW STEPS
1. **Initialize Build Context**
   - Load existing plan and configuration
   - Detect current project state
   - Identify build scope and dependencies

2. **Execute :cody build**
   - Run implementation phase
   - Generate code and documentation
   - Create build artifacts

3. **Development Operations**
   - Write and modify files as needed
   - Execute build commands
   - Run tests and validation

4. **Context Preservation**
   - Save build artifacts
   - Update project state
   - Maintain context for subsequent commands

5. **Return Results**
   - Provide build summary
   - List created/modified files
   - Report test results and validation

## AGENT CONFIGURATION
The cody-builder subagent has:
- **Full development access** (read, write, edit)
- **Bash** for build commands and testing
- **Grep/Glob** for code navigation
- **Webfetch** for documentation lookup

## ERROR HANDLING
- Rollback capabilities on build failure
- Context preservation across build attempts
- Detailed error reporting with fix suggestions

## INTEGRATION
- Works seamlessly with `/cody plan` command output
- Preserves planning context
- Supports iterative build processes
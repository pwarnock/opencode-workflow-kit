---
command: version-build
description: "Build specific version using :cody version management workflow"
---

@cody-version-build Execute :cody version build workflow

This command delegates to the **cody-version-manager** subagent to build specific versions from the feature backlog.

## WORKFLOW STEPS
1. **Version Selection**
   - Display available versions from feature-backlog.md
   - Filter by status (Not Started, In Progress)
   - Handle user version selection or command argument

2. **Version Preparation**
   - Create version folder with proper naming conventions
   - Copy design and tasklist templates
   - Initialize version-specific context

3. **Development Workflow**
   - Generate design document based on version requirements
   - Create task list with implementation steps
   - Guide iterative development process
   - Track progress and completion

4. **Completion Management**
   - Update feature backlog status
   - Generate retrospective documentation
   - Update release notes
   - Provide next steps guidance

## AGENT CONFIGURATION
The cody-version-manager subagent has:
- **Full development access** for version implementation
- **Template management** for document generation
- **Progress tracking** for development workflow
- **Integration tools** for backlog and release management

## ERROR HANDLING
- Version validation and conflict resolution
- Rollback capabilities for failed builds
- Context preservation across development sessions
- Clear error reporting with recovery suggestions

## INTEGRATION
- Seamless integration with `/cody plan` and `/cody build`
- Maintains project-wide context and state
- Supports iterative and parallel version development
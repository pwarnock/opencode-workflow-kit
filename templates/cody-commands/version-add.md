---
command: version-add
description: "Add new version using :cody version management workflow"
---

@cody-version-add Execute :cody version add workflow

This command delegates to the **cody-version-manager** subagent to add new versions to the feature backlog.

## WORKFLOW STEPS
1. **Version Discovery**
   - Interactive version naming and definition
   - Feature requirements gathering
   - Scope and priority assessment

2. **Backlog Integration**
   - Add version to feature-backlog.md
   - Update version status and metadata
   - Maintain version dependencies

3. **Context Management**
   - Preserve project state
   - Update version tracking
   - Maintain build context

4. **User Confirmation**
   - Present version details for approval
   - Confirm next steps (start build or continue planning)
   - Provide workflow guidance

## AGENT CONFIGURATION
The cody-version-manager subagent has:
- **Version management tools** (read, write, edit)
- **Document processing** for backlog management
- **Context tracking** for version state
- **User interaction** for confirmation flows

## ERROR HANDLING
- Validation of version naming conventions
- Conflict resolution for duplicate versions
- Recovery from incomplete version creation

## INTEGRATION
- Works with existing feature backlog structure
- Maintains compatibility with `/cody build` workflow
- Preserves project planning context
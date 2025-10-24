---
command: "/cody"
description: "Execute :cody workflows by routing to specialized subagents"
---

# CODY COMMAND

## EXECUTE CODY WORKFLOWS

This command routes to specialized subagents based on the specified workflow.

### AVAILABLE WORKFLOWS
- **plan**: Execute :cody planning workflow (routes to cody-planner)
- **build**: Execute :cody build workflow (routes to cody-builder)  
- **refresh**: Execute :cody refresh workflow (routes to cody-admin)
- **version-add**: Add new version (routes to cody-version-manager)
- **version-build**: Build version (routes to cody-version-manager)

### USAGE
```
/cody [workflow]
```

### EXAMPLES
```
/cody plan          # Execute planning workflow
/cody build         # Execute build workflow
/cody refresh       # Refresh project context
/cody version-add   # Add new version
/cody version-build # Build specific version
```

### SUBAGENT CONFIGURATION
Each workflow routes to a specialized subagent:
- **cody-planner**: Planning and discovery workflows
- **cody-builder**: Implementation and build workflows
- **cody-admin**: Administrative and refresh workflows
- **cody-version-manager**: Version management workflows

### ERROR HANDLING
- Invalid workflow detection and error reporting
- Graceful fallback when subagents unavailable
- Clear usage instructions for unknown commands

### INTEGRATION
- Seamless routing between different :cody workflows
- Context preservation across workflow switches
- Consistent error handling and user feedback
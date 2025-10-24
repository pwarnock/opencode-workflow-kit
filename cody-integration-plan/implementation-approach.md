# Command Implementation Approach

## Implementation Strategy

### Phase 1: Core Command Structure
1. **Analyze Existing :cody Commands**
   - Document all command parameters and workflows
   - Identify common patterns and structures
   - Map :cody commands to OpenCode command format

2. **Create Command Templates**
   - Convert each :cody command to OpenCode markdown format
   - Implement template variable support (`$ARGUMENTS`, `@file`, `!command`)
   - Add error handling and validation

3. **Basic Subagent Configuration**
   - Create initial subagent definitions
   - Configure basic tool permissions
   - Set up model selection

### Phase 2: Advanced Integration
1. **Context Detection System**
   - Implement :cody project detection
   - Create context management utilities
   - Build workflow phase tracking

2. **Enhanced Error Handling**
   - Add graceful degradation for missing :cody
   - Implement detailed error reporting
   - Create troubleshooting guides

3. **Template Integration**
   - Update existing opencode-config templates
   - Add :cody commands to environment templates
   - Create specialized :cody environment template

### Phase 3: Testing and Validation
1. **Command Testing**
   - Unit tests for each command
   - Integration tests with :cody workflows
   - Error condition testing

2. **Subagent Testing**
   - Permission validation
   - Tool access testing
   - Workflow coordination testing

3. **End-to-End Testing**
   - Complete workflow testing
   - Multi-agent coordination
   - Performance validation

## Command Implementation Details

### Command File Structure
Each command will be implemented as a markdown file:

```markdown
---
description: "Start :cody planning phase"
agent: cody-planner
subtask: true
model: anthropic/claude-3-5-sonnet-20241022
---

# :cody Planning Phase

You are executing the :cody planning workflow through OpenCode.

## Current Context
!`find . -name "discovery.md" -o -name "plan.md" -o -name "prd.md" | head -5`

## Planning Process
[Follow the original :cody plan.md workflow with OpenCode enhancements]

## Template Integration
Use templates from: {{cfTemplates}}/plan/
```

### Template Variable Mapping
- `{{cfPlanPhase}}` → `.cody/project/plan/`
- `{{cfWorkPhase}}` → `.cody/project/work/`
- `{{cfTemplates}}` → `.cody/config/templates/`
- `{{cProject}}` → Current project name

### Command Argument Handling
Commands will support arguments through `$ARGUMENTS`:
- `/plan MyProject` → Project name passed to planning workflow
- `/version add 1.0.0` → Version number passed to version creation
- `/build feature-name` → Feature name passed to build workflow

## Subagent Implementation Details

### Agent File Structure
Each subagent will be implemented as a markdown file:

```markdown
---
description: ":cody planning and analysis specialist"
mode: subagent
model: anthropic/claude-3-5-sonnet-20241022
temperature: 0.1
tools:
  read: true
  glob: true
  grep: true
  list: true
  webfetch: true
  write: false
  edit: false
  bash: false
permission:
  edit: deny
  bash: deny
---

You are a :cody planning specialist with the following capabilities:

## Core Responsibilities
- Project analysis and discovery
- Requirements gathering through questions
- Document creation and management
- Template-based planning

## Workflow Integration
- Detect existing :cody projects
- Maintain project context
- Coordinate with other :cody subagents
- Track planning progress

## Constraints
- Read-only access to prevent accidental changes
- Focus on analysis and documentation
- Use structured templates for consistency
```

### Tool Permission Configuration
Each subagent will have carefully configured permissions:

```yaml
tools:
  # Core tools
  read: true/false      # File reading capability
  write: true/false     # File writing capability
  edit: true/false      # File editing capability
  bash: true/false      # Command execution capability
  
  # Analysis tools
  glob: true/false      # File pattern matching
  grep: true/false      # Content searching
  list: true/false      # Directory listing
  
  # External tools
  webfetch: true/false  # Web content fetching

permission:
  edit: allow/ask/deny   # Edit permission level
  bash: allow/ask/deny   # Bash permission level
```

## Integration with Existing Project

### Template Updates
Existing templates will be enhanced with :cody integration:

1. **Minimal Template**
   - Add basic :cody commands
   - Include cody-planner subagent
   - Basic error handling

2. **Development Templates**
   - Full :cody command suite
   - All specialized subagents
   - Advanced context detection

3. **New :cody Template**
   - Specialized for :cody-heavy workflows
   - Optimized subagent configurations
   - Enhanced documentation

### Configuration Structure
Integration will follow existing patterns:

```
config/
├── global/
│   ├── agents/
│   │   ├── cody-planner.md
│   │   ├── cody-builder.md
│   │   └── ...
│   └── commands/
│       ├── plan.md
│       ├── build.md
│       └── ...
└── project/
    └── .opencode/
        ├── agents/
        │   └── [same as global]
        └── commands/
            └── [same as global]
```

### Schema Validation
New JSON Schema definitions will be added:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://opencode.ai/schemas/cody-agent-config.json",
  "title": "Cody Agent Configuration Schema",
  "type": "object",
  "properties": {
    "cody_workflow": {
      "type": "string",
      "enum": ["planning", "building", "version-management", "admin", "general"]
    },
    "cody_permissions": {
      "type": "object",
      "properties": {
        "project_access": {"type": "string"},
        "template_access": {"type": "string"},
        "workflow_coordination": {"type": "boolean"}
      }
    }
  }
}
```

## Error Handling Strategy

### Graceful Degradation
When :cody is not available:
- Detect missing :cody installation
- Provide helpful error messages
- Suggest installation steps
- Offer alternative workflows

### Command Validation
Before executing commands:
- Validate :cody project structure
- Check required permissions
- Verify template availability
- Confirm agent accessibility

### Recovery Mechanisms
When commands fail:
- Log detailed error information
- Provide recovery suggestions
- Offer rollback options
- Maintain system stability

## Performance Considerations

### Command Optimization
- Use efficient template loading
- Implement context caching
- Minimize agent switching overhead
- Optimize file system operations

### Resource Management
- Limit concurrent agent instances
- Manage memory usage for large projects
- Implement cleanup for failed operations
- Monitor system resource consumption

### Scalability
- Support for large codebases
- Efficient context management
- Optimized search operations
- Scalable agent coordination
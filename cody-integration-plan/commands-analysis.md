# OpenCode Commands Analysis

## Core :cody Commands to Implement

Based on the existing `.cody/config/commands/` directory structure, the following commands should be created as OpenCode commands:

### 1. `/plan` Command
**Source**: `.cody/config/commands/plan.md`
**Purpose**: Starts the PLAN phase and creates project planning documents
**Subagent**: `cody-planner` (read-only access)
**Key Features**:
- Interactive discovery process
- Document creation (discovery.md, prd.md, plan.md)
- Question-based requirements gathering
- Template-based document generation

### 2. `/build` Command
**Source**: `.cody/config/commands/build.md`
**Purpose**: Starts the BUILD phase and creates feature backlog
**Subagent**: `cody-builder` (full access)
**Key Features**:
- Feature backlog creation
- Version management integration
- Task breakdown and organization

### 3. `/version add` Command
**Source**: `.cody/config/commands/version-add.md`
**Purpose**: Adds new versions to the feature backlog
**Subagent**: `cody-version-manager` (version-specific tools)
**Key Features**:
- Interactive version creation
- Feature definition for versions
- Integration with feature backlog

### 4. `/version build` Command
**Source**: `.cody/config/commands/version-build.md`
**Purpose**: Builds specific versions
**Subagent**: `cody-builder` (full access)
**Key Features**:
- Version-specific task execution
- Progress tracking
- Integration with build workflows

### 5. `/refresh` Command
**Source**: `.cody/config/commands/refresh.md`
**Purpose**: Refreshes agent memory about current project
**Subagent**: `cody-planner` (read-only access)
**Key Features**:
- Project context review
- Document analysis
- Memory refresh workflow

### 6. `/relearn` Command
**Source**: `.cody/config/commands/relearn.md`
**Purpose**: Relearns the project from scratch
**Subagent**: `cody-planner` (read-only access)
**Key Features**:
- Complete project re-analysis
- Context rebuilding
- Knowledge refresh

### 7. `/upgrade` Command
**Source**: `.cody/config/commands/upgrade.md`
**Purpose**: Upgrades :cody framework
**Subagent**: `cody-admin` (system access)
**Key Features**:
- Framework upgrade process
- Compatibility checking
- Migration handling

### 8. `/assets-list` Command
**Source**: `.cody/config/commands/assets-list.md`
**Purpose**: Lists project assets
**Subagent**: `cody-planner` (read-only access)
**Key Features**:
- Asset inventory
- Project resource listing
- Documentation generation

### 9. `/help` Command
**Source**: `.cody/config/commands/help.md`
**Purpose**: Shows :cody help information
**Subagent**: `cody-general` (information access)
**Key Features**:
- Command documentation
- Usage examples
- Workflow guidance

### 10. `/refresh-update` Command
**Source**: `.cody/config/commands/refresh-update.md`
**Purpose**: Refreshes and updates project state
**Subagent**: `cody-admin` (system access)
**Key Features**:
- State synchronization
- Update processing
- Maintenance operations

## Command Structure Template

Each command will follow OpenCode's command structure:

```markdown
---
description: [Brief description of command]
agent: [subagent-name]
subtask: true
model: [appropriate-model]
---

[Command template with :cody-specific instructions and $ARGUMENTS support]
```

## Command Categories

### Planning Commands
- `/plan` - Project planning and discovery
- `/refresh` - Context refresh
- `/relearn` - Complete relearning
- `/assets-list` - Asset inventory

### Building Commands
- `/build` - Build phase initiation
- `/version build` - Version-specific building

### Management Commands
- `/version add` - Version creation
- `/upgrade` - Framework upgrades
- `/refresh-update` - State management

### Information Commands
- `/help` - Documentation and guidance

## Integration Points

### Template Variables
Commands will use OpenCode's template system:
- `$ARGUMENTS` - Command arguments
- `@filename` - File references
- `!command` - Shell command output

### Context Detection
Commands will automatically detect:
- Existing :cody projects
- Current workflow phase
- Available templates
- Project structure

### Error Handling
Commands will handle:
- Missing :cody installation
- Invalid project structure
- Command failures
- Permission issues
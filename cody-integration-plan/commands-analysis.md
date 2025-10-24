# :cody Commands Analysis

This document analyzes all existing :cody commands and their requirements for OpenCode integration.

## Core :cody Commands

### 1. `:cody plan`
**Purpose**: Creates a Cody project and starts the PLAN phase
**Key Requirements**:
- Interactive user dialogue to understand project requirements
- Knowledge Criteria validation (Target Users, Problem, Outcome, etc.)
- Document creation (discovery.md, prd.md, plan.md)
- Folder structure creation (/build, /library, /plan)
- Template copying from {{cfTemplates}}/plan/
- User approval workflows

**OpenCode Integration Needs**:
- Interactive conversation capabilities
- File system operations (create folders, copy templates)
- Document generation and editing
- Template management
- User input handling

### 2. `:cody build`
**Purpose**: Starts the BUILD phase and creates the feature backlog
**Key Requirements**:
- Check for existing feature-backlog.md
- Copy from {{cfTemplates}}/build/feature-backlog.md
- Review plan.md document
- Generate feature backlog based on plan
- User review and approval

**OpenCode Integration Needs**:
- File existence checking
- Template copying
- Document reading and analysis
- Content generation
- User review workflows

### 3. `:cody version add`
**Purpose**: Adds a new version to the feature-backlog.md file
**Key Requirements**:
- Interactive version naming
- Version discovery dialogue
- Feature backlog updates
- User confirmation for starting work

**OpenCode Integration Needs**:
- Interactive input handling
- File editing capabilities
- Document management
- User confirmation flows

### 4. `:cody version build`
**Purpose**: Creates a version using the feature-backlog.md file
**Key Requirements**:
- Version selection from backlog
- Version folder creation with naming conventions
- Design document generation (design.md)
- Task list creation (tasklist.md)
- Iterative development workflow
- Feature backlog updates
- Retrospective creation
- Release notes management

**OpenCode Integration Needs**:
- Document parsing and selection
- File system operations
- Template copying and generation
- Development workflow management
- Multi-step process handling
- Git integration hints

### 5. `:cody refresh`
**Purpose**: Refreshes the memory about the current project
**Key Requirements**:
- Document reading hierarchy (plan.md → prd.md → feature-backlog.md → version files)
- Project structure analysis
- Memory refresh confirmation

**OpenCode Integration Needs**:
- Document reading capabilities
- Context management
- Project state analysis

### 6. `:cody help`
**Purpose**: Provides help about Cody
**Key Requirements**:
- Framework overview display
- Version information from settings.json
- Command listing
- Asset storage guidance

**OpenCode Integration Needs**:
- Configuration file reading
- Help content display
- Command discovery

### 7. `:cody relearn`
**Purpose**: Forces AI agent to re-read Cody agent file
**Key Requirements**:
- Complete agent.md file reading
- Command file re-reading
- Memory commitment

**OpenCode Integration Needs**:
- Configuration file access
- Agent state management

### 8. `:cody upgrade`
**Purpose**: Upgrades the Cody framework from GitHub
**Key Requirements**:
- Update checking via scripts
- JSON parsing for script outputs
- Download and installation workflows
- Backup management
- Error handling and user guidance

**OpenCode Integration Needs**:
- Script execution capabilities
- JSON parsing
- Download management
- Error handling
- User interaction flows

## Template Variables Used

The commands use several template variables that need to be resolved:
- `{{cfPlanPhase}}` - Plan phase directory path
- `{{cfWorkPhase}}` - Work phase directory path  
- `{{cfTemplates}}` - Templates directory path
- `{{cProject}}` - Project directory path
- `{{cfAssets}}` - Assets directory path
- `{{cfConfig}}` - Configuration directory path
- `{{cfRoot}}` - Root directory path
- `{{cfScripts}}` - Scripts directory path

## Required Agent Capabilities

Based on command analysis, OpenCode agents need:

1. **File System Operations**: Create, read, write, copy files and folders
2. **Template Management**: Access and process template files
3. **Interactive Dialogue**: Handle user input and confirmation flows
4. **Document Generation**: Create and update structured documents
5. **Script Execution**: Run upgrade and maintenance scripts
6. **JSON Parsing**: Process script outputs and configuration files
7. **Context Management**: Maintain project state and memory
8. **Error Handling**: Graceful failure modes and user guidance

## Specialized Subagent Requirements

### Planning Agent
- **Tools**: Read, Write, List (file system), interactive dialogue
- **Permissions**: Read-only for existing files, write access for plan documents
- **Scope**: Project planning and documentation creation

### Building Agent  
- **Tools**: Full file system access, template management, document generation
- **Permissions**: Read/write access to build-related files
- **Scope**: Feature backlog creation and management

### Version Management Agent
- **Tools**: File system operations, template copying, development workflow
- **Permissions**: Version-specific file access, git integration hints
- **Scope**: Version creation, development, and completion workflows

### Maintenance Agent
- **Tools**: Script execution, JSON parsing, file system operations
- **Permissions**: System-level operations for upgrades and maintenance
- **Scope**: Framework upgrades, memory management, help system

## Integration Challenges

1. **Template Variable Resolution**: Need to map :cody template variables to OpenCode context
2. **Interactive Workflows**: OpenCode commands need to handle multi-step interactive processes
3. **File Structure Dependencies**: Commands assume specific :cody project structure
4. **Script Integration**: Upgrade commands depend on external shell scripts
5. **Context Management**: Maintaining project state across command invocations
6. **Error Handling**: Providing helpful error messages for various failure modes

---

## OpenCode Command Implementation Plan

Based on the analysis above, the following OpenCode commands should be created:

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
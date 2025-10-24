# Cody Integration for OpenCode Config

This document describes the complete integration of the :cody framework with OpenCode Config, providing specialized workflows and subagents for different development tasks.

## Overview

The Cody integration provides:

- **Specialized Commands**: `/cody`, `/plan`, `/build`, `/refresh`, `/version add`, `/version build`
- **Subagent System**: Specialized agents for different workflow types
- **Context Management**: Automatic detection and preservation of :cody project context
- **Template Integration**: Cody commands included in all project templates

## Available Commands

### `/cody` - Main Cody Command

Routes to specialized subagents based on the specified workflow.

**Usage:**
```
/cody [workflow]
```

**Available Workflows:**
- `plan` - Execute planning workflow (routes to cody-planner)
- `build` - Execute build workflow (routes to cody-builder)
- `refresh` - Refresh project context (routes to cody-admin)
- `version-add` - Add new version (routes to cody-version-manager)
- `version-build` - Build specific version (routes to cody-version-manager)

**Examples:**
```bash
/cody plan          # Execute planning workflow
/cody build         # Execute build workflow
/cody refresh       # Refresh project context
/cody version-add   # Add new version
/cody version-build # Build specific version
```

### `/plan` - Planning Workflow

Executes the complete :cody planning workflow using the cody-planner subagent.

**Features:**
- Discovery phase execution
- Planning document generation
- Project roadmap creation
- Context preservation

### `/build` - Build Workflow

Executes the complete :cody build workflow using the cody-builder subagent.

**Features:**
- Implementation phase execution
- Code and documentation generation
- Build artifact creation
- Test execution and validation

### `/refresh` - Refresh Workflow

Refreshes project context and updates documentation using the cody-admin subagent.

**Features:**
- Context analysis and synchronization
- Document updates with current information
- State synchronization
- Validation and reporting

### `/version add` - Version Addition

Adds new versions to the feature backlog using the cody-version-manager subagent.

**Features:**
- Interactive version naming and definition
- Feature requirements gathering
- Scope and priority assessment
- Backlog integration

### `/version build` - Version Building

Builds specific versions from the feature backlog using the cody-version-manager subagent.

**Features:**
- Version selection and preparation
- Design document generation
- Task list creation
- Progress tracking

## Subagent System

### cody-planner

**Purpose**: Planning and discovery workflows
**Capabilities**:
- Discovery analysis
- Requirement gathering
- Roadmap creation
- Documentation generation

**Tools**: Read-only access, webfetch, grep, glob, bash for :cody execution

### cody-builder

**Purpose**: Implementation and build workflows
**Capabilities**:
- Code generation
- Build automation
- Testing implementation
- Documentation creation

**Tools**: Full development access (read, write, edit, bash, etc.)

### cody-admin

**Purpose**: Administrative and refresh workflows
**Capabilities**:
- System refresh
- Configuration management
- State synchronization
- Maintenance operations

**Tools**: Administrative access to all project files

### cody-version-manager

**Purpose**: Version management workflows
**Capabilities**:
- Version creation
- Feature tracking
- Release management
- Version-specific testing

**Tools**: Version management tools, todo tracking, document processing

### cody-general

**Purpose**: General-purpose information and guidance
**Capabilities**:
- Information provision
- Workflow guidance
- Help documentation
- General assistance

## Configuration

### Agent Configurations

All cody subagents are configured in the `agents/` directory:

- `agents/cody-planner.json` - Planning subagent configuration
- `agents/cody-builder.json` - Build subagent configuration
- `agents/cody-admin.json` - Admin subagent configuration
- `agents/cody-version-manager.json` - Version management configuration
- `agents/cody-general.json` - General purpose configuration

### Command Definitions

Commands are defined in `.cody/command/` directory with markdown files containing:

- YAML frontmatter with command metadata
- Workflow documentation
- Subagent delegation instructions
- Error handling procedures

### Template Integration

All project templates include cody command support:

- `templates/minimal.json` - Basic cody integration
- `templates/web-development.json` - Web development cody integration
- `templates/python-development.json` - Python development cody integration

## Schema Validation

### Subagent Schema

Cody subagents use a specialized schema at `schemas/subagent-config.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Subagent Configuration Schema",
  "required": ["$schema", "description", "mode", "tools", "permissions", "environment", "behavior", "specialization"],
  "properties": {
    "mode": { "enum": ["subagent"] },
    "tools": { "object" },
    "permissions": { "object" },
    "environment": { "object" },
    "behavior": { "object" },
    "specialization": { "object" }
  }
}
```

## Usage Examples

### Basic Planning Workflow

```bash
# Start planning a new feature
/cody plan

# The cody-planner subagent will:
# 1. Analyze current project state
# 2. Run discovery phase
# 3. Generate planning documents
# 4. Create project roadmap
```

### Build Workflow

```bash
# Build the planned features
/cody build

# The cody-builder subagent will:
# 1. Load existing plan and configuration
# 2. Execute implementation phase
# 3. Generate code and documentation
# 4. Run tests and validation
```

### Version Management

```bash
# Add a new version to the backlog
/cody version-add

# Build a specific version
/cody version-build

# The cody-version-manager subagent will:
# 1. Manage version backlog
# 2. Handle version creation and building
# 3. Track progress and completion
```

### Project Refresh

```bash
# Refresh project context and documentation
/cody refresh

# The cody-admin subagent will:
# 1. Analyze current project state
# 2. Update documentation
# 3. Synchronize state
# 4. Validate consistency
```

## Error Handling

All cody commands include comprehensive error handling:

- **Graceful degradation** when :cody is unavailable
- **Context preservation** across command failures
- **Clear error messaging** with recovery suggestions
- **Rollback capabilities** for failed operations

## Integration Testing

The cody integration includes comprehensive testing:

- **Schema validation** for all configurations
- **Compatibility testing** across platforms
- **Command validation** for proper syntax
- **Subagent testing** for functionality

## Troubleshooting

### Common Issues

1. **Schema validation failures**
   - Check that all required fields are present
   - Verify schema references are correct
   - Run `uv run python scripts/config-validator.py agents/`

2. **Command not found**
   - Ensure commands are in `.cody/command/` directory
   - Check YAML frontmatter is properly formatted
   - Verify command names match file names

3. **Subagent configuration errors**
   - Check subagent schema compliance
   - Verify tool permissions are correctly set
   - Ensure environment variables are properly configured

### Validation Commands

```bash
# Validate all configurations
uv run python scripts/config-validator.py config/

# Validate agent configurations specifically
uv run python scripts/config-validator.py agents/

# Run compatibility tests
uv run python scripts/test-compatibility.py
```

## Contributing

When contributing to the cody integration:

1. **Follow the established patterns** for command and subagent configuration
2. **Update schemas** when adding new configuration options
3. **Add comprehensive tests** for new functionality
4. **Update documentation** with new features and examples
5. **Validate all changes** with the provided test scripts

## Future Enhancements

Planned improvements to the cody integration:

- **Additional workflow types** for specialized development scenarios
- **Enhanced context management** with better state persistence
- **Performance optimizations** for large project handling
- **Advanced error recovery** with automatic retry mechanisms
- **Integration with additional tools** and frameworks
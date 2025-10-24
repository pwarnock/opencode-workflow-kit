# Configuration Structure Design

This document explains the modular configuration structure and usage patterns for OpenCode Config.

## Overview

OpenCode Config uses a three-tier configuration system that supports both global and project-specific settings with intelligent inheritance and overriding capabilities.

## Directory Structure

```
opencode-config/
├── config/
│   ├── global/           # Global configurations (~/.opencode/)
│   │   ├── agents/       # Agent settings
│   │   │   └── default.json
│   │   ├── mcp/          # MCP server configurations
│   │   │   └── servers.json
│   │   └── permissions/  # Permission matrices
│   │       └── default.json
│   └── project/          # Project-level configurations (.opencode/)
│       └── .opencode/
│           ├── agents/
│           │   └── project.json
│           ├── mcp/
│           │   └── project-servers.json
│           ├── permissions/
│           │   └── project.json
│           └── config.json
├── schemas/              # JSON Schema validation files
├── scripts/              # Utility scripts
└── docs/                # Documentation
```

## Configuration Hierarchy

The configuration system follows a cascading inheritance model:

### 1. Project-level Configuration (`.opencode/`)
- **Location**: Project root directory
- **Priority**: Highest (overrides global and defaults)
- **Scope**: Project-specific settings
- **Use Case**: Customizing agent behavior for specific projects

### 2. Global Configuration (`~/.opencode/`)
- **Location**: User home directory
- **Priority**: Medium (overrides defaults)
- **Scope**: User-wide settings
- **Use Case**: Personal preferences and tool configurations

### 3. Default Configuration
- **Location**: Built into the system
- **Priority**: Lowest
- **Scope**: Fallback settings
- **Use Case**: Safe defaults for new installations

## Configuration Types

### Agent Configurations

Define agent behavior, tool access, and operational parameters.

**Key Settings:**
- `maxTokens`: Maximum response tokens
- `temperature`: Response randomness (0.0-1.0)
- `timeout`: Operation timeout in milliseconds
- `tools`: Enabled/disabled tool list
- `permissions`: File access permissions

**Example:**
```json
{
  "settings": {
    "maxTokens": 4000,
    "temperature": 0.7,
    "tools": {
      "enabled": ["read", "write", "edit", "bash"],
      "disabled": []
    }
  }
}
```

### MCP Server Configurations

Define Model Context Protocol servers for extended functionality.

**Key Settings:**
- `command`: Server executable
- `args`: Command arguments
- `platform`: Platform-specific configurations

**Example:**
```json
{
  "servers": {
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/path/to/directory"]
    }
  }
}
```

### Permission Matrices

Define access control rules for tools and file operations.

**Key Settings:**
- `rules`: List of permission rules
- `defaultAction`: Default action for unmatched rules

**Example:**
```json
{
  "rules": [
    {
      "name": "read-source-files",
      "tools": ["read"],
      "patterns": ["**/*.js", "**/*.py"],
      "action": "allow"
    }
  ],
  "defaultAction": "deny"
}
```

## Inheritance and Overriding

Configuration files can extend and override parent configurations using the `extends` field:

```json
{
  "extends": "../global/agents/default.json",
  "settings": {
    "maxTokens": 6000  // Overrides parent value
  }
}
```

### Merge Behavior

- **Objects**: Deep merged (child properties override parent)
- **Arrays**: Completely replaced (not merged)
- **Primitives**: Child value overrides parent

## Usage Patterns

### Pattern 1: Global Defaults
Use global configurations for personal preferences that apply across all projects.

### Pattern 2: Project Customization
Use project configurations for:
- Project-specific tool requirements
- Team collaboration settings
- Build and test command configurations

### Pattern 3: Environment-Specific Settings
Leverage platform-specific configurations for cross-platform compatibility:

```json
{
  "platform": {
    "windows": { "shell": "cmd" },
    "macos": { "shell": "zsh" },
    "linux": { "shell": "bash" }
  }
}
```

## Configuration Loading

The `config-loader.py` script handles configuration loading with the following process:

1. Load default configuration
2. Merge with global configuration
3. Merge with project configuration
4. Apply platform-specific overrides
5. Validate final configuration

### CLI Usage

```bash
# Load agent configuration
python scripts/config-loader.py --type agents --name default

# Validate configuration structure
python scripts/config-loader.py --validate

# Load with custom project root
python scripts/config-loader.py --type agents --project-root /path/to/project
```

## Best Practices

### 1. Minimal Overrides
Only override necessary settings to maintain compatibility with updates.

### 2. Clear Naming
Use descriptive names for configurations (e.g., "node-project", "python-research").

### 3. Documentation
Document custom configurations and their purpose.

### 4. Version Control
Commit project configurations but exclude sensitive data.

### 5. Validation
Always validate configurations before deployment.

## Migration Guide

### From Single Config to Modular

1. **Extract Global Settings**: Move user preferences to `~/.opencode/`
2. **Create Project Config**: Set up `.opencode/` for project-specific settings
3. **Update Scripts**: Use `config-loader.py` for loading configurations
4. **Test Thoroughly**: Verify behavior matches expectations

### Platform Migration

When moving between platforms:

1. **Update Paths**: Adjust file paths in configurations
2. **Check Commands**: Verify platform-specific commands work
3. **Test Permissions**: Ensure file permissions are appropriate
4. **Validate**: Run configuration validation

## Troubleshooting

### Common Issues

1. **Configuration Not Loading**: Check file paths and permissions
2. **Unexpected Overrides**: Verify inheritance chain and merge behavior
3. **Platform Issues**: Check platform-specific configurations
4. **Validation Failures**: Review JSON syntax and schema compliance

### Debug Tools

- Use `--validate` flag to check structure
- Check effective paths with `get_effective_config_paths()`
- Review merge order in configuration loader logs

## Security Considerations

### File Permissions

- Restrict write access to sensitive files
- Use principle of least privilege
- Regularly review permission matrices

### Configuration Exposure

- Avoid committing sensitive data
- Use environment variables for secrets
- Validate external configuration sources
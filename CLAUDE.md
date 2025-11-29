# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenCode Workflow Kit is a specialized agent suite and automation framework for AI-driven development workflows. It provides modular, cross-platform configurations for agents, MCP servers, and permissions with cascading configuration from project-specific to global defaults.

## Core Commands

### Environment Setup
```bash
# Install uv (fast Python package manager) if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv sync

# Activate virtual environment
source .venv/bin/activate  # Linux/macOS
# or .venv\Scripts\activate  # Windows

# Run automated setup (creates .venv, installs deps, sets up global config)
./setup.sh

# For project-specific setup
./setup.sh --project

# Test the installation
uv run python scripts/test-compatibility.py
```

### Development Commands
```bash
# Validate configuration files
uv run python scripts/config-validator.py config/
uv run python scripts/config-validator.py agents/

# Test compatibility across platforms
uv run python scripts/test-compatibility.py

# Run linting and formatting
uv run black opencode_config/
uv run ruff check opencode_config/
uv run mypy opencode_config/

# Use the CLI tool
uv run opencode-config validate config/
uv run opencode-config test
```

### Testing
```bash
# Run all tests (configured in pyproject.toml)
uv run pytest

# Run with coverage
uv run pytest --cov=opencode_config --cov-report=term-missing

# Run specific test scripts
uv run python scripts/test-compatibility.py
uv run python scripts/config-validator.py config/
```

## Architecture

### Configuration Hierarchy
The system uses a cascading configuration system:
1. **Project-level** (`.opencode/`) - Highest priority
2. **Global** (`~/.opencode/`) - Medium priority
3. **Defaults** - Built-in defaults - Lowest priority

### Key Directories

#### `/opencode_config/` - Core Python Package
- `cli.py` - Command-line interface with validation, testing, and version management
- `validator.py` - JSON Schema validation for configurations
- `compatibility.py` - Cross-platform compatibility testing
- `tools.py` - Utility functions for path operations and configuration management

#### `/config/` - Configuration Templates
- `global/` - Global configurations (~/.opencode/)
  - `agent/` - Agent settings (default.json, development.json, production.json)
  - `mcp/` - MCP server configurations
  - `permissions/` - Permission matrices
- `project/` - Project-level configurations (.opencode/)
  - `.opencode/` - Project configuration template

#### `/schemas/` - JSON Schema Definitions
- `agent-config.json` - Schema for agent configurations
- `subagent-config.json` - Schema for specialized subagent configurations
- `project-config.json` - Schema for project configurations
- `permissions.json` - Schema for permission matrices
- `mcp-servers.json` - Schema for MCP server configurations

#### `/agents/` - Specialized Subagent Configurations
Contains configurations for specialized agents with delegated responsibilities:
- `cody-planner.json` - Planning and discovery workflows
- `cody-builder.json` - Implementation and build workflows
- `cody-admin.json` - Administrative and refresh workflows
- `cody-version-manager.json` - Version management workflows
- `library-researcher.md` - Context7 library research agent
- `git-automation.md` - Git operations automation agent

#### `/templates/` - Environment Templates
Pre-built environment templates for quick project setup:
- `minimal.json` - Basic configuration
- `web-development.json` - React, Node.js, TypeScript projects
- `python-development.json` - Python, data science, web frameworks

#### `/scripts/` - Utility Scripts
- `config-validator.py` - Validate configurations against schemas
- `test-compatibility.py` - Cross-platform compatibility testing
- `environment-templates.py` - Manage environment templates
- `install-cody-integration.py` - Install :cody framework integration
- `path-utils.py` - Path normalization utilities

### Cody Integration

The project includes complete :cody framework integration with specialized subagents:

#### Available Commands (after integration installation)
- `/cody plan` - Execute planning workflow (routes to cody-planner)
- `/cody build` - Execute build workflow (routes to cody-builder)
- `/cody refresh` - Refresh project context (routes to cody-admin)
- `/cody version-add` - Add new version (routes to cody-version-manager)
- `/cody version-build` - Build specific version (routes to cody-version-manager)

#### Installing Cody Integration
```bash
# Install :cody integration
uv run python scripts/install-cody-integration.py

# Validate installation
uv run python scripts/validate-cody-integration.py
```

## Working with Configurations

### Agent Configuration Structure
Agent configurations follow the schema in `schemas/agent-config.json`:
- `agent` - Basic agent metadata (name, version, type, capabilities)
- `environment` - Platform-specific settings (shell, paths, variables)
- `behavior` - Agent behavior settings (auto_save, retry logic, limits)
- `tools` - Available tools and their permissions
- `permissions` - Granular permission matrices for different operations
- `delegation_rules` - Rules for delegating specific tasks to specialized subagents

### Subagent System
The architecture uses specialized subagents for different domains:
- **git-automation** - All git operations must be delegated here
- **library-researcher** - Context7 library research delegation target
- **cody-* agents** - Specialized Cody framework workflow agents

### Environment Templates
Use environment templates for quick project setup:
```bash
# List available templates
uv run python scripts/environment-templates.py list

# Apply a template
uv run python scripts/environment-templates.py apply web-development ./my-project
```

## Cross-Platform Considerations

### Path Handling
- Always use forward slashes `/` in configuration files
- Use `~` for home directory expansion
- The system handles platform-specific path normalization automatically

### Platform Overrides
Configurations include platform-specific overrides for:
- **Windows**: PowerShell shell, %APPDATA% paths, Windows-specific extensions
- **macOS**: Zsh shell, ~/Library/Application Support paths
- **Linux**: Bash shell, ~/.config paths, additional security restrictions

### Shell Detection
The system automatically detects and uses the appropriate shell:
- Default: bash
- Windows: PowerShell
- macOS fallback: zsh
- Universal fallback: sh

## Development Workflow

### Adding New Configurations
1. Create/edit configuration files in `config/` directories
2. Validate against schemas: `uv run python scripts/config-validator.py`
3. Test compatibility: `uv run python scripts/test-compatibility.py`
4. Update schemas if adding new configuration options

### Adding New Environment Templates
1. Create template configuration
2. Add to `templates/` directory
3. Update `environment-templates.py` if needed
4. Test template application

### Testing Changes
Always run the full test suite before committing:
```bash
uv run python scripts/test-compatibility.py
uv run python scripts/config-validator.py config/
uv run pytest
```

## Troubleshooting

### Common Issues
- **Configuration validation failures**: Check schema compliance with `config-validator.py`
- **Path resolution errors**: Use forward slashes and `~` for home directory
- **Permission denied on setup**: Run `chmod +x setup.sh`
- **uv command not found**: Install uv from https://astral.sh/uv/

### Debug Mode
Enable verbose output:
```bash
export OPENCODE_DEBUG=1
uv run python scripts/config-validator.py --verbose config/
uv run python scripts/test-compatibility.py --verbose
```

## Key Files to Understand

- `pyproject.toml` - Project metadata, dependencies, and tool configurations
- `opencode_config/cli.py` - Main CLI entry point and command handling
- `config/global/agent/default.json` - Default agent configuration with delegation rules
- `schemas/agent-config.json` - Schema for all agent configurations
- `docs/CODY_INTEGRATION.md` - Complete :cody integration documentation